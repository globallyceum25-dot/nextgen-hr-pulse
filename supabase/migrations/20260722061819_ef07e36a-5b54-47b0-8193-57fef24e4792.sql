CREATE OR REPLACE FUNCTION public.rbac_has_permission(_user_id uuid, _module_key text, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_scopes us
    JOIN public.rbac_role_permissions rp ON rp.role_id = us.role_id
    JOIN public.rbac_modules m ON m.id = rp.module_id AND m.module_key = _module_key
    JOIN public.rbac_permissions p ON p.id = rp.permission_id AND p.permission_key = _permission_key
    WHERE us.user_id = _user_id
      AND us.status = 'active'
      AND rp.granted = true
      AND (us.effective_from IS NULL OR us.effective_from <= CURRENT_DATE)
      AND (us.effective_to IS NULL OR us.effective_to >= CURRENT_DATE)
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.rbac_roles rr ON rr.role_key = ur.role::text AND rr.status = 'active'
    JOIN public.rbac_role_permissions rp ON rp.role_id = rr.id
    JOIN public.rbac_modules m ON m.id = rp.module_id AND m.module_key = _module_key
    JOIN public.rbac_permissions p ON p.id = rp.permission_id AND p.permission_key = _permission_key
    WHERE ur.user_id = _user_id
      AND rp.granted = true
  )
$function$;

DROP POLICY IF EXISTS "rbac_rp_select_admins" ON public.rbac_role_permissions;
CREATE POLICY "Users can view own role permission matrix"
ON public.rbac_role_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.rbac_roles rr ON rr.role_key = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rr.id = rbac_role_permissions.role_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.rbac_user_scopes us
    WHERE us.user_id = auth.uid()
      AND us.role_id = rbac_role_permissions.role_id
      AND us.status = 'active'
      AND (us.effective_from IS NULL OR us.effective_from <= CURRENT_DATE)
      AND (us.effective_to IS NULL OR us.effective_to >= CURRENT_DATE)
  )
);

DROP POLICY IF EXISTS "rbac_fp_select_admins" ON public.rbac_field_permissions;
CREATE POLICY "Users can view own field permission rules"
ON public.rbac_field_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.rbac_roles rr ON rr.role_key = ur.role::text
    WHERE ur.user_id = auth.uid()
      AND rr.id = rbac_field_permissions.role_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.rbac_user_scopes us
    WHERE us.user_id = auth.uid()
      AND us.role_id = rbac_field_permissions.role_id
      AND us.status = 'active'
      AND (us.effective_from IS NULL OR us.effective_from <= CURRENT_DATE)
      AND (us.effective_to IS NULL OR us.effective_to >= CURRENT_DATE)
  )
);

DROP POLICY IF EXISTS "Admins and HR can insert tasks" ON public.tasks;
CREATE POLICY "Users with task create permission can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.rbac_has_permission(auth.uid(), 'tasks', 'create')
);

DROP POLICY IF EXISTS "Authenticated users can insert sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users with task create permission can insert sub_tasks"
ON public.sub_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.rbac_has_permission(auth.uid(), 'tasks', 'create')
  OR public.rbac_has_permission(auth.uid(), 'tasks', 'edit')
);