-- Field-level task/sub-task permissions.
--
-- PROBLEM WITH THE PREVIOUS APPROACH
-- The earlier migration enforced permissions at the ROW level: an assignee who was not
-- the assigner could not UPDATE the row at all. That blocked legitimate actions (status
-- changes) and produced "You do not have permission to edit this sub-task".
--
-- CORRECT MODEL
--   Row level  : any stakeholder (assigner, creator, assignee, escalation) may update
--                the row, subject to tasks:edit.
--   Field level: a BEFORE UPDATE trigger rejects changes to PROTECTED COLUMNS
--                (priority, due_date, assigned_by) unless the caller is the
--                assigner/creator or an admin.
--
-- Net effect, enforced in the database (not just the UI):
--   Assignee  -> may change status, progress, remarks;  may NOT change priority/deadline.
--   Assigner  -> may change everything, subject to RBAC.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1) ROW-LEVEL: stakeholders may update tasks
-- ============================================================
DROP POLICY IF EXISTS "Owners and admins can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task stakeholders can update tasks" ON public.tasks;
CREATE POLICY "Task stakeholders can update tasks"
ON public.tasks
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR (
    public.rbac_has_permission(auth.uid(), 'tasks', 'edit')
    AND (
      assignee_id = auth.uid()
      OR assigned_by = auth.uid()
      OR created_by = auth.uid()
      OR escalation_person_id = auth.uid()
      OR public.current_user_matches_name(assignee_name)
    )
  )
);

-- ============================================================
-- 2) ROW-LEVEL: stakeholders may update sub-tasks
-- ============================================================
-- Drop every prior UPDATE policy by name. Permissive policies are OR'd, so a
-- leftover one silently widens access; "Task stakeholders can update sub_tasks"
-- comes from an earlier migration and must be removed here too.
DROP POLICY IF EXISTS "Editors of own sub_tasks can update" ON public.sub_tasks;
DROP POLICY IF EXISTS "Owners and admins can update sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Task stakeholders can update sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated users can update sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Sub-task stakeholders can update sub_tasks" ON public.sub_tasks;
CREATE POLICY "Sub-task stakeholders can update sub_tasks"
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

-- ============================================================
-- 3) FIELD-LEVEL: protect priority / due_date / assigned_by on tasks
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_task_field_permissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_assigner boolean := public.is_task_assigner(OLD.assigned_by, OLD.created_by);
BEGIN
  IF NEW.priority IS DISTINCT FROM OLD.priority AND NOT is_assigner THEN
    RAISE EXCEPTION 'Only the person who assigned this task can change its priority'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date AND NOT is_assigner THEN
    RAISE EXCEPTION 'Only the person who assigned this task can change its deadline'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.assigned_by IS DISTINCT FROM OLD.assigned_by AND NOT is_assigner THEN
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
-- 4) FIELD-LEVEL: protect priority / due_date on sub-tasks
--    The sub-task "assigner" is its creator, or the parent task's assigner.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_sub_task_field_permissions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_assigner boolean;
BEGIN
  SELECT
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
    OR OLD.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = OLD.task_id
        AND (t.assigned_by = auth.uid() OR t.created_by = auth.uid())
    )
  INTO is_assigner;

  IF NEW.priority IS DISTINCT FROM OLD.priority AND NOT is_assigner THEN
    RAISE EXCEPTION 'Only the person who assigned this sub-task can change its priority'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date AND NOT is_assigner THEN
    RAISE EXCEPTION 'Only the person who assigned this sub-task can change its deadline'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sub_tasks_field_permissions ON public.sub_tasks;
CREATE TRIGGER trg_sub_tasks_field_permissions
  BEFORE UPDATE ON public.sub_tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sub_task_field_permissions();

-- ============================================================
-- 5) REMARKS: any authenticated user may read task comments and add their own.
--    Editing/deleting stays restricted to the comment's author (existing policies).
-- ============================================================
DROP POLICY IF EXISTS "Task stakeholders can view comments" ON public.task_comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.task_comments;
CREATE POLICY "Authenticated users can view comments"
ON public.task_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.task_comments;
CREATE POLICY "Users can create comments"
ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.task_comments;
CREATE POLICY "Users can update own comments"
ON public.task_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.task_comments;
CREATE POLICY "Users can delete own comments"
ON public.task_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 6) AUDIT: deadline changes and remarks
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

    IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
      VALUES (NEW.id, actor, 'Deadline changed', 'due_date',
              COALESCE(OLD.due_date::text, '—'), COALESCE(NEW.due_date::text, '—'), 'Deadline updated');
    END IF;

    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
       OR NEW.assignee_name IS DISTINCT FROM OLD.assignee_name THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
      VALUES (NEW.id, actor, 'Assignee changed', 'assignee',
              COALESCE(OLD.assignee_name, OLD.assignee_id::text),
              COALESCE(NEW.assignee_name, NEW.assignee_id::text), 'Assignee updated');
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
      VALUES (NEW.id, actor, 'Task status changed', 'status', OLD.status::text, NEW.status::text,
              'Status ' || OLD.status::text || ' → ' || NEW.status::text);
    END IF;

    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO public.task_activity_log (task_id, user_id, action, description)
      VALUES (NEW.id, actor, 'Task edited', 'Task details updated');
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.task_activity_log (task_id, user_id, action, old_value, description)
    VALUES (NULL, actor, 'Task deleted', OLD.title,
            'Task ' || OLD.id::text || ' ("' || OLD.title || '") deleted');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Sub-task updates: log status / priority / deadline changes too
CREATE OR REPLACE FUNCTION public.log_sub_task_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
    VALUES (NEW.task_id, actor, 'Sub-task status changed', 'status', OLD.status::text, NEW.status::text,
            'Sub-task "' || NEW.title || '": ' || OLD.status::text || ' → ' || NEW.status::text);
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
    VALUES (NEW.task_id, actor, 'Sub-task priority changed', 'priority', OLD.priority::text, NEW.priority::text,
            'Sub-task "' || NEW.title || '" priority updated');
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
    VALUES (NEW.task_id, actor, 'Sub-task deadline changed', 'due_date',
            COALESCE(OLD.due_date::text, '—'), COALESCE(NEW.due_date::text, '—'),
            'Sub-task "' || NEW.title || '" deadline updated');
  END IF;
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
     OR NEW.assignee_name IS DISTINCT FROM OLD.assignee_name THEN
    INSERT INTO public.task_activity_log (task_id, user_id, action, field_name, old_value, new_value, description)
    VALUES (NEW.task_id, actor, 'Sub-task assigned', 'assignee',
            COALESCE(OLD.assignee_name, OLD.assignee_id::text),
            COALESCE(NEW.assignee_name, NEW.assignee_id::text), 'Sub-task assignee updated');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sub_tasks_update_audit ON public.sub_tasks;
CREATE TRIGGER trg_sub_tasks_update_audit
  AFTER UPDATE ON public.sub_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_sub_task_update();

-- Remarks added
CREATE OR REPLACE FUNCTION public.log_task_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_activity_log (task_id, user_id, action, new_value, description)
  VALUES (NEW.task_id, NEW.user_id, 'Remark added', left(NEW.content, 200), 'Comment added to task');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_comments_audit ON public.task_comments;
CREATE TRIGGER trg_task_comments_audit
  AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.log_task_comment();
