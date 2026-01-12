-- Quick RLS Fix for Testing
-- Run this in Supabase SQL Editor
-- If policies already exist, you'll get errors - that's OK, they're already created

-- First, drop existing policies if they exist (optional - comment out if you want to keep existing ones)
-- DROP POLICY IF EXISTS "Allow anon read tenants" ON tenants;
-- DROP POLICY IF EXISTS "Allow anon read services" ON services;
-- DROP POLICY IF EXISTS "Allow anon read staff" ON staff;

-- Tenants (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tenants' 
    AND policyname = 'Allow anon read tenants'
  ) THEN
    CREATE POLICY "Allow anon read tenants"
    ON public.tenants
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

-- Services (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'services' 
    AND policyname = 'Allow anon read services'
  ) THEN
    CREATE POLICY "Allow anon read services"
    ON public.services
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

-- Staff (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'staff' 
    AND policyname = 'Allow anon read staff'
  ) THEN
    CREATE POLICY "Allow anon read staff"
    ON public.staff
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

-- Profiles (read/write)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow anon read profiles'
  ) THEN
    CREATE POLICY "Allow anon read profiles"
    ON public.profiles
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow anon insert profiles'
  ) THEN
    CREATE POLICY "Allow anon insert profiles"
    ON public.profiles
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow anon update profiles'
  ) THEN
    CREATE POLICY "Allow anon update profiles"
    ON public.profiles
    FOR UPDATE
    TO anon
    USING (true);
  END IF;
END $$;

-- Customers (read/write)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Allow anon read customers'
  ) THEN
    CREATE POLICY "Allow anon read customers"
    ON public.customers
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Allow anon insert customers'
  ) THEN
    CREATE POLICY "Allow anon insert customers"
    ON public.customers
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Allow anon update customers'
  ) THEN
    CREATE POLICY "Allow anon update customers"
    ON public.customers
    FOR UPDATE
    TO anon
    USING (true);
  END IF;
END $$;

-- Bookings (read/write)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Allow anon read bookings'
  ) THEN
    CREATE POLICY "Allow anon read bookings"
    ON public.bookings
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Allow anon insert bookings'
  ) THEN
    CREATE POLICY "Allow anon insert bookings"
    ON public.bookings
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

-- Holds (read/write/delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'holds' 
    AND policyname = 'Allow anon read holds'
  ) THEN
    CREATE POLICY "Allow anon read holds"
    ON public.holds
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'holds' 
    AND policyname = 'Allow anon insert holds'
  ) THEN
    CREATE POLICY "Allow anon insert holds"
    ON public.holds
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'holds' 
    AND policyname = 'Allow anon update holds'
  ) THEN
    CREATE POLICY "Allow anon update holds"
    ON public.holds
    FOR UPDATE
    TO anon
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'holds' 
    AND policyname = 'Allow anon delete holds'
  ) THEN
    CREATE POLICY "Allow anon delete holds"
    ON public.holds
    FOR DELETE
    TO anon
    USING (true);
  END IF;
END $$;

-- Payments (read/write)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Allow anon read payments'
  ) THEN
    CREATE POLICY "Allow anon read payments"
    ON public.payments
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Allow anon insert payments'
  ) THEN
    CREATE POLICY "Allow anon insert payments"
    ON public.payments
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Allow anon update payments'
  ) THEN
    CREATE POLICY "Allow anon update payments"
    ON public.payments
    FOR UPDATE
    TO anon
    USING (true);
  END IF;
END $$;

-- Staff working hours (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_working_hours') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'staff_working_hours' 
      AND policyname = 'Allow anon read staff_working_hours'
    ) THEN
      CREATE POLICY "Allow anon read staff_working_hours"
      ON public.staff_working_hours
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;
END $$;

-- Staff time off (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_time_off') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'staff_time_off' 
      AND policyname = 'Allow anon read staff_time_off'
    ) THEN
      CREATE POLICY "Allow anon read staff_time_off"
      ON public.staff_time_off
      FOR SELECT
      TO anon
      USING (true);
    END IF;
  END IF;
END $$;

-- Success message
SELECT 'RLS policies created successfully!' as status;
