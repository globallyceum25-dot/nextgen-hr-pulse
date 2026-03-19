-- Permanent fix for Employee module access when app is used without sign-in
-- Align Companies, Locations, and Employees with consistent CRUD policies.

-- ===== COMPANIES =====
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;

CREATE POLICY "Public can view companies"
ON public.companies
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert companies"
ON public.companies
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update companies"
ON public.companies
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete companies"
ON public.companies
FOR DELETE
TO public
USING (true);

-- ===== LOCATIONS =====
DROP POLICY IF EXISTS "Admins can delete locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

CREATE POLICY "Public can view locations"
ON public.locations
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert locations"
ON public.locations
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update locations"
ON public.locations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete locations"
ON public.locations
FOR DELETE
TO public
USING (true);

-- ===== EMPLOYEES =====
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

CREATE POLICY "Public can view employees"
ON public.employees
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert employees"
ON public.employees
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update employees"
ON public.employees
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete employees"
ON public.employees
FOR DELETE
TO public
USING (true);