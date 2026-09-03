-- Enforce organisational scoping on public.employees at the DATABASE level.
--
-- PROBLEM
-- rbac_user_scopes stores company/department/location scopes, and the UI honours
-- them (usePermissions.canAccessByName / canAccessEmployeeId). But a repo-wide
-- search shows rbac_can_access_record() and the *_scope() helpers are referenced
-- in ZERO policies. The employees SELECT policy only checks the employees:view
-- permission, so a company_admin restricted in the UI to Company A could call
-- GET /rest/v1/employees and receive the entire employee master for every company.
--
-- WHY THIS IS NOT A DROP-IN rbac_can_access_record() CALL
-- That helper takes uuids, but public.employees stores company_name / department /
-- location as free TEXT (see 20260319060824, 20260319083945) while rbac_user_scopes
-- stores uuid[]. The columns must be resolved by name before they can be compared.
-- Normalising those columns to real FKs is the durable fix; this closes the hole in
-- the meantime without a data migration.
--
-- FAIL-OPEN BY DESIGN
-- The predicate returns TRUE when the user has no active scope row, or when the
-- relevant all_* flag is set, or when the employee row has no company/department
-- value to compare. Only an explicitly-scoped user viewing an explicitly-tagged
-- employee is filtered. Rolling this out therefore cannot silently lock out users
-- whose scope rows are incomplete -- a real risk given scope data is still being
-- populated.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.employee_in_user_scope(
  _company_name text,
  _department_name text,
  _location_name text
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.rbac_user_scopes%ROWTYPE;
  cid uuid;
  did uuid;
  lid uuid;
BEGIN
  IF public.has_role(auth.uid(), 'super_admin'::public.app_role)
     OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role) THEN
    RETURN true;
  END IF;

  SELECT * INTO s
  FROM public.rbac_user_scopes
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  -- No scope configured -> unrestricted (preserves today's behaviour).
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Company
  IF NOT s.all_companies AND array_length(s.company_ids, 1) IS NOT NULL THEN
    SELECT id INTO cid FROM public.companies
     WHERE lower(btrim(company_name)) = lower(btrim(coalesce(_company_name, ''))) LIMIT 1;
    IF cid IS NOT NULL AND NOT (cid = ANY(s.company_ids)) THEN
      RETURN false;
    END IF;
  END IF;

  -- Department
  IF NOT s.all_departments AND array_length(s.department_ids, 1) IS NOT NULL THEN
    SELECT id INTO did FROM public.departments
     WHERE lower(btrim(department_name)) = lower(btrim(coalesce(_department_name, ''))) LIMIT 1;
    IF did IS NOT NULL AND NOT (did = ANY(s.department_ids)) THEN
      RETURN false;
    END IF;
  END IF;

  -- Location
  IF NOT s.all_locations AND array_length(s.location_ids, 1) IS NOT NULL THEN
    SELECT id INTO lid FROM public.locations
     WHERE lower(btrim(location_name)) = lower(btrim(coalesce(_location_name, ''))) LIMIT 1;
    IF lid IS NOT NULL AND NOT (lid = ANY(s.location_ids)) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.employee_in_user_scope(text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.employee_in_user_scope(text, text, text) TO authenticated;

-- Apply it to the employees read policy, preserving every existing allowance.
DROP POLICY IF EXISTS "Users with employees view permission can view employees" ON public.employees;
DROP POLICY IF EXISTS "Scoped employees view" ON public.employees;
CREATE POLICY "Scoped employees view"
ON public.employees
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'sector_hr_admin'::public.app_role)
  -- Your own linked employee record is always visible.
  OR EXISTS (
    SELECT 1 FROM public.rbac_user_scopes s
    WHERE s.user_id = auth.uid() AND s.status = 'active' AND s.employee_id = employees.id
  )
  OR (
    public.rbac_has_permission(auth.uid(), 'employees', 'view')
    AND public.employee_in_user_scope(employees.company_name, employees.department, employees.location)
  )
);
