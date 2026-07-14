
-- === TASKS ===
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Task stakeholders can view tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'sector_hr_admin')
  OR assignee_id = auth.uid()
  OR assigned_by = auth.uid()
  OR created_by = auth.uid()
  OR updated_by = auth.uid()
  OR escalation_person_id = auth.uid()
);

-- === SUB_TASKS ===
DROP POLICY IF EXISTS "Authenticated users can view sub_tasks" ON public.sub_tasks;
CREATE POLICY "Sub-task stakeholders can view sub_tasks" ON public.sub_tasks
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'sector_hr_admin')
  OR assignee_id = auth.uid()
  OR created_by = auth.uid()
  OR updated_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = sub_tasks.task_id
      AND (
        t.assignee_id = auth.uid()
        OR t.assigned_by = auth.uid()
        OR t.created_by = auth.uid()
        OR t.updated_by = auth.uid()
        OR t.escalation_person_id = auth.uid()
      )
  )
);

-- === TASK_COMMENTS ===
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.task_comments;
CREATE POLICY "Task stakeholders can view comments" ON public.task_comments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'sector_hr_admin')
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND (
        t.assignee_id = auth.uid()
        OR t.assigned_by = auth.uid()
        OR t.created_by = auth.uid()
        OR t.updated_by = auth.uid()
        OR t.escalation_person_id = auth.uid()
      )
  )
);

-- === TASK_ACTIVITY_LOG ===
DROP POLICY IF EXISTS "Authenticated users can view activity_log" ON public.task_activity_log;
CREATE POLICY "Task stakeholders can view activity_log" ON public.task_activity_log
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'sector_hr_admin')
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_activity_log.task_id
      AND (
        t.assignee_id = auth.uid()
        OR t.assigned_by = auth.uid()
        OR t.created_by = auth.uid()
        OR t.updated_by = auth.uid()
        OR t.escalation_person_id = auth.uid()
      )
  )
);

-- === EMPLOYEES ===
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "HR and own record can view employees" ON public.employees
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'sector_hr_admin')
  OR EXISTS (
    SELECT 1 FROM public.rbac_user_scopes s
    WHERE s.user_id = auth.uid()
      AND s.status = 'active'
      AND s.employee_id = employees.id
  )
);

-- === RBAC ROLE PERMISSIONS ===
DROP POLICY IF EXISTS "rbac_rp_select_auth" ON public.rbac_role_permissions;
CREATE POLICY "rbac_rp_select_admins" ON public.rbac_role_permissions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- === RBAC FIELD PERMISSIONS ===
DROP POLICY IF EXISTS "rbac_fp_select_auth" ON public.rbac_field_permissions;
CREATE POLICY "rbac_fp_select_admins" ON public.rbac_field_permissions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- === STORAGE: avatars listing ===
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Users can list their own avatars" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- === SECURITY DEFINER helpers: revoke from anon ===
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rbac_has_permission(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rbac_user_company_scope(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rbac_user_department_scope(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rbac_user_location_scope(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rbac_can_access_record(uuid, uuid, uuid, uuid) FROM anon, public;
