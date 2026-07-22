DROP POLICY IF EXISTS "Users with task create permission can insert tasks" ON public.tasks;
CREATE POLICY "Users with matrix task create can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.rbac_roles rr ON rr.role_key = ur.role::text AND rr.status = 'active'
    JOIN public.rbac_role_permissions rrp ON rrp.role_id = rr.id AND rrp.granted = true
    JOIN public.rbac_modules rm ON rm.id = rrp.module_id AND rm.module_key = 'tasks'
    JOIN public.rbac_permissions rp ON rp.id = rrp.permission_id AND rp.permission_key = 'create'
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.rbac_user_scopes us
    JOIN public.rbac_role_permissions rrp ON rrp.role_id = us.role_id AND rrp.granted = true
    JOIN public.rbac_modules rm ON rm.id = rrp.module_id AND rm.module_key = 'tasks'
    JOIN public.rbac_permissions rp ON rp.id = rrp.permission_id AND rp.permission_key = 'create'
    WHERE us.user_id = auth.uid()
      AND us.status = 'active'
      AND (us.effective_from IS NULL OR us.effective_from <= CURRENT_DATE)
      AND (us.effective_to IS NULL OR us.effective_to >= CURRENT_DATE)
  )
);

DROP POLICY IF EXISTS "Users with task create permission can insert sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users with matrix task write can insert sub_tasks"
ON public.sub_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.rbac_roles rr ON rr.role_key = ur.role::text AND rr.status = 'active'
    JOIN public.rbac_role_permissions rrp ON rrp.role_id = rr.id AND rrp.granted = true
    JOIN public.rbac_modules rm ON rm.id = rrp.module_id AND rm.module_key = 'tasks'
    JOIN public.rbac_permissions rp ON rp.id = rrp.permission_id AND rp.permission_key IN ('create', 'edit')
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.rbac_user_scopes us
    JOIN public.rbac_role_permissions rrp ON rrp.role_id = us.role_id AND rrp.granted = true
    JOIN public.rbac_modules rm ON rm.id = rrp.module_id AND rm.module_key = 'tasks'
    JOIN public.rbac_permissions rp ON rp.id = rrp.permission_id AND rp.permission_key IN ('create', 'edit')
    WHERE us.user_id = auth.uid()
      AND us.status = 'active'
      AND (us.effective_from IS NULL OR us.effective_from <= CURRENT_DATE)
      AND (us.effective_to IS NULL OR us.effective_to >= CURRENT_DATE)
  )
);