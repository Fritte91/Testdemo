-- SIMPLE RLS Fix - Run each statement one by one if the full script fails
-- Copy and paste each CREATE POLICY statement individually into Supabase SQL Editor

-- 1. Tenants
CREATE POLICY "Allow anon read tenants" ON public.tenants FOR SELECT TO anon USING (true);

-- 2. Services  
CREATE POLICY "Allow anon read services" ON public.services FOR SELECT TO anon USING (true);

-- 3. Staff
CREATE POLICY "Allow anon read staff" ON public.staff FOR SELECT TO anon USING (true);

-- 4. Profiles (read)
CREATE POLICY "Allow anon read profiles" ON public.profiles FOR SELECT TO anon USING (true);

-- 5. Profiles (insert)
CREATE POLICY "Allow anon insert profiles" ON public.profiles FOR INSERT TO anon WITH CHECK (true);

-- 6. Profiles (update)
CREATE POLICY "Allow anon update profiles" ON public.profiles FOR UPDATE TO anon USING (true);

-- 7. Customers (read)
CREATE POLICY "Allow anon read customers" ON public.customers FOR SELECT TO anon USING (true);

-- 8. Customers (insert)
CREATE POLICY "Allow anon insert customers" ON public.customers FOR INSERT TO anon WITH CHECK (true);

-- 9. Customers (update)
CREATE POLICY "Allow anon update customers" ON public.customers FOR UPDATE TO anon USING (true);

-- 10. Bookings (read)
CREATE POLICY "Allow anon read bookings" ON public.bookings FOR SELECT TO anon USING (true);

-- 11. Bookings (insert)
CREATE POLICY "Allow anon insert bookings" ON public.bookings FOR INSERT TO anon WITH CHECK (true);

-- 12. Holds (read)
CREATE POLICY "Allow anon read holds" ON public.holds FOR SELECT TO anon USING (true);

-- 13. Holds (insert)
CREATE POLICY "Allow anon insert holds" ON public.holds FOR INSERT TO anon WITH CHECK (true);

-- 14. Holds (update)
CREATE POLICY "Allow anon update holds" ON public.holds FOR UPDATE TO anon USING (true);

-- 15. Holds (delete)
CREATE POLICY "Allow anon delete holds" ON public.holds FOR DELETE TO anon USING (true);

-- 16. Payments (read)
CREATE POLICY "Allow anon read payments" ON public.payments FOR SELECT TO anon USING (true);

-- 17. Payments (insert)
CREATE POLICY "Allow anon insert payments" ON public.payments FOR INSERT TO anon WITH CHECK (true);

-- 18. Payments (update)
CREATE POLICY "Allow anon update payments" ON public.payments FOR UPDATE TO anon USING (true);

-- 19. Staff working hours (if table exists)
CREATE POLICY "Allow anon read staff_working_hours" ON public.staff_working_hours FOR SELECT TO anon USING (true);

-- 20. Staff time off (if table exists)
CREATE POLICY "Allow anon read staff_time_off" ON public.staff_time_off FOR SELECT TO anon USING (true);
