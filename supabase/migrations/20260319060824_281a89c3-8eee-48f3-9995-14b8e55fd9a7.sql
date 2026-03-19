
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL UNIQUE,
  employee_name text NOT NULL,
  company_name text NOT NULL DEFAULT 'NextGen Human Capital Solutions',
  location text,
  designation text,
  reporting_manager text,
  employment_status text NOT NULL DEFAULT 'Active',
  date_joined date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'sector_hr_admin'::app_role));

CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(employee_id AS integer)), 0) + 1 INTO next_num FROM public.employees;
  NEW.employee_id := LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_employee_id
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  WHEN (NEW.employee_id IS NULL OR NEW.employee_id = '')
  EXECUTE FUNCTION public.generate_employee_id();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
