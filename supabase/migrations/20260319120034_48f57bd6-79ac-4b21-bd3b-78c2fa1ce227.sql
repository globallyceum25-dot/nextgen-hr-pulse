
-- Update employee ID generator to use EMP prefix
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(employee_id, '[^0-9]', '', 'g') AS integer)), 0) + 1 INTO next_num FROM public.employees WHERE employee_id ~ '\d+';
  NEW.employee_id := 'EMP' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

-- Update company code generator to use COM prefix
CREATE OR REPLACE FUNCTION public.generate_company_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(company_code, '[^0-9]', '', 'g') AS integer)), 0) + 1 INTO next_num FROM public.companies WHERE company_code ~ '\d+';
  NEW.company_code := 'COM' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

-- Update location code generator to use LOC prefix
CREATE OR REPLACE FUNCTION public.generate_location_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(location_code, '[^0-9]', '', 'g') AS integer)), 0) + 1 INTO next_num FROM public.locations WHERE location_code ~ '\d+';
  NEW.location_code := 'LOC' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

-- Update department code generator to use DEP prefix
CREATE OR REPLACE FUNCTION public.generate_department_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(department_code, '[^0-9]', '', 'g') AS integer)), 0) + 1 INTO next_num FROM public.departments WHERE department_code ~ '\d+';
  NEW.department_code := 'DEP' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

-- Update existing records with prefixes
UPDATE public.employees SET employee_id = 'EMP' || employee_id WHERE employee_id !~ '^EMP';
UPDATE public.companies SET company_code = 'COM' || company_code WHERE company_code !~ '^COM';
UPDATE public.locations SET location_code = 'LOC' || location_code WHERE location_code !~ '^LOC';
UPDATE public.departments SET department_code = 'DEP' || department_code WHERE department_code !~ '^DEP';
