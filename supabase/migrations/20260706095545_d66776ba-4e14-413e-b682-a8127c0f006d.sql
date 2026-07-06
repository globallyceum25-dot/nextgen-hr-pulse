
-- ============================================================
-- PART 6: SCHEMA EXTENSIONS FOR NEXTGEN HCS ORG STRUCTURE
-- Additive only. No drops. Preserves existing data.
-- ============================================================

-- 1) Extend sectors (existing table has id, name, is_active)
ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS sector_code text,
  ADD COLUMN IF NOT EXISTS sector_type text,
  ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'Active';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sectors_sector_type_chk') THEN
    ALTER TABLE public.sectors
      ADD CONSTRAINT sectors_sector_type_chk CHECK (sector_type IN ('LEDU','Other Sectors'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS sectors_sector_code_uidx ON public.sectors(sector_code);

-- 2) Create sub_units
CREATE TABLE IF NOT EXISTS public.sub_units (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_unit_name text NOT NULL,
  sector_id     uuid REFERENCES public.sectors(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'Active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_units TO authenticated;
GRANT ALL ON public.sub_units TO service_role;
ALTER TABLE public.sub_units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sub_units' AND policyname='sub_units_read_all_auth') THEN
    CREATE POLICY sub_units_read_all_auth ON public.sub_units FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sub_units' AND policyname='sub_units_admin_manage') THEN
    CREATE POLICY sub_units_admin_manage ON public.sub_units FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS sub_units_updated_at ON public.sub_units;
CREATE TRIGGER sub_units_updated_at BEFORE UPDATE ON public.sub_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Extend locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS sub_unit_id uuid REFERENCES public.sub_units(id),
  ADD COLUMN IF NOT EXISTS sector_id   uuid REFERENCES public.sectors(id);

-- 4) Extend departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS sector_type text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_sector_type_chk') THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_sector_type_chk CHECK (sector_type IS NULL OR sector_type IN ('LEDU','Other Sectors'));
  END IF;
END $$;

-- 5) Extend tasks (only sub_unit_id missing)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sub_unit_id uuid REFERENCES public.sub_units(id);

-- 6) Extend employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS sector_id   uuid REFERENCES public.sectors(id),
  ADD COLUMN IF NOT EXISTS sub_unit_id uuid REFERENCES public.sub_units(id);

-- ============================================================
-- SEED: parent company + 8 sectors + 3 sub_units
-- ============================================================

-- Ensure parent company exists
INSERT INTO public.companies (company_code, company_name, status)
SELECT 'COM001', 'NextGen Human Capital Solutions', 'Active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE company_name = 'NextGen Human Capital Solutions'
);

-- Seed sectors (upsert by sector_code)
WITH parent AS (
  SELECT id FROM public.companies WHERE company_name = 'NextGen Human Capital Solutions' LIMIT 1
)
INSERT INTO public.sectors (sector_code, name, sector_type, company_id, status, is_active)
SELECT v.sector_code, v.name, v.sector_type, parent.id, 'Active', true
FROM parent, (VALUES
  ('SEC001', 'LEDU — Education Sector',   'LEDU'),
  ('SEC002', 'Lyceum Global Holdings',    'Other Sectors'),
  ('SEC003', 'Heracle Holdings',          'Other Sectors'),
  ('SEC004', 'Build Holdings',            'Other Sectors'),
  ('SEC005', 'Speed Holdings',            'Other Sectors'),
  ('SEC006', 'NCG Tech Holdings',         'Other Sectors'),
  ('SEC007', 'NCG KIT Holdings',          'Other Sectors'),
  ('SEC008', 'NCG Read Holdings',         'Other Sectors')
) AS v(sector_code, name, sector_type)
ON CONFLICT (sector_code) DO UPDATE
  SET name = EXCLUDED.name,
      sector_type = EXCLUDED.sector_type,
      company_id = EXCLUDED.company_id,
      status = EXCLUDED.status,
      is_active = true;

-- Seed sub_units under LEDU
INSERT INTO public.sub_units (sub_unit_name, sector_id)
SELECT v.name, s.id
FROM public.sectors s
CROSS JOIN (VALUES ('Lyceum Schools'), ('Early Childhood'), ('Higher Education')) AS v(name)
WHERE s.sector_code = 'SEC001'
  AND NOT EXISTS (
    SELECT 1 FROM public.sub_units su
    WHERE su.sector_id = s.id AND su.sub_unit_name = v.name
  );
