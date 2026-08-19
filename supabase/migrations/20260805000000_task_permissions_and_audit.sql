-- Task assignment / priority / sub-task permissions + audit trail.
--
-- Enforced at the DATABASE level (triggers + RLS) so the rules cannot be bypassed by
-- calling the REST API directly. The frontend mirrors these rules for UX only.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1) New permission: create_subtask
-- ============================================================
INSERT INTO public.rbac_permissions (permission_key, permission_name, description)
VALUES ('create_subtask', 'Create Sub-Task', 'Create sub-tasks under a task')
ON CONFLICT (permission_key) DO UPDATE
  SET permission_name = EXCLUDED.permission_name,
      description     = EXCLUDED.description;

-- Grant create_subtask on the tasks module to every role that can already create tasks,
-- so existing behaviour is preserved rather than silently revoked.
INSERT INTO public.rbac_role_permissions (role_id, module_id, permission_id, granted)
SELECT rp.role_id, rp.module_id, newp.id, rp.granted
FROM public.rbac_role_permissions rp
JOIN public.rbac_modules     m    ON m.id = rp.module_id AND m.module_key = 'tasks'
JOIN public.rbac_permissions p    ON p.id = rp.permission_id AND p.permission_key = 'create'
JOIN public.rbac_permissions newp ON newp.permission_key = 'create_subtask'
WHERE NOT EXISTS (
  SELECT 1 FROM public.rbac_role_permissions x
  WHERE x.role_id = rp.role_id AND x.module_id = rp.module_id AND x.permission_id = newp.id
);

-- ============================================================
-- 2) Helper: is the current user the task's assigner (or an admin)?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_task_assigner(_assigned_by uuid, _created_by uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
    OR (_assigned_by IS NOT NULL AND _assigned_by = auth.uid())
    OR (_created_by  IS NOT NULL AND _created_by  = auth.uid());
$$;

-- ============================================================
-- 3) Enforce: only the assigner may change priority, and Assigned By is immutable
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_task_field_permissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Priority may only be changed by the person who assigned/created the task.
  IF NEW.priority IS DISTINCT FROM OLD.priority
     AND NOT public.is_task_assigner(OLD.assigned_by, OLD.created_by) THEN
    RAISE EXCEPTION 'Only the person who assigned this task can change its priority'
      USING ERRCODE = '42501';
  END IF;

  -- "Assigned By" is set at creation and never edited by the assignee.
  IF NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
     AND NOT public.is_task_assigner(OLD.assigned_by, OLD.created_by) THEN
    RAISE EXCEPTION 'Assigned By cannot be changed' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_field_permissions ON public.tasks;
CREATE TRIGGER trg_tasks_field_permissions
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_task_field_permissions();

-- ============================================================
-- 4) Audit trail
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity_log (task_id, user_id, action, description)
    VALUES (NEW.id, actor, 'Task created', 'Task "' || NEW.title || '" created');

    IF NEW.assignee_id IS NOT NULL OR NEW.assignee_name IS NOT NULL THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, new_value, description)
      VALUES (NEW.id, actor, 'Task assigned', 'assignee',
              COALESCE(NEW.assignee_name, NEW.assignee_id::text),
              'Assigned by ' || COALESCE(NEW.assigned_by::text, actor::text));
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
      VALUES (NEW.id, actor, 'Priority changed', 'priority', OLD.priority::text, NEW.priority::text,
              'Priority ' || OLD.priority::text || ' → ' || NEW.priority::text);
    END IF;

    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
       OR NEW.assignee_name IS DISTINCT FROM OLD.assignee_name THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
      VALUES (NEW.id, actor, 'Assignee changed', 'assignee',
              COALESCE(OLD.assignee_name, OLD.assignee_id::text),
              COALESCE(NEW.assignee_name, NEW.assignee_id::text),
              'Assignee updated');
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
      VALUES (NEW.id, actor, 'Task status changed', 'status', OLD.status::text, NEW.status::text,
              'Status ' || OLD.status::text || ' → ' || NEW.status::text);
    END IF;

    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, description)
      VALUES (NEW.id, actor, 'Task edited', 'Task details updated');
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- task_activity_log.task_id cascades on delete, so the deletion record is stored
    -- with a NULL task_id and the id preserved in the description.
    INSERT INTO public.task_activity_log (task_id, user_id, action, old_value, description)
    VALUES (NULL, actor, 'Task deleted', OLD.title,
            'Task ' || OLD.id::text || ' ("' || OLD.title || '") deleted');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_audit ON public.tasks;
CREATE TRIGGER trg_tasks_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

CREATE OR REPLACE FUNCTION public.log_sub_task_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, new_value, description)
  VALUES (NEW.task_id, auth.uid(), 'Sub-task created', 'sub_task', NEW.title,
          'Sub-task "' || NEW.title || '" created');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sub_tasks_audit ON public.sub_tasks;
CREATE TRIGGER trg_sub_tasks_audit
  AFTER INSERT ON public.sub_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_sub_task_activity();

-- ============================================================
-- 5) Sub-task INSERT requires the create_subtask permission
-- ============================================================
DROP POLICY IF EXISTS "Users with matrix task write can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users with task create permission can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Users with create_subtask permission can insert sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users with create_subtask permission can insert sub_tasks"
ON public.sub_tasks
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR public.rbac_has_permission(auth.uid(), 'tasks', 'create_subtask')
);

-- ============================================================
-- 6) Sub-task UPDATE: needs tasks:edit AND a relationship to the sub-task
--    (fixes assignees being unable to edit their own sub-task)
-- ============================================================
DROP POLICY IF EXISTS "Owners and admins can update sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Editors of own sub_tasks can update" ON public.sub_tasks;
CREATE POLICY "Editors of own sub_tasks can update"
ON public.sub_tasks
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR (
    public.rbac_has_permission(auth.uid(), 'tasks', 'edit')
    AND (
      assignee_id = auth.uid()
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
    )
  )
);
