
-- =====================================================
-- HARDEN RLS POLICIES TO INTERNATIONAL SECURITY STANDARDS
-- =====================================================

-- 1. COMPANIES TABLE: restrict writes to admins only
DROP POLICY IF EXISTS "Public can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Public can update companies" ON public.companies;
DROP POLICY IF EXISTS "Public can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Public can view companies" ON public.companies;

CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 2. DEPARTMENTS TABLE: restrict writes to admins only
DROP POLICY IF EXISTS "Public can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Public can update departments" ON public.departments;
DROP POLICY IF EXISTS "Public can delete departments" ON public.departments;
DROP POLICY IF EXISTS "Public can view departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert departments"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 3. EMPLOYEES TABLE: restrict writes to admins only
DROP POLICY IF EXISTS "Public can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Public can update employees" ON public.employees;
DROP POLICY IF EXISTS "Public can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Public can view employees" ON public.employees;

CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 4. LOCATIONS TABLE: restrict writes to admins only
DROP POLICY IF EXISTS "Public can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Public can update locations" ON public.locations;
DROP POLICY IF EXISTS "Public can delete locations" ON public.locations;
DROP POLICY IF EXISTS "Public can view locations" ON public.locations;

CREATE POLICY "Authenticated users can view locations"
  ON public.locations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert locations"
  ON public.locations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can update locations"
  ON public.locations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

CREATE POLICY "Admins can delete locations"
  ON public.locations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 5. PROFILES: allow sector_hr_admin to view all profiles (needed for task assignment)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'sector_hr_admin')
  );

-- 6. Tighten task INSERT and UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;

CREATE POLICY "Admins and HR can insert tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'sector_hr_admin')
  );

CREATE POLICY "Task stakeholders can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'sector_hr_admin')
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

-- 7. Tighten sub_tasks INSERT and UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert sub_tasks" ON public.sub_tasks;
DROP POLICY IF EXISTS "Authenticated users can update sub_tasks" ON public.sub_tasks;

CREATE POLICY "Authenticated users can insert sub_tasks"
  ON public.sub_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'sector_hr_admin')
    OR public.has_role(auth.uid(), 'responsible_person')
  );

CREATE POLICY "Task stakeholders can update sub_tasks"
  ON public.sub_tasks FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'sector_hr_admin')
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

-- 8. Tighten task_activity_log INSERT
DROP POLICY IF EXISTS "Authenticated users can insert activity_log" ON public.task_activity_log;

CREATE POLICY "Authenticated users can insert activity_log"
  ON public.task_activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 9. Tighten notifications INSERT
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'sector_hr_admin')
    OR auth.uid() = user_id
  );
