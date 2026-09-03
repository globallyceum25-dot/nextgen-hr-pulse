-- SECURITY FIX: close unauthenticated access to public.designations.
--
-- PROBLEM
-- 20260901030000_designation_master.sql created four policies with `TO public`.
-- In Postgres `public` includes Supabase's `anon` role, and the anon key is
-- (by design) shipped in the browser bundle. The result was that ANYONE on the
-- internet could SELECT, INSERT, UPDATE and DELETE designations with no login.
--
-- The header of that migration claimed "the same access rules as departments",
-- but departments' own `TO public` policies had already been removed in
-- 20260331113647; the pattern that was copied was the pre-hardening version.
--
-- FIX
-- Match the CURRENT departments model: authenticated users may read the list
-- (the Employee form needs it); only admins may modify it.
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Public can view designations"   ON public.designations;
DROP POLICY IF EXISTS "Public can insert designations" ON public.designations;
DROP POLICY IF EXISTS "Public can update designations" ON public.designations;
DROP POLICY IF EXISTS "Public can delete designations" ON public.designations;

DROP POLICY IF EXISTS "Authenticated can view designations" ON public.designations;
CREATE POLICY "Authenticated can view designations"
ON public.designations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert designations" ON public.designations;
CREATE POLICY "Admins can insert designations"
ON public.designations FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can update designations" ON public.designations;
CREATE POLICY "Admins can update designations"
ON public.designations FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can delete designations" ON public.designations;
CREATE POLICY "Admins can delete designations"
ON public.designations FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
);

-- Also close the unrevoked SECURITY DEFINER helper flagged in the same audit.
REVOKE EXECUTE ON FUNCTION public.is_task_assigner(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_task_assigner(uuid, uuid) TO authenticated;
