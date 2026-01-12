# Supabase RLS Security Guide for LIFF Booking App

## Current Problem
Your tables have RLS enabled but no policies, so everything is blocked. We need to set up secure policies that allow the app to work while preventing unauthorized access.

## Two Approaches

### Approach 1: Service Role Key in Edge Functions (RECOMMENDED - Most Secure)

**Best Practice**: Edge Functions should use the **service role key** (bypasses RLS) instead of anon key. This is more secure because:
- Edge Functions validate LINE tokens before accessing data
- RLS policies can focus on direct Supabase client access
- More control over what data is exposed

**How to implement**: Update your Edge Functions to use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY` for database queries.

### Approach 2: Proper RLS Policies (Current Setup)

If you want to keep using anon key, you need proper RLS policies. Here's how:

## Required RLS Policies

### 1. `tenants` Table
**Policy**: Allow anonymous users to read tenants (needed for tenant lookup)

```sql
CREATE POLICY "Allow anon read tenants"
ON tenants
FOR SELECT
TO anon
USING (true);
```

**Security**: ✅ Safe - tenant info is public anyway

### 2. `services` Table
**Policy**: Allow anonymous users to read services for active tenants

```sql
CREATE POLICY "Allow anon read tenant services"
ON services
FOR SELECT
TO anon
USING (
  tenant_id IN (
    SELECT id FROM tenants WHERE status = 'active'
  )
);
```

**Security**: ✅ Safe - service listings are public for booking

### 3. `staff` Table
**Policy**: Allow anonymous users to read staff for active tenants

```sql
CREATE POLICY "Allow anon read tenant staff"
ON staff
FOR SELECT
TO anon
USING (
  tenant_id IN (
    SELECT id FROM tenants WHERE status = 'active'
  )
);
```

**Security**: ✅ Safe - staff listings are public for booking

### 4. `profiles` Table
**Policy**: Users can only read/update their own profile (by LINE user ID)

**Note**: Since we're using LINE auth (not Supabase auth), we need a different approach. The Edge Function should handle this, but for direct queries:

```sql
-- Allow reading profiles (Edge Functions will filter by LINE user ID)
CREATE POLICY "Allow anon read profiles"
ON profiles
FOR SELECT
TO anon
USING (true);

-- Allow updating own profile (Edge Functions validate LINE token)
CREATE POLICY "Allow anon update own profile"
ON profiles
FOR UPDATE
TO anon
USING (true);
```

**Security**: ⚠️ Edge Functions must validate LINE token and filter by `line_user_id`

### 5. `customers` Table
**Policy**: Similar to profiles - Edge Functions handle validation

```sql
CREATE POLICY "Allow anon read customers"
ON customers
FOR SELECT
TO anon
USING (true);
```

**Security**: ⚠️ Edge Functions must validate LINE token

### 6. `bookings` Table
**Policy**: Users can only see their own bookings

```sql
-- For reading: Users can only see bookings linked to their profile
CREATE POLICY "Allow anon read own bookings"
ON bookings
FOR SELECT
TO anon
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE profile_id IN (
      SELECT id FROM profiles WHERE line_user_id = current_setting('app.line_user_id', true)::text
    )
  )
);
```

**Security**: ✅ Secure - users only see their own bookings

**Note**: This requires Edge Functions to set `app.line_user_id` before querying, OR Edge Functions should use service role key.

### 7. `holds` Table
**Policy**: Similar to bookings

```sql
CREATE POLICY "Allow anon read own holds"
ON holds
FOR SELECT
TO anon
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE profile_id IN (
      SELECT id FROM profiles WHERE line_user_id = current_setting('app.line_user_id', true)::text
    )
  )
);
```

### 8. `payments` Table
**Policy**: Users can only see their own payments

```sql
CREATE POLICY "Allow anon read own payments"
ON payments
FOR SELECT
TO anon
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE customer_id IN (
      SELECT id FROM customers 
      WHERE profile_id IN (
        SELECT id FROM profiles WHERE line_user_id = current_setting('app.line_user_id', true)::text
      )
    )
  )
);
```

## Recommended Approach: Service Role Key

**Instead of complex RLS policies, use service role key in Edge Functions:**

1. **Edge Functions use service role key** (bypasses RLS)
2. **Edge Functions validate LINE tokens** before any database access
3. **Simple RLS policies** for direct Supabase client access (if needed)

### How to Update Edge Functions

In your Edge Functions, use:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Use SERVICE ROLE KEY (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // NOT anon key!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Now you can query without RLS blocking
const { data } = await supabaseAdmin
  .from('services')
  .select('*')
  .eq('tenant_id', tenantId)
```

**Security**: ✅ Very secure because:
- Edge Functions validate LINE tokens first
- Only authenticated requests reach the database
- RLS is bypassed but access is controlled by your Edge Function logic

## Quick Fix for Now (Testing)

If you just want to test quickly, create these simple policies:

```sql
-- For testing only - allows anonymous reads on all tables
CREATE POLICY "Allow anon read tenants" ON tenants FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read services" ON services FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read staff" ON staff FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read profiles" ON profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read customers" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read bookings" ON bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read holds" ON holds FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read payments" ON payments FOR SELECT TO anon USING (true);

-- For writing (Edge Functions will validate)
CREATE POLICY "Allow anon insert profiles" ON profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update profiles" ON profiles FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon insert customers" ON customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert bookings" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert holds" ON holds FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert payments" ON payments FOR INSERT TO anon WITH CHECK (true);
```

**⚠️ WARNING**: These are permissive policies for testing. For production, use service role key in Edge Functions.

## Production Security Best Practices

1. **Edge Functions use service role key** ✅
2. **Edge Functions validate LINE tokens** ✅
3. **Edge Functions filter by LINE user ID** ✅
4. **RLS policies for direct client access** (if any)
5. **Rate limiting** on Edge Functions
6. **Input validation** in Edge Functions
7. **Audit logging** for sensitive operations

## Summary

**For your current setup (using anon key):**
- Create RLS policies for all tables you query
- Policies can be simple (`USING (true)`) because Edge Functions validate auth
- Edge Functions are your security layer

**For production (recommended):**
- Switch Edge Functions to service role key
- Keep RLS policies simple or minimal
- Security is handled by Edge Function token validation
