-- Make person names resolvable by EVERY authenticated user.
--
-- PROBLEM
-- "Assigned By" rendered as "Unmapped User" for non-admins because the name could not
-- be read by them at all:
--   * public.profiles  -> policy allowed only "your own profile", so the assigner's
--                         profile row came back NULL for the assignee.
--   * public.employees -> requires the employees:view permission.
-- Admins could read both, so the name displayed correctly for them only. This is a
-- data-visibility issue; no frontend change can fix it.
--
-- FIX
-- profiles is a name directory (full_name, email, avatar) for people who already work
-- together on tasks — the assignee can already see the assignee_name on the task. Allow
-- authenticated users to read it, and keep full_name populated from the Employee Master
-- so the displayed value is a real "First Last" rather than an email.
--
-- Sensitive employee data (salary, designation, department, status, etc.) stays in
-- public.employees and remains protected by the employees:view permission. Only the
-- display name and email become readable.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1) Authenticated users can read the name directory
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 2) Backfill profiles.full_name from the Employee Master (matched by email)
--    Only fills rows that are empty or currently show an email address.
-- ============================================================
UPDATE public.profiles p
SET full_name = btrim(e.employee_name || ' ' || COALESCE(e.last_name, '')),
    updated_at = now()
FROM public.employees e
WHERE lower(e.email) = lower(p.email)
  AND e.email IS NOT NULL
  AND (
    p.full_name IS NULL
    OR btrim(p.full_name) = ''
    OR p.full_name LIKE '%@%'
  )
  AND btrim(COALESCE(e.employee_name, '')) <> '';

-- Fall back to the auth metadata full_name where no employee record matched.
UPDATE public.profiles p
SET full_name = btrim(u.raw_user_meta_data->>'full_name'),
    updated_at = now()
FROM auth.users u
WHERE u.id = p.user_id
  AND (p.full_name IS NULL OR btrim(p.full_name) = '' OR p.full_name LIKE '%@%')
  AND btrim(COALESCE(u.raw_user_meta_data->>'full_name', '')) <> ''
  AND (u.raw_user_meta_data->>'full_name') NOT LIKE '%@%';

-- ============================================================
-- 3) Keep the directory in sync when Employee Master changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_profile_name_from_employee()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR btrim(COALESCE(NEW.employee_name, '')) = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles p
  SET full_name = btrim(NEW.employee_name || ' ' || COALESCE(NEW.last_name, '')),
      updated_at = now()
  WHERE lower(p.email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_sync_profile_name ON public.employees;
CREATE TRIGGER trg_employees_sync_profile_name
  AFTER INSERT OR UPDATE OF employee_name, last_name, email ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_name_from_employee();
