-- SECURITY FIX: stop a user-controlled string from acting as an identity claim.
--
-- Two related privilege-escalation paths, both through
-- public.current_user_matches_name(), which is load-bearing in the UPDATE
-- policies on tasks and sub_tasks and in the sub_tasks INSERT policy.
--
-- PROBLEM 1 — first-name-only matching
--   The function matched on split_part(full_name,' ',1), i.e. the FIRST NAME
--   alone. Any two employees sharing a first name ("John Silva" / "John Perera")
--   could edit each other's tasks. The employees branch had the same flaw,
--   comparing employee_name against only the first token of the assignee name.
--
-- PROBLEM 2 — self-editable identity
--   The profiles branch trusts profiles.full_name, but the policy
--   "Users can update their own profile" lets a user set that column to
--   anything. Renaming yourself to a colleague granted you UPDATE on every task
--   assigned to them, and additionally caused the SECURITY DEFINER trigger
--   link_tasks_to_new_profile() to reassign their unlinked tasks to your id.
--
-- FIX
--   (a) exact whole-name matching only, via norm_person_name() so that
--       case and stray whitespace are still tolerated;
--   (b) profiles.full_name and profiles.email become HR/admin-managed —
--       a user may still change their avatar, but not their identity.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1) Exact-match-only identity resolution
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_matches_name(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _name IS NULL OR btrim(_name) = '' OR auth.uid() IS NULL THEN false
    ELSE EXISTS (
      -- Auth metadata: exact full name, or the login email itself.
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (
          public.norm_person_name(u.raw_user_meta_data->>'full_name')
            = public.norm_person_name(_name)
          OR lower(coalesce(u.email, '')) = lower(btrim(_name))
        )
    )
    OR EXISTS (
      -- Profile directory. Safe to trust now that full_name is admin-managed
      -- by the trigger below.
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND public.norm_person_name(p.full_name) = public.norm_person_name(_name)
    )
    OR EXISTS (
      -- Employee Master, matched to the login by email: exact "First Last".
      SELECT 1 FROM public.employees e, auth.users u
      WHERE u.id = auth.uid()
        AND e.email IS NOT NULL
        AND lower(e.email) = lower(coalesce(u.email, ''))
        AND public.norm_person_name(e.employee_name || ' ' || coalesce(e.last_name, ''))
              = public.norm_person_name(_name)
    )
  END;
$$;

-- ============================================================
-- 2) Identity columns on profiles are not self-editable
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    -- auth.uid() is NULL for migrations, backfills and the employee->profile
    -- sync trigger running server-side; those are allowed through.
    IF auth.uid() IS NOT NULL
       AND NOT (
         public.has_role(auth.uid(), 'super_admin'::public.app_role)
         OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
       ) THEN
      RAISE EXCEPTION
        'Your name and email are managed by HR and cannot be changed here'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_identity ON public.profiles;
CREATE TRIGGER trg_profiles_protect_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();
