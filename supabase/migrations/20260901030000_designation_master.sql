-- Designation Master.
--
-- WHY
-- Designations were a hardcoded array in the frontend (DESIGNATIONS in Employees.tsx),
-- so HR could not add or rename one without a code change, and the Employee Master's
-- Designation dropdown could never reflect the organisation's real job titles.
--
-- WHAT
-- A designations master table alongside the other masters (companies, locations,
-- departments), with the same auto-generated code pattern (DES001, DES002, ...) and
-- the same access rules as departments.
--
-- Seeding preserves existing data: every designation already present on an employee
-- record is carried over, so no employee loses their designation.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1) Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation_code text NOT NULL,
  designation_name text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2) Auto-generated code: DES001, DES002, ...
--    Mirrors public.generate_department_code().
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_designation_code()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE next_num integer;
BEGIN
  IF NEW.designation_code IS NOT NULL AND btrim(NEW.designation_code) <> '' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(designation_code, '[^0-9]', '', 'g') AS integer)), 0) + 1
  INTO next_num
  FROM public.designations
  WHERE designation_code ~ '\d+';
  NEW.designation_code := 'DES' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_designation_code ON public.designations;
CREATE TRIGGER set_designation_code
  BEFORE INSERT ON public.designations
  FOR EACH ROW EXECUTE FUNCTION public.generate_designation_code();

-- Keep updated_at fresh, as the other masters do.
DROP TRIGGER IF EXISTS trg_designations_updated ON public.designations;
CREATE TRIGGER trg_designations_updated
  BEFORE UPDATE ON public.designations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) Access: same rules as public.departments
-- ============================================================
DROP POLICY IF EXISTS "Public can view designations" ON public.designations;
CREATE POLICY "Public can view designations" ON public.designations
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert designations" ON public.designations;
CREATE POLICY "Public can insert designations" ON public.designations
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update designations" ON public.designations;
CREATE POLICY "Public can update designations" ON public.designations
  FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete designations" ON public.designations;
CREATE POLICY "Public can delete designations" ON public.designations
  FOR DELETE TO public USING (true);

-- ============================================================
-- 4) Seed: the previously hardcoded list, plus every designation already
--    in use on an employee record so nothing is lost.
-- ============================================================
INSERT INTO public.designations (designation_code, designation_name, status)
SELECT '', v.name, 'Active'
FROM (VALUES
  ('HR Executive'), ('HR Manager'), ('Senior HR Executive'), ('HR Assistant'),
  ('Payroll Officer'), ('Recruitment Specialist'), ('Training Coordinator'),
  ('Compliance Officer'), ('HR Intern')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.designations d
  WHERE lower(btrim(d.designation_name)) = lower(btrim(v.name))
);

INSERT INTO public.designations (designation_code, designation_name, status)
SELECT DISTINCT '', btrim(e.designation), 'Active'
FROM public.employees e
WHERE e.designation IS NOT NULL
  AND btrim(e.designation) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.designations d
    WHERE lower(btrim(d.designation_name)) = lower(btrim(e.designation))
  );
