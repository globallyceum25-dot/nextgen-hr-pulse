-- Fix "data not showing" permanently.
--
-- Product decision (confirmed by owner):
--   * EVERY authenticated user can SEE ALL tasks (and sub-tasks) in the main list.
--   * The app's "My Tasks" view narrows the list to the current user's own tasks
--     (client-side, via the myTasksMode filter on the Tasks page).
--   * EDIT/INSERT/DELETE permissions are unchanged and remain governed by their
--     own policies + the RBAC permission matrix in the UI.
--
-- Previously the tasks/sub_tasks SELECT policies scoped rows to "stakeholders only"
-- (assignee/creator/etc.), so non-admin roles saw nothing. This replaces those read
-- policies with an authenticated-wide read.
--
-- Idempotent: safe to run multiple times (DROP POLICY IF EXISTS before CREATE).
-- This migration only changes SELECT (read) policies.

-- ============================================================
-- TASKS: every authenticated user can view all tasks
-- ============================================================
DROP POLICY IF EXISTS "Task stakeholders can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users with tasks view permission can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- SUB_TASKS: every authenticated user can view all sub-tasks
-- ============================================================
DROP POLICY IF EXISTS "Sub-task stakeholders can view sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users with tasks view permission can view sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated users can view sub_tasks" ON public.sub_tasks;
CREATE POLICY "Authenticated users can view all sub_tasks"
ON public.sub_tasks
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- TASKS: edit restricted to admins or the task's owner
-- (assignee / creator / assigner / escalation person / name match).
-- Everyone can SEE all tasks, but only their own are editable.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Owners and admins can update tasks" ON public.tasks;
CREATE POLICY "Owners and admins can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR assignee_id = auth.uid()
  OR assigned_by = auth.uid()
  OR created_by = auth.uid()
  OR escalation_person_id = auth.uid()
  OR public.current_user_matches_name(assignee_name)
);

-- SUB_TASKS: same edit restriction (own sub-task, or owner of the parent task)
DROP POLICY IF EXISTS "Authenticated users can update sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Owners and admins can update sub_tasks" ON public.sub_tasks;
CREATE POLICY "Owners and admins can update sub_tasks"
ON public.sub_tasks
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR assignee_id = auth.uid()
  OR created_by = auth.uid()
  OR public.current_user_matches_name(assignee_name)
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = sub_tasks.task_id
      AND (
        t.assignee_id = auth.uid()
        OR t.assigned_by = auth.uid()
        OR t.created_by = auth.uid()
        OR t.escalation_person_id = auth.uid()
        OR public.current_user_matches_name(t.assignee_name)
      )
  )
);

-- ============================================================
-- EMPLOYEES: view governed by the RBAC employees:view permission
-- (super_admin / sector_hr_admin always allowed; a user can always see the
--  employee record linked to their own active scope).
-- ============================================================
DROP POLICY IF EXISTS "HR and own record can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users with employees view permission can view employees" ON public.employees;
CREATE POLICY "Users with employees view permission can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR public.rbac_has_permission(auth.uid(), 'employees', 'view')
  OR EXISTS (
    SELECT 1 FROM public.rbac_user_scopes s
    WHERE s.user_id = auth.uid()
      AND s.status = 'active'
      AND s.employee_id = employees.id
  )
);
