
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'All Sectors',
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_applies_to_chk;
ALTER TABLE public.departments
  ADD CONSTRAINT departments_applies_to_chk
  CHECK (applies_to IN ('All Sectors', 'Other Sectors Only'));

UPDATE public.tasks SET department_id = NULL WHERE department_id IS NOT NULL;

DELETE FROM public.departments;

ALTER TABLE public.departments DISABLE TRIGGER set_department_code;

INSERT INTO public.departments (department_code, department_name, applies_to, description, status)
VALUES
  ('DEPT001','HR BP / Lead','All Sectors','Strategic HR business partner and department lead. In LEDU this role has elevated oversight across all departments.','Active'),
  ('DEPT002','HR Operations','All Sectors','Day-to-day HR administration including contracts, attendance, probation reviews, and staff records.','Active'),
  ('DEPT003','L&D / TM','All Sectors','Learning & Development and Talent Management. Covers induction, training plans, succession planning, and talent reviews.','Active'),
  ('DEPT004','Services & Engagement','All Sectors','Employee experience, welfare programmes, engagement events, and internal recognition initiatives.','Active'),
  ('DEPT005','Recruitment (Centralised)','All Sectors','Centralised recruitment function covering job postings, screening, offers, and onboarding across all locations.','Active'),
  ('DEPT006','Payroll (Centralised)','All Sectors','Centralised payroll processing including EPF/ETF, statutory deductions, and pay query management.','Active'),
  ('DEPT007','HR Systems & Compliance','Other Sectors Only','HRIS data governance, system access control, audit readiness, and regulatory compliance including PDPA. This department does not exist in LEDU — Education Sector.','Active');

ALTER TABLE public.departments ENABLE TRIGGER set_department_code;
