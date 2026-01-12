# Fix Supabase RLS to Allow Service/Staff Queries

## Problem
The app can't load services and staff because Supabase Row Level Security (RLS) is blocking anonymous queries.

## Solution

Go to your Supabase Dashboard → Table Editor → Select `services` table → Click "RLS policies"

### For `services` table:
Create a new policy:
- **Policy Name**: `Allow anon read services`
- **Allowed Operation**: `SELECT`
- **Target Roles**: `anon`
- **Policy Definition**: 
  ```sql
  true
  ```
  OR if you want tenant-specific:
  ```sql
  tenant_id IN (SELECT id FROM tenants WHERE slug = current_setting('app.tenant_slug', true)::text)
  ```

### For `staff` table:
Create a new policy:
- **Policy Name**: `Allow anon read staff`
- **Allowed Operation**: `SELECT`
- **Target Roles**: `anon`
- **Policy Definition**: 
  ```sql
  true
  ```
  OR tenant-specific:
  ```sql
  tenant_id IN (SELECT id FROM tenants WHERE slug = current_setting('app.tenant_slug', true)::text)
  ```

## Quick Fix (For Testing Only)

If you just want to test quickly, you can temporarily disable RLS:

1. Go to Table Editor → `services` table
2. Click the "RLS policies" button
3. Toggle OFF "Enable RLS" (not recommended for production)

**⚠️ WARNING**: Only do this for testing! Re-enable RLS for production.

## Alternative: Use Service Role Key (Not Recommended)

You could use the service role key instead of anon key, but this bypasses all security. Not recommended.

## After Fixing RLS

1. Refresh your app
2. Services should load automatically
3. You'll see a dropdown with all services
4. No more manual ID entry needed!
