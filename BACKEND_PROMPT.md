# Backend Prompt: Fix Supabase Edge Functions for LIFF Booking App

## Context
I have a LIFF (LINE Front-end Framework) React app that calls Supabase Edge Functions. The frontend sends LIFF ID tokens as Bearer tokens, but I'm getting "Invalid JWT" and "failed to fetch" errors. Please fix my Edge Functions to properly handle LIFF authentication and CORS.

## Frontend Setup
- **Framework**: Vite + React
- **Authentication**: LIFF (LINE Front-end Framework) - users log in via LINE
- **Token Format**: LINE ID Token (JWT) sent as `Authorization: Bearer <token>` header
- **Base URL**: `https://<my-supabase-project>.supabase.co/functions/v1`
- **CORS**: Requests come from `https://testdemo-beta.vercel.app` (and `http://localhost:5173` for dev)

## Current Issues
1. **"Invalid JWT" errors** - Backend receives token but can't validate it
2. **"failed to fetch" errors** - Likely CORS or network issues
3. **401 Unauthorized** - Token validation failing

## Required Edge Functions

### 1. `tenant_bootstrap` (PUBLIC - optional auth)
**Endpoint**: `POST /functions/v1/tenant_bootstrap`

**Request Body**:
```json
{
  "slug": "demo-salon",
  "liffId": "optional-liff-id"
}
```

**Requirements**:
- Should work WITHOUT authentication (public endpoint)
- But should ACCEPT token if provided (for logging/analytics)
- Returns tenant information

**Expected Response**:
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Demo Salon",
    "slug": "demo-salon",
    "status": "active"
  }
}
```

### 2. `ensure_profile_and_customer` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/ensure_profile_and_customer`

**Request Headers**:
- `Authorization: Bearer <line-id-token>` (REQUIRED)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "slug": "demo-salon",
  "liffId": "optional-liff-id",
  "displayName": "optional",
  "phone": "optional",
  "pictureUrl": "optional"
}
```

**Requirements**:
- MUST validate LINE ID token
- Extract LINE user ID from token
- Create/update user profile in database
- Create/update customer record linked to tenant
- Return profile and customer info

**Expected Response**:
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

### 3. `availability_search` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/availability_search`

**Request Headers**:
- `Authorization: Bearer <line-id-token>` (REQUIRED)

**Request Body**:
```json
{
  "slug": "demo-salon",
  "serviceId": "service-uuid",
  "staffId": "staff-uuid (optional)",
  "dateFrom": "2024-01-15T10:00:00Z",
  "dateTo": "2024-01-20T18:00:00Z",
  "liffId": "optional-liff-id"
}
```

**Requirements**:
- Validate LINE ID token
- Find available time slots for the service
- Filter by staff if provided
- Return available slots

**Expected Response**:
```json
{
  "slots": [
    {
      "startAt": "2024-01-15T10:00:00Z",
      "endAt": "2024-01-15T11:00:00Z",
      "staffId": "staff-uuid",
      "available": true
    }
  ]
}
```

### 4. `create_hold` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/create_hold`

**Request Body**:
```json
{
  "slug": "demo-salon",
  "serviceId": "service-uuid",
  "staffId": "staff-uuid",
  "startAt": "2024-01-15T10:00:00Z",
  "liffId": "optional-liff-id"
}
```

**Requirements**:
- Validate LINE ID token
- Create a temporary hold on the time slot
- Return hold ID with expiration time

**Expected Response**:
```json
{
  "holdId": "hold-uuid",
  "expiresAt": "2024-01-15T10:05:00Z"
}
```

### 5. `confirm_booking` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/confirm_booking`

**Request Body**:
```json
{
  "holdId": "hold-uuid",
  "notes": "optional booking notes"
}
```

**Requirements**:
- Validate LINE ID token
- Verify hold is still valid
- Create booking record
- Return booking and payment info

**Expected Response**:
```json
{
  "bookingId": "booking-uuid",
  "paymentId": "payment-uuid",
  "status": "confirmed"
}
```

### 6. `payment_init` (AUTH REQUIRED)
**Endpoint**: `POST /functions/v1/payment_init`

**Request Body**:
```json
{
  "bookingId": "booking-uuid",
  "slug": "demo-salon",
  "liffId": "optional-liff-id"
}
```

**Requirements**:
- Validate LINE ID token
- Initialize payment for booking
- Return payment URL

**Expected Response**:
```json
{
  "payment_url": "https://payment-gateway.com/checkout/...",
  "paymentId": "payment-uuid"
}
```

## Critical Requirements

### 1. CORS Configuration
**MUST** allow requests from:
- `https://testdemo-beta.vercel.app`
- `http://localhost:5173` (for development)
- `https://liff.line.me` (LINE LIFF domain)

**Response Headers**:
```javascript
{
  'Access-Control-Allow-Origin': '*', // or specific origins
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-line-id-token',
  'Access-Control-Max-Age': '3600'
}
```

### 2. LINE ID Token Validation
**CRITICAL**: You MUST validate the LINE ID token properly:

1. **Extract token from headers**:
   - Check `Authorization: Bearer <token>` header
   - Also check `x-line-id-token` header as fallback

2. **Validate token**:
   - Verify JWT signature using LINE's public keys
   - Check token expiration
   - Verify issuer is LINE
   - Extract `sub` (LINE user ID) from token payload

3. **Token Validation Library**:
   - Use `@line/liff` or `jose` library to verify JWT
   - Fetch LINE's public keys from: `https://api.line.me/oauth2/v2.1/certs`
   - Or use LINE's token verification endpoint

**Example token payload structure**:
```json
{
  "iss": "https://access.line.me",
  "sub": "Uc8c01fea861d0420a6c8b2895204417d",
  "aud": "<your-liff-id>",
  "exp": 1234567890,
  "iat": 1234567890,
  "nonce": "...",
  "name": "Freddy",
  "picture": "https://..."
}
```

### 3. Error Handling
**Standardize error responses**:
```json
{
  "error": "Error message here",
  "code": 401,
  "message": "Invalid JWT" // or other descriptive message
}
```

**HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (tenant/service not found)
- `500` - Server Error

### 4. Database Schema Assumptions
- `tenants` table with `slug` column
- `profiles` table with `line_user_id` column
- `customers` table linked to `profiles` and `tenants`
- `services`, `staff`, `bookings`, `holds`, `payments` tables

## Implementation Checklist

For EACH Edge Function, ensure:

- [ ] CORS headers are set correctly
- [ ] OPTIONS requests are handled for preflight
- [ ] LINE ID token is extracted from `Authorization` header
- [ ] Token is validated against LINE's public keys
- [ ] LINE user ID is extracted from token `sub` claim
- [ ] Database queries use the validated user ID
- [ ] Error responses follow standard format
- [ ] Request body is parsed as JSON
- [ ] Response is returned as JSON with proper headers

## Example Edge Function Structure

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
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
      JSON.stringify({ data: 'success' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function validateLineToken(token: string): Promise<string | null> {
  // Implement LINE token validation
  // Return LINE user ID (sub claim) or null if invalid
  // Use jose library or LINE's verification endpoint
}
```

## Priority Fixes

1. **IMMEDIATE**: Fix CORS - add proper headers to all functions
2. **IMMEDIATE**: Implement proper LINE token validation
3. **HIGH**: Standardize error response format
4. **HIGH**: Ensure all auth-required functions validate tokens
5. **MEDIUM**: Add request logging for debugging

## Testing

After fixes, test with:
- Frontend app at `https://testdemo-beta.vercel.app`
- LIFF login working
- Token being sent in `Authorization: Bearer <token>` header
- All 6 Edge Functions responding correctly

Please fix all Edge Functions according to these requirements and ensure they work with the LIFF frontend.
