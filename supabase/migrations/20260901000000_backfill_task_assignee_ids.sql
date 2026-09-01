-- Link existing tasks/sub-tasks to a real auth user so "My Tasks" works for everyone.
--
-- PROBLEM
-- The task UI only ever wrote tasks.assignee_name (a display string); assignee_id was
-- left NULL, and the joined assignee_profile with it. "My Tasks" then had only the name
-- to match on, and the name it compared against was derived from public.employees --
-- unreadable without employees:view. Non-admins saw 0 tasks.
--
-- FIX (data side; the client fix is separate)
-- Backfill assignee_id from public.profiles, the universally-readable name directory
-- established by 20260819010000_user_name_directory.sql. A name that maps to more than
-- one auth user is SKIPPED, not guessed; those rows keep working through the
-- client-side name fallback.
--
-- NOTE: migration 20260722040313 shipped an earlier backfill that matched on FIRST NAME
-- ONLY against auth metadata. Rows it may have mis-assigned are not corrected here --
-- see the audit query at the bottom of this file.
--
-- Idempotent: only rows where assignee_id IS NULL are touched.

-- ============================================================
-- 0) Name normaliser: case-insensitive, whitespace-collapsed
-- ============================================================
CREATE OR REPLACE FUNCTION public.norm_person_name(_name text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(btrim(regexp_replace(coalesce(_name, ''), '\s+', ' ', 'g')));
$$;

-- ============================================================
-- 1) tasks.assignee_id
-- ============================================================
WITH candidates AS (
  -- a) assignee_name holds a profile display name
  SELECT public.norm_person_name(p.full_name) AS name_key, p.user_id
  FROM public.profiles p
  WHERE btrim(coalesce(p.full_name, '')) <> ''
    AND p.full_name NOT LIKE '%@%'          -- handle_new_user() seeds full_name with the email
  UNION
  -- b) assignee_name holds an email address
  SELECT public.norm_person_name(p.email), p.user_id
  FROM public.profiles p
  WHERE p.email IS NOT NULL
  UNION
  -- c) assignee_name holds an Employee Master name -> employee email -> profile
  SELECT public.norm_person_name(e.employee_name || ' ' || coalesce(e.last_name, '')), p.user_id
  FROM public.employees e
  JOIN public.profiles p ON lower(p.email) = lower(e.email)
  WHERE e.email IS NOT NULL
    AND btrim(coalesce(e.employee_name, '')) <> ''
),
resolved AS (
  SELECT name_key, min(user_id::text)::uuid AS user_id
  FROM candidates
  WHERE name_key <> ''
  GROUP BY name_key
  HAVING count(DISTINCT user_id) = 1        -- ambiguous name -> skip
)
UPDATE public.tasks t
SET assignee_id = r.user_id
FROM resolved r
WHERE t.assignee_id IS NULL
  AND public.norm_person_name(t.assignee_name) = r.name_key;

-- ============================================================
-- 2) sub_tasks.assignee_id  (same resolution set)
-- ============================================================
WITH candidates AS (
  SELECT public.norm_person_name(p.full_name) AS name_key, p.user_id
  FROM public.profiles p
  WHERE btrim(coalesce(p.full_name, '')) <> '' AND p.full_name NOT LIKE '%@%'
  UNION
  SELECT public.norm_person_name(p.email), p.user_id
  FROM public.profiles p WHERE p.email IS NOT NULL
  UNION
  SELECT public.norm_person_name(e.employee_name || ' ' || coalesce(e.last_name, '')), p.user_id
  FROM public.employees e
  JOIN public.profiles p ON lower(p.email) = lower(e.email)
  WHERE e.email IS NOT NULL AND btrim(coalesce(e.employee_name, '')) <> ''
),
resolved AS (
  SELECT name_key, min(user_id::text)::uuid AS user_id
  FROM candidates
  WHERE name_key <> ''
  GROUP BY name_key
  HAVING count(DISTINCT user_id) = 1
)
UPDATE public.sub_tasks s
SET assignee_id = r.user_id
FROM resolved r
WHERE s.assignee_id IS NULL
  AND public.norm_person_name(s.assignee_name) = r.name_key;

-- tasks(assignee_id) is already indexed (idx_tasks_assignee, 20260327051507).
CREATE INDEX IF NOT EXISTS idx_sub_tasks_assignee ON public.sub_tasks(assignee_id);

-- ============================================================
-- Verification (run separately)
-- ============================================================
-- SELECT count(*) FILTER (WHERE assignee_id IS NULL AND assignee_name IS NOT NULL) AS unlinked,
--        count(*) FILTER (WHERE assignee_id IS NOT NULL) AS linked
-- FROM public.tasks;
--
-- Audit rows the older first-name backfill may have mis-assigned:
-- SELECT t.id, t.title, t.assignee_name, p.full_name, p.email
-- FROM public.tasks t JOIN public.profiles p ON p.user_id = t.assignee_id
-- WHERE public.norm_person_name(t.assignee_name) <> public.norm_person_name(p.full_name)
--   AND public.norm_person_name(t.assignee_name) <> public.norm_person_name(p.email);
