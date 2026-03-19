
-- Drop the existing ALL policies that may not handle INSERT correctly
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

-- Companies: explicit policies for INSERT, UPDATE, DELETE
CREATE POLICY "Admins can insert companies" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role));

CREATE POLICY "Admins can update companies" ON public.companies
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role));

CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role));

-- Locations: explicit policies for INSERT, UPDATE, DELETE
CREATE POLICY "Admins can insert locations" ON public.locations
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role));

CREATE POLICY "Admins can update locations" ON public.locations
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role));

CREATE POLICY "Admins can delete locations" ON public.locations
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'sector_hr_admin'::app_role));
