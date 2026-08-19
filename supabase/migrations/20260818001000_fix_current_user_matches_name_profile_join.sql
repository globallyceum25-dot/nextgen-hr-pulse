-- Fix the profiles branch of current_user_matches_name().
--
-- The original definition (migration 20260722040313) matched the profile with:
--     SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
--
-- but public.profiles (migration 20260316091237) is:
--     id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
--
-- profiles.id is an independent random uuid, NOT the auth user id, so that
-- branch could never be true and the profile-based name match was dead code.
-- The correct column is profiles.user_id.
--
-- This matters more since 20260722130000, which made this helper load-bearing
-- for WRITES: it is now part of the UPDATE policies on tasks and sub_tasks. A
-- user whose name matched only via their profile row (not via auth metadata and
-- not via a matching employees record) was silently denied edit access to tasks
-- assigned to them by name.
--
-- Only the profiles predicate changes; the auth.users and employees branches,
-- the signature, volatility, security context and grants are all preserved.
-- CREATE OR REPLACE keeps the existing REVOKE/GRANT from 20260722040313.

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
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (
          lower(btrim(coalesce(u.raw_user_meta_data->>'full_name',''))) = lower(btrim(_name))
          OR lower(split_part(coalesce(u.raw_user_meta_data->>'full_name',''),' ',1)) = lower(split_part(btrim(_name),' ',1))
          OR lower(coalesce(u.email,'')) = lower(btrim(_name))
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(btrim(coalesce(p.full_name,''))) = lower(btrim(_name))
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e, auth.users u
      WHERE u.id = auth.uid()
        AND lower(coalesce(e.email,'')) = lower(coalesce(u.email,''))
        AND (
          lower(btrim(coalesce(e.employee_name,'') || ' ' || coalesce(e.last_name,''))) = lower(btrim(_name))
          OR lower(coalesce(e.employee_name,'')) = lower(split_part(btrim(_name),' ',1))
        )
    )
  END;
$$;
