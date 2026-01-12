# Backend Fix Prompt - Complete LIFF Booking System

## Context
I have a LIFF (LINE Front-end Framework) React app that needs to work with Supabase Edge Functions. The frontend is deployed and working, but the backend has several issues preventing it from functioning properly.

## Current Frontend Setup
- **URL**: `https://testdemo-beta.vercel.app`
- **Authentication**: LIFF (LINE Front-end Framework) - users log in via LINE
- **Token Format**: LINE ID Token (JWT) sent as `Authorization: Bearer <token>` header
- **Base URL**: `https://vvrrlzcbyigzdtonlugc.supabase.co/functions/v1`
- **Headers Sent**: 
  - `apikey: <anon-key>` (always required)
  - `Authorization: Bearer <line-id-token>` (for auth endpoints)
  - `Authorization: Bearer <anon-key>` (for public endpoints)
  - `x-line-id-token: <line-id-token>` (also sent as fallback)
  - `Content-Type: application/json`

## Critical Issues to Fix

### 1. **Invalid JWT Error (401)**
**Problem**: All authenticated Edge Functions return "Invalid JWT" error.

**Root Cause**: Edge Functions are not properly validating LINE ID tokens.

**Solution Required**:
- Extract token from `Authorization: Bearer <token>` header
- Validate JWT signature using LINE's public keys from `https://api.line.me/oauth2/v2.1/certs`
- Verify token expiration, issuer (`https://access.line.me`), and audience (your LIFF ID)
- Extract LINE user ID from token `sub` claim
- Use a library like `jose` or `jsonwebtoken` for validation

**Example Token Payload**:
```json
{
  "iss": "https://access.line.me",
  "sub": "Uc8c01fea861d0420a6c8b2895204417d",
  "aud": "<your-liff-id>",
  "exp": 1234567890,
  "iat": 1234567890,
  "name": "Freddy",
  "picture": "https://..."
}
```

### 2. **Supabase RLS Blocking Queries**
**Problem**: Frontend can't query `services` and `staff` tables directly from Supabase.

**Solution Required**:
Create RLS policies to allow anonymous reads:

**For `services` table**:
```sql
CREATE POLICY "Allow anon read services"
ON services
FOR SELECT
TO anon
USING (true);
```

**For `staff` table**:
```sql
CREATE POLICY "Allow anon read staff"
ON staff
FOR SELECT
TO anon
USING (true);
```

**OR** if you want tenant-specific (more secure):
```sql
-- For services
CREATE POLICY "Allow anon read tenant services"
ON services
FOR SELECT
TO anon
USING (
  tenant_id IN (
    SELECT id FROM tenants WHERE slug = current_setting('app.tenant_slug', true)::text
  )
);

-- For staff
CREATE POLICY "Allow anon read tenant staff"
ON staff
FOR SELECT
TO anon
USING (
  tenant_id IN (
    SELECT id FROM tenants WHERE slug = current_setting('app.tenant_slug', true)::text
  )
);
```

### 3. **CORS Configuration**
**Problem**: "Failed to fetch" errors due to missing CORS headers.

**Solution Required**: Add CORS headers to ALL Edge Functions:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // or specific: 'https://testdemo-beta.vercel.app'
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-id-token',
  'Access-Control-Max-Age': '3600',
}

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}

// In all responses
return new Response(
  JSON.stringify(data),
  { 
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  }
)
```

## Required Edge Functions

### 1. `tenant_bootstrap` (PUBLIC)
**Endpoint**: `POST /functions/v1/tenant_bootstrap`

**Request**:
```json
{
  "slug": "demo-salon",
  "name": "demo-salon"
}
```

**Response**:
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Demo Salon",
    "slug": "demo-salon",
    "status": "active",
    "plan": "starter",
    "timezone": "Asia/Bangkok",
    "currency": "THB"
  }
}
```

**Requirements**:
- Public endpoint (no auth required)
- Accept `apikey` and `Authorization: Bearer <anon-key>` headers
- Return tenant by slug
- Include all tenant fields

### 2. `ensure_profile_and_customer` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/ensure_profile_and_customer`

**Request Headers**:
- `apikey: <anon-key>` (required)
- `Authorization: Bearer <line-id-token>` (required - LINE token, NOT anon key)

**Request Body**:
```json
{
  "slug": "demo-salon"
}
```

**Response**:
```json
{
  "profile": {
    "id": "uuid",
    "line_user_id": "Uc8c01fea861d0420a6c8b2895204417d",
    "display_name": "Freddy",
    "picture_url": "https://..."
  },
  "customer": {
    "id": "uuid",
    "tenant_id": "uuid",
    "profile_id": "uuid"
  }
}
```

**Requirements**:
- **MUST validate LINE ID token** (see Issue #1 above)
- Extract LINE user ID from token `sub` claim
- Create/update profile in `profiles` table with `line_user_id`
- Create/update customer in `customers` table linked to tenant and profile
- Return both profile and customer

### 3. `availability_search` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/availability_search`

**Request**:
```json
{
  "slug": "demo-salon",
  "serviceId": "03330340-94e9-4252-9b62-51b21ccf0b8e",
  "dateFrom": "2026-01-13T14:56:00Z",
  "dateTo": "2026-01-19T14:56:00Z",
  "staffId": "optional-staff-id"
}
```

**Response**:
```json
{
  "slots": [
    {
      "startAt": "2026-01-13T10:00:00Z",
      "endAt": "2026-01-13T11:00:00Z",
      "staffId": "staff-uuid",
      "available": true
    }
  ]
}
```

**Requirements**:
- Validate LINE ID token
- Find available time slots for the service
- Filter by staff if provided
- Consider business hours, existing bookings, staff availability
- Return array of available slots

### 4. `create_hold` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/create_hold`

**Request**:
```json
{
  "slug": "demo-salon",
  "serviceId": "03330340-94e9-4252-9b62-51b21ccf0b8e",
  "staffId": "staff-uuid",
  "startAt": "2026-01-13T10:00:00Z"
}
```

**Response**:
```json
{
  "holdId": "hold-uuid",
  "expiresAt": "2026-01-13T10:05:00Z"
}
```

**Requirements**:
- Validate LINE ID token
- Create temporary hold on time slot (typically 5-10 minutes)
- Prevent double-booking during hold period
- Return hold ID and expiration time

### 5. `confirm_booking` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/confirm_booking`

**Request**:
```json
{
  "holdId": "hold-uuid",
  "notes": "Optional booking notes"
}
```

**Response**:
```json
{
  "bookingId": "booking-uuid",
  "paymentId": "payment-uuid",
  "status": "confirmed"
}
```

**Requirements**:
- Validate LINE ID token
- Verify hold is still valid (not expired)
- Create booking record
- Initialize payment record
- Return booking and payment IDs

### 6. `payment_init` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/payment_init`

**Request**:
```json
{
  "bookingId": "booking-uuid",
  "slug": "demo-salon"
}
```

**Response**:
```json
{
  "payment_url": "https://payment-gateway.com/checkout/...",
  "paymentId": "payment-uuid"
}
```

**Requirements**:
- Validate LINE ID token
- Initialize payment for booking
- Return payment URL for redirect

## Implementation Checklist

For EACH Edge Function, ensure:

- [ ] CORS headers are set correctly (see Issue #3)
- [ ] OPTIONS requests are handled for preflight
- [ ] `apikey` header is checked (but not necessarily validated for public endpoints)
- [ ] For auth endpoints: LINE ID token is extracted from `Authorization: Bearer <token>`
- [ ] For auth endpoints: Token is validated against LINE's public keys
- [ ] LINE user ID is extracted from token `sub` claim
- [ ] Database queries use the validated user ID
- [ ] Error responses follow standard format: `{ error: "message", code: 401 }`
- [ ] Request body is parsed as JSON
- [ ] Response is returned as JSON with proper headers

## LINE Token Validation Implementation

Here's a complete example of how to validate LINE tokens:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.1.0/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-id-token',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Validate LINE ID token
    const lineUserId = await validateLineToken(token)
    if (!lineUserId) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT', code: 401 }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    
    // Your business logic here using lineUserId
    
    // Return response
    return new Response(
      JSON.stringify({ data: 'success', lineUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, code: 500 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function validateLineToken(token: string): Promise<string | null> {
  try {
    // Fetch LINE's public keys
    const jwksResponse = await fetch('https://api.line.me/oauth2/v2.1/certs')
    const jwks = await jwksResponse.json()
    
    // Get your LIFF ID from environment
    const liffId = Deno.env.get('LIFF_ID') || ''
    
    // Verify and decode token
    const { payload } = await jose.jwtVerify(token, async (protectedHeader) => {
      const key = jwks.keys.find((k: any) => k.kid === protectedHeader.kid)
      if (!key) throw new Error('Key not found')
      return await jose.importJWK(key)
    }, {
      issuer: 'https://access.line.me',
      audience: liffId,
    })
    
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
- `LIFF_ID` - Your LINE LIFF app ID (for token validation)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (if needed for admin operations)

## Testing

After fixes, test with:
1. Frontend at `https://testdemo-beta.vercel.app`
2. Tenant slug: `demo-salon`
3. Services should load automatically (if RLS is fixed)
4. All Edge Functions should work with LINE authentication

## Priority Order

1. **IMMEDIATE**: Fix CORS - add headers to all functions
2. **IMMEDIATE**: Fix LINE token validation - implement proper JWT verification
3. **HIGH**: Fix RLS policies - allow anon reads for services/staff
4. **HIGH**: Test all 6 Edge Functions end-to-end
5. **MEDIUM**: Add request logging for debugging

## Expected Behavior After Fixes

1. ✅ Frontend loads tenant "demo-salon" automatically
2. ✅ Services dropdown populates with 4 services (Haircut, Haircut + Wash, Hair Color, Hair Treatment)
3. ✅ Staff dropdown populates (if staff exist)
4. ✅ Availability search works and returns slots
5. ✅ Create hold works
6. ✅ Confirm booking works
7. ✅ Payment init works

Fix all these issues and the booking system will work end-to-end!
