
-- Create departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code text NOT NULL,
  department_name text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public can view departments" ON public.departments FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert departments" ON public.departments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update departments" ON public.departments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete departments" ON public.departments FOR DELETE TO public USING (true);

-- Auto-generate department_code
CREATE OR REPLACE FUNCTION public.generate_department_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(department_code AS integer)), 0) + 1 INTO next_num FROM public.departments WHERE department_code ~ '^\d+$';
  NEW.department_code := LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_department_code
  BEFORE INSERT ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_department_code();

-- updated_at trigger
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
