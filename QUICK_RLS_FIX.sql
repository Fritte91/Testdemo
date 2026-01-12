-- Quick RLS Fix for Testing
-- Run this in Supabase SQL Editor to allow the app to work

-- Tenants (public read)
CREATE POLICY IF NOT EXISTS "Allow anon read tenants"
ON tenants
FOR SELECT
TO anon
USING (true);

-- Services (public read for active tenants)
CREATE POLICY IF NOT EXISTS "Allow anon read services"
ON services
FOR SELECT
TO anon
USING (true);

-- Staff (public read for active tenants)
CREATE POLICY IF NOT EXISTS "Allow anon read staff"
ON staff
FOR SELECT
TO anon
USING (true);

-- Profiles (read/write - Edge Functions validate LINE token)
CREATE POLICY IF NOT EXISTS "Allow anon read profiles"
ON profiles
FOR SELECT
TO anon
USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon insert profiles"
ON profiles
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon update profiles"
ON profiles
FOR UPDATE
TO anon
USING (true);

-- Customers (read/write - Edge Functions validate LINE token)
CREATE POLICY IF NOT EXISTS "Allow anon read customers"
ON customers
FOR SELECT
TO anon
USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon insert customers"
ON customers
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon update customers"
ON customers
FOR UPDATE
TO anon
USING (true);

-- Bookings (read/write - Edge Functions validate LINE token)
CREATE POLICY IF NOT EXISTS "Allow anon read bookings"
ON bookings
FOR SELECT
TO anon
USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon insert bookings"
ON bookings
FOR INSERT
TO anon
WITH CHECK (true);

-- Holds (read/write - Edge Functions validate LINE token)
CREATE POLICY IF NOT EXISTS "Allow anon read holds"
ON holds
FOR SELECT
TO anon
USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon insert holds"
ON holds
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon update holds"
ON holds
FOR UPDATE
TO anon
USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon delete holds"
ON holds
FOR DELETE
TO anon
USING (true);

-- Payments (read/write - Edge Functions validate LINE token)
CREATE POLICY IF NOT EXISTS "Allow anon read payments"
ON payments
FOR SELECT
TO anon
USING (true);

CREATE POLICY IF NOT EXISTS "Allow anon insert payments"
ON payments
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon update payments"
ON payments
FOR UPDATE
TO anon
USING (true);

-- Staff working hours (if used for availability)
CREATE POLICY IF NOT EXISTS "Allow anon read staff_working_hours"
ON staff_working_hours
FOR SELECT
TO anon
USING (true);

-- Staff time off (if used for availability)
CREATE POLICY IF NOT EXISTS "Allow anon read staff_time_off"
ON staff_time_off
FOR SELECT
TO anon
USING (true);

-- Note: These policies are permissive for testing.
-- For production, switch Edge Functions to use SERVICE_ROLE_KEY instead.
