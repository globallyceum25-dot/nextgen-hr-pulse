
-- Helper: check if the current authenticated user's name (from auth metadata / profile / employee record)
-- matches a given assignee_name string (first name, last name, or full name, case-insensitive).
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
      WHERE p.id = auth.uid()
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

REVOKE ALL ON FUNCTION public.current_user_matches_name(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_matches_name(text) TO authenticated;

-- Update tasks SELECT policy to also allow when assignee_name matches the current user
DROP POLICY IF EXISTS "Task stakeholders can view tasks" ON public.tasks;
CREATE POLICY "Task stakeholders can view tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'sector_hr_admin'::app_role)
  OR assignee_id = auth.uid()
  OR assigned_by = auth.uid()
  OR created_by = auth.uid()
  OR updated_by = auth.uid()
  OR escalation_person_id = auth.uid()
  OR public.current_user_matches_name(assignee_name)
);

-- Same treatment for sub_tasks so sub-task assignments by name are visible
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.sub_tasks'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY %I ON public.sub_tasks', p.polname);
  END LOOP;
END $$;

CREATE POLICY "Sub-task stakeholders can view sub_tasks"
ON public.sub_tasks FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'sector_hr_admin'::app_role)
  OR assignee_id = auth.uid()
  OR created_by = auth.uid()
  OR updated_by = auth.uid()
  OR public.current_user_matches_name(assignee_name)
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = sub_tasks.task_id
      AND (
        t.assignee_id = auth.uid()
        OR t.assigned_by = auth.uid()
        OR t.created_by = auth.uid()
        OR public.current_user_matches_name(t.assignee_name)
      )
  )
);

-- Backfill assignee_id on existing tasks where a matching auth user exists by name/email
UPDATE public.tasks t
SET assignee_id = u.id
FROM auth.users u
WHERE t.assignee_id IS NULL
  AND t.assignee_name IS NOT NULL
  AND btrim(t.assignee_name) <> ''
  AND (
    lower(btrim(coalesce(u.raw_user_meta_data->>'full_name',''))) = lower(btrim(t.assignee_name))
    OR lower(split_part(coalesce(u.raw_user_meta_data->>'full_name',''),' ',1)) = lower(split_part(btrim(t.assignee_name),' ',1))
    OR lower(coalesce(u.email,'')) = lower(btrim(t.assignee_name))
  );
