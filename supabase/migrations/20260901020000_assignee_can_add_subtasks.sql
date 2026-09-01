-- Let an assignee break their own task into sub-tasks.
--
-- WHY
-- Sub-task creation required the blanket tasks:create_subtask permission, so an
-- assignee could not divide the work assigned to them into steps even when their
-- role allows editing tasks. The UI now offers "Add Sub-task" on a task; without
-- this policy the insert would be rejected by RLS.
--
-- RULE
-- You may add a sub-task to a task when you are an admin, OR hold
-- tasks:create_subtask, OR you are that task's assignee AND hold tasks:edit.
-- Being an assignee alone is not enough — the edit permission still gates it,
-- so a Viewer cannot create sub-tasks.
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Users with create_subtask permission can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users with matrix task write can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users with task create permission can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Subtask creators and task assignees can insert sub_tasks" ON public.sub_tasks;

CREATE POLICY "Subtask creators and task assignees can insert sub_tasks"
ON public.sub_tasks
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR public.rbac_has_permission(auth.uid(), 'tasks', 'create_subtask')
  OR (
    public.rbac_has_permission(auth.uid(), 'tasks', 'edit')
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = sub_tasks.task_id
        AND (
          t.assignee_id = auth.uid()
          OR public.current_user_matches_name(t.assignee_name)
          OR t.assigned_by = auth.uid()
          OR t.created_by = auth.uid()
        )
    )
  )
);
