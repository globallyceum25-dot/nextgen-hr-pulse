
-- ============================================================
-- PHASE 1: RBAC FOUNDATION
-- ============================================================

CREATE TABLE public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL UNIQUE,
  role_name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_roles TO authenticated;
GRANT ALL ON public.rbac_roles TO service_role;
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_roles_select_auth" ON public.rbac_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_roles_admin_insert" ON public.rbac_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));
CREATE POLICY "rbac_roles_admin_update" ON public.rbac_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));
CREATE POLICY "rbac_roles_super_delete" ON public.rbac_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') AND is_system = false);

CREATE TABLE public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  permission_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_permissions TO authenticated;
GRANT ALL ON public.rbac_permissions TO service_role;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_perms_select_auth" ON public.rbac_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_perms_admin_write" ON public.rbac_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.rbac_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  module_label text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_modules TO authenticated;
GRANT ALL ON public.rbac_modules TO service_role;
ALTER TABLE public.rbac_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_modules_select_auth" ON public.rbac_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_modules_admin_write" ON public.rbac_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.rbac_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_id, permission_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_role_permissions TO authenticated;
GRANT ALL ON public.rbac_role_permissions TO service_role;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_rp_select_auth" ON public.rbac_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_rp_admin_write" ON public.rbac_role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));

CREATE TABLE public.rbac_user_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE RESTRICT,
  company_ids uuid[] NOT NULL DEFAULT '{}',
  department_ids uuid[] NOT NULL DEFAULT '{}',
  location_ids uuid[] NOT NULL DEFAULT '{}',
  all_companies boolean NOT NULL DEFAULT false,
  all_departments boolean NOT NULL DEFAULT false,
  all_locations boolean NOT NULL DEFAULT false,
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_user_scopes TO authenticated;
GRANT ALL ON public.rbac_user_scopes TO service_role;
ALTER TABLE public.rbac_user_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_scopes_self_or_admin_select" ON public.rbac_user_scopes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));
CREATE POLICY "rbac_scopes_admin_write" ON public.rbac_user_scopes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));

CREATE TABLE public.rbac_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text,
  category text NOT NULL DEFAULT 'basic' CHECK (category IN ('basic','organization','sensitive','system')),
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_field_permissions TO authenticated;
GRANT ALL ON public.rbac_field_permissions TO service_role;
ALTER TABLE public.rbac_field_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_fp_select_auth" ON public.rbac_field_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_fp_admin_write" ON public.rbac_field_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));

CREATE TABLE public.rbac_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type text NOT NULL CHECK (change_type IN ('role_assignment','permission_change','company_scope','department_scope','location_scope','field_access')),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','pending','approved','rejected')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approver_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rbac_access_requests TO authenticated;
GRANT ALL ON public.rbac_access_requests TO service_role;
ALTER TABLE public.rbac_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_ar_select" ON public.rbac_access_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR target_user_id = auth.uid()
    OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));
CREATE POLICY "rbac_ar_insert_self" ON public.rbac_access_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "rbac_ar_update_admin" ON public.rbac_access_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));
CREATE POLICY "rbac_ar_delete_super" ON public.rbac_access_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.rbac_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.rbac_audit_log TO authenticated;
GRANT ALL ON public.rbac_audit_log TO service_role;
ALTER TABLE public.rbac_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_audit_select_admin" ON public.rbac_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'sector_hr_admin'));
CREATE POLICY "rbac_audit_insert_self" ON public.rbac_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX rbac_audit_log_user_idx ON public.rbac_audit_log(user_id);
CREATE INDEX rbac_audit_log_created_idx ON public.rbac_audit_log(created_at DESC);
CREATE INDEX rbac_audit_log_module_idx ON public.rbac_audit_log(module);

CREATE TRIGGER trg_rbac_roles_updated BEFORE UPDATE ON public.rbac_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rbac_perms_updated BEFORE UPDATE ON public.rbac_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rbac_modules_updated BEFORE UPDATE ON public.rbac_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rbac_rp_updated BEFORE UPDATE ON public.rbac_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rbac_scopes_updated BEFORE UPDATE ON public.rbac_user_scopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rbac_fp_updated BEFORE UPDATE ON public.rbac_field_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rbac_ar_updated BEFORE UPDATE ON public.rbac_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.rbac_has_permission(_user_id uuid, _module_key text, _permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      AND (us.effective_to   IS NULL OR us.effective_to   >= CURRENT_DATE)
  )
$$;

CREATE OR REPLACE FUNCTION public.rbac_user_company_scope(_user_id uuid)
RETURNS TABLE(all_access boolean, company_ids uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT all_companies, company_ids FROM public.rbac_user_scopes
  WHERE user_id = _user_id AND status = 'active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.rbac_user_department_scope(_user_id uuid)
RETURNS TABLE(all_access boolean, department_ids uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT all_departments, department_ids FROM public.rbac_user_scopes
  WHERE user_id = _user_id AND status = 'active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.rbac_user_location_scope(_user_id uuid)
RETURNS TABLE(all_access boolean, location_ids uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT all_locations, location_ids FROM public.rbac_user_scopes
  WHERE user_id = _user_id AND status = 'active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.rbac_can_access_record(
  _user_id uuid, _company_id uuid, _department_id uuid, _location_id uuid
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.rbac_user_scopes%ROWTYPE;
BEGIN
  IF public.has_role(_user_id, 'super_admin') THEN RETURN true; END IF;
  SELECT * INTO s FROM public.rbac_user_scopes
    WHERE user_id = _user_id AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT (s.all_companies OR _company_id IS NULL OR _company_id = ANY(s.company_ids)) THEN RETURN false; END IF;
  IF NOT (s.all_departments OR _department_id IS NULL OR _department_id = ANY(s.department_ids)) THEN RETURN false; END IF;
  IF NOT (s.all_locations OR _location_id IS NULL OR _location_id = ANY(s.location_ids)) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

-- SEED DATA
INSERT INTO public.rbac_roles (role_key, role_name, description, is_system) VALUES
  ('super_admin','Super Admin','Full system access across all modules, records and fields.',true),
  ('group_admin','Group Admin','Access across all companies, departments and locations.',true),
  ('company_admin','Company Admin','Manage assigned company only.',true),
  ('department_manager','Department Manager','Manage assigned department only.',true),
  ('location_manager','Location Manager','Manage assigned location only.',true),
  ('data_entry_user','Data Entry User','Create and limited edit within assigned scope.',true),
  ('viewer','Viewer','Read-only access within assigned scope.',true),
  ('employee_user','Employee / User','Self-service access to own profile only.',true);

INSERT INTO public.rbac_permissions (permission_key, permission_name, description) VALUES
  ('view','View','View records and pages'),
  ('create','Create','Create new records'),
  ('edit','Edit','Modify existing records'),
  ('delete','Delete','Permanently delete records'),
  ('deactivate','Deactivate','Soft-deactivate records'),
  ('approve','Approve','Approve workflow items'),
  ('export','Export','Export data to file'),
  ('upload','Upload','Bulk upload data'),
  ('assign_access','Assign Access','Grant access to other users');

INSERT INTO public.rbac_modules (module_key, module_label, description) VALUES
  ('dashboard','Dashboard','Analytics landing page'),
  ('tasks','Tasks','Task management'),
  ('employees','Employee Master','Employee master records'),
  ('companies','Company Master','Company master records'),
  ('departments','Department Master','Department master records'),
  ('locations','Location Master','Location master records'),
  ('user_management','User Management','Users and roles'),
  ('reports','Reports','Reporting module'),
  ('documents','Documents','Document store'),
  ('audit_logs','Audit Logs','System audit trail');

-- PERMISSION MATRIX (default per spec section 11)
DO $$
DECLARE
  mrow record;
  prow record;
BEGIN
  -- SUPER ADMIN: full
  FOR mrow IN SELECT id FROM public.rbac_modules LOOP
    FOR prow IN SELECT id FROM public.rbac_permissions LOOP
      INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
      SELECT id, mrow.id, prow.id, true FROM public.rbac_roles WHERE role_key='super_admin'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- GROUP ADMIN: all except delete
  FOR mrow IN SELECT id FROM public.rbac_modules LOOP
    FOR prow IN SELECT id FROM public.rbac_permissions WHERE permission_key <> 'delete' LOOP
      INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
      SELECT id, mrow.id, prow.id, true FROM public.rbac_roles WHERE role_key='group_admin'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- COMPANY ADMIN
  FOR mrow IN SELECT id FROM public.rbac_modules
           WHERE module_key IN ('dashboard','tasks','employees','companies','departments','locations','reports','documents') LOOP
    FOR prow IN SELECT id FROM public.rbac_permissions
             WHERE permission_key IN ('view','create','edit','approve','export','upload','deactivate') LOOP
      INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
      SELECT id, mrow.id, prow.id, true FROM public.rbac_roles WHERE role_key='company_admin'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- DEPARTMENT MANAGER
  FOR mrow IN SELECT id FROM public.rbac_modules
           WHERE module_key IN ('dashboard','tasks','employees','reports') LOOP
    FOR prow IN SELECT id FROM public.rbac_permissions
             WHERE permission_key IN ('view','edit','approve') LOOP
      INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
      SELECT id, mrow.id, prow.id, true FROM public.rbac_roles WHERE role_key='department_manager'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- LOCATION MANAGER
  FOR mrow IN SELECT id FROM public.rbac_modules
           WHERE module_key IN ('dashboard','tasks','employees','locations') LOOP
    FOR prow IN SELECT id FROM public.rbac_permissions
             WHERE permission_key IN ('view','edit','approve') LOOP
      INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
      SELECT id, mrow.id, prow.id, true FROM public.rbac_roles WHERE role_key='location_manager'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- DATA ENTRY USER
  FOR mrow IN SELECT id FROM public.rbac_modules
           WHERE module_key IN ('dashboard','tasks','employees','companies','departments','locations') LOOP
    FOR prow IN SELECT id FROM public.rbac_permissions
             WHERE permission_key IN ('view','create','edit') LOOP
      INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
      SELECT id, mrow.id, prow.id, true FROM public.rbac_roles WHERE role_key='data_entry_user'
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- VIEWER: view only
  FOR mrow IN SELECT id FROM public.rbac_modules
           WHERE module_key IN ('dashboard','tasks','employees','companies','departments','locations','reports') LOOP
    INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
    SELECT rl.id, mrow.id, pm.id, true
    FROM public.rbac_roles rl, public.rbac_permissions pm
    WHERE rl.role_key='viewer' AND pm.permission_key='view'
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- EMPLOYEE/USER: own dashboard + tasks view/edit
  FOR mrow IN SELECT id FROM public.rbac_modules WHERE module_key IN ('dashboard','tasks') LOOP
    INSERT INTO public.rbac_role_permissions(role_id, module_id, permission_id, granted)
    SELECT rl.id, mrow.id, pm.id, true
    FROM public.rbac_roles rl, public.rbac_permissions pm
    WHERE rl.role_key='employee_user' AND pm.permission_key IN ('view','edit')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Sensitive field defaults on Employee Master
DO $$
DECLARE
  emp_mod uuid;
  rl record;
BEGIN
  SELECT id INTO emp_mod FROM public.rbac_modules WHERE module_key='employees';
  FOR rl IN SELECT id, role_key FROM public.rbac_roles LOOP
    INSERT INTO public.rbac_field_permissions(role_id, module_id, field_key, field_label, category, can_view, can_edit)
    VALUES
      (rl.id, emp_mod, 'salary','Salary / Compensation','sensitive',
        rl.role_key IN ('super_admin','group_admin','company_admin'),
        rl.role_key IN ('super_admin','group_admin')),
      (rl.id, emp_mod, 'bank_details','Bank Details','sensitive',
        rl.role_key IN ('super_admin','group_admin','company_admin'),
        rl.role_key IN ('super_admin','group_admin')),
      (rl.id, emp_mod, 'personal_documents','Personal Documents','sensitive',
        rl.role_key IN ('super_admin','group_admin','company_admin'),
        rl.role_key IN ('super_admin','group_admin')),
      (rl.id, emp_mod, 'system_access','System Access Details','system',
        rl.role_key IN ('super_admin','group_admin'),
        rl.role_key IN ('super_admin'))
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
