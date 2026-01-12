# Backend Fix: LINE Token Validation

## Critical Issue
All authenticated Edge Functions (`ensure_profile_and_customer`, `availability_search`, `create_hold`, `confirm_booking`, `payment_init`) are returning "Invalid JWT" error.

The frontend is correctly sending:
- `apikey: <anon-key>` ✅
- `Authorization: Bearer <line-id-token>` ✅ (LINE ID token, not anon key)
- `x-line-id-token: <line-id-token>` ✅

But the backend is rejecting the token.

## Root Cause
The Edge Functions are NOT properly validating LINE ID tokens. They need to:
1. Extract token from `Authorization: Bearer <token>` header
2. Validate JWT signature using LINE's public keys
3. Verify token expiration, issuer, and audience
4. Extract LINE user ID from token

## Required Fix for ALL Authenticated Edge Functions

Update these functions:
- `ensure_profile_and_customer`
- `availability_search`
- `create_hold`
- `confirm_booking`
- `payment_init`

## Implementation: LINE Token Validation

Add this token validation function to each Edge Function:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.1.0/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-id-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    
    // Validate LINE ID token
    const lineUserId = await validateLineToken(token)
    if (!lineUserId) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Edge Function] Validated LINE user:', lineUserId)

    // Create Supabase client (use service role key for admin access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body = await req.json()
    
    // Your business logic here using lineUserId
    // Example: Find or create profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('line_user_id', lineUserId)
      .single()

    // Return response
    return new Response(
      JSON.stringify({ data: { profile, lineUserId } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message, code: 500 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Validate LINE ID token and return LINE user ID
 */
async function validateLineToken(token: string): Promise<string | null> {
  try {
    // Get your LIFF ID from environment
    const liffId = Deno.env.get('LIFF_ID') || Deno.env.get('VITE_LIFF_ID')
    if (!liffId) {
      console.error('LIFF_ID not set in environment')
      return null
    }

    // Fetch LINE's public keys (JWKS)
    const jwksUrl = 'https://api.line.me/oauth2/v2.1/certs'
    const jwksResponse = await fetch(jwksUrl)
    if (!jwksResponse.ok) {
      console.error('Failed to fetch LINE JWKS')
      return null
    }
    const jwks = await jwksResponse.json()

    // Verify and decode token
    const { payload } = await jose.jwtVerify(
      token,
      async (protectedHeader) => {
        // Find the key that matches the token's kid
        const key = jwks.keys.find((k: any) => k.kid === protectedHeader.kid)
        if (!key) {
          throw new Error('Key not found in JWKS')
        }
        // Import the key
        return await jose.importJWK(key, 'ES256')
      },
      {
        issuer: 'https://access.line.me',
        audience: liffId,
      }
    )

    // Verify expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.error('Token expired')
      return null
    }

    // Return LINE user ID (sub claim)
    return payload.sub as string
  } catch (error) {
    console.error('Token validation error:', error)
    return null
  }
}
```

## Environment Variables Needed

Make sure these are set in Supabase Edge Functions:
- `LIFF_ID` or `VITE_LIFF_ID` - Your LINE LIFF app ID (for token validation)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin database access)

## Alternative: Simpler Validation (If jose library doesn't work)

If the `jose` library causes issues, you can use LINE's token verification endpoint:

```typescript
async function validateLineToken(token: string): Promise<string | null> {
  try {
    const channelId = Deno.env.get('LINE_CHANNEL_ID')
    if (!channelId) {
      console.error('LINE_CHANNEL_ID not set')
      return null
    }

    // Verify token with LINE's API
    const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        id_token: token,
        client_id: channelId,
      }),
    })

    if (!verifyResponse.ok) {
      console.error('LINE token verification failed:', await verifyResponse.text())
      return null
    }

    const data = await verifyResponse.json()
    return data.sub // LINE user ID
  } catch (error) {
    console.error('Token validation error:', error)
    return null
  }
}
```

## Testing

After fixing, test with:
1. Frontend sends token in `Authorization: Bearer <line-token>` header
2. Edge Function validates token
3. Edge Function extracts LINE user ID
4. Edge Function uses LINE user ID for database operations
5. Returns success response

## Common Issues

1. **"Key not found"**: JWKS fetch failed or kid mismatch - check network
2. **"Token expired"**: LINE tokens expire - frontend should refresh
3. **"Invalid audience"**: LIFF_ID doesn't match token's `aud` claim
4. **"Invalid issuer"**: Token not from LINE

Fix the token validation in all 5 authenticated Edge Functions and the "Invalid JWT" errors will be resolved!
