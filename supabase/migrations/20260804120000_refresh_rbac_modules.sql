-- Align rbac_modules with the modules the application actually has.
--
--  * ADD    'sectors'   — Sector Master is a real tab in Master Sheets (with its own
--                         locations) but had no module, so it could not be permission
--                         controlled at all.
--  * RETIRE 'documents' — no Documents page or route exists in the app.
--  * RETIRE 'audit_logs'— not a navigable module; it is a tab inside Access Control,
--                         which is already restricted to super_admin / sector_hr_admin.
--
-- Retired modules are set to status='inactive' rather than deleted: rbac_role_permissions
-- references rbac_modules ON DELETE CASCADE, so deleting would permanently destroy every
-- role's grants for them. Deactivating keeps the rows and is reversible by flipping
-- status back to 'active'.
--
-- Idempotent: safe to re-run.

-- 1) Add the missing Sector Master module
INSERT INTO public.rbac_modules (module_key, module_label, description, status)
VALUES ('sectors', 'Sector Master', 'Sector master records', 'active')
ON CONFLICT (module_key) DO UPDATE
  SET module_label = EXCLUDED.module_label,
      description   = EXCLUDED.description,
      status        = 'active';

-- 2) Retire modules that no longer exist in the app
UPDATE public.rbac_modules
   SET status = 'inactive'
 WHERE module_key IN ('documents', 'audit_logs');

-- 3) Grant the new Sector Master module to roles that already manage master data,
--    mirroring each role's existing Company/Location Master access.
INSERT INTO public.rbac_role_permissions (role_id, module_id, permission_id, granted)
SELECT rr.id, m.id, p.id, true
FROM public.rbac_roles rr
JOIN public.rbac_modules     m ON m.module_key = 'sectors'
JOIN public.rbac_permissions p ON TRUE
WHERE (
     (rr.role_key IN ('super_admin','sector_hr_admin','group_admin','company_admin')
      AND p.permission_key IN ('view','create','edit','approve','export'))
  OR (rr.role_key IN ('department_manager','location_manager','responsible_person')
      AND p.permission_key IN ('view','edit'))
  OR (rr.role_key = 'data_entry_user'
      AND p.permission_key IN ('view','create','edit'))
  OR (rr.role_key IN ('employee_user','viewer')
      AND p.permission_key = 'view')
)
AND NOT EXISTS (
  SELECT 1 FROM public.rbac_role_permissions x
  WHERE x.role_id = rr.id AND x.module_id = m.id AND x.permission_id = p.id
);
