
-- 1. Clear FK references before resetting sub_units & locations
UPDATE public.employees SET sub_unit_id = NULL WHERE sub_unit_id IS NOT NULL;
UPDATE public.tasks SET sub_unit_id = NULL, location_id = NULL WHERE sub_unit_id IS NOT NULL OR location_id IS NOT NULL;

DELETE FROM public.locations;
DELETE FROM public.sub_units;

-- 2. Re-seed the 3 canonical LEDU sub-units
INSERT INTO public.sub_units (sub_unit_name, sector_id, status)
SELECT n, s.id, 'Active'
FROM public.sectors s
CROSS JOIN (VALUES ('Lyceum Schools'), ('Early Childhood'), ('Higher Education')) AS t(n)
WHERE s.sector_code = 'SEC001';

-- 3. sub_unit_entities table
CREATE TABLE IF NOT EXISTS public.sub_unit_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  sub_unit_id UUID REFERENCES public.sub_units(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id),
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sub_unit_id, entity_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_unit_entities TO authenticated;
GRANT ALL ON public.sub_unit_entities TO service_role;

ALTER TABLE public.sub_unit_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_unit_entities_read_all_auth" ON public.sub_unit_entities;
CREATE POLICY "sub_unit_entities_read_all_auth"
  ON public.sub_unit_entities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sub_unit_entities_admin_manage" ON public.sub_unit_entities;
CREATE POLICY "sub_unit_entities_admin_manage"
  ON public.sub_unit_entities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS sub_unit_entities_updated_at ON public.sub_unit_entities;
CREATE TRIGGER sub_unit_entities_updated_at
  BEFORE UPDATE ON public.sub_unit_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Extend locations & tasks with sub_unit_entity_id
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS sub_unit_entity_id UUID REFERENCES public.sub_unit_entities(id);
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sub_unit_entity_id UUID REFERENCES public.sub_unit_entities(id);

-- 5. Seed 9 sub-unit entities
INSERT INTO public.sub_unit_entities (entity_name, sub_unit_id, sector_id)
SELECT t.n, su.id, su.sector_id
FROM public.sub_units su
CROSS JOIN (VALUES ('Lyceum Leaf School'), ('Lyceum Daycare')) t(n)
WHERE su.sub_unit_name = 'Early Childhood';

INSERT INTO public.sub_unit_entities (entity_name, sub_unit_id, sector_id)
SELECT t.n, su.id, su.sector_id
FROM public.sub_units su
CROSS JOIN (VALUES
  ('Lyceum Placements'), ('Placements - LIS'), ('Lyceum Campus'),
  ('Lyceum Assessments'), ('Lyceum Education'), ('JBD'), ('The Lyceum Academy')
) t(n)
WHERE su.sub_unit_name = 'Higher Education';

-- 6. Seed 26 locations with explicit LOC0xx codes (disable auto-code trigger)
ALTER TABLE public.locations DISABLE TRIGGER trg_generate_location_code;

-- 10 Lyceum Schools campuses
INSERT INTO public.locations (location_code, location_name, sector_id, sub_unit_id, status)
SELECT 'LOC' || LPAD(rn::text, 3, '0'), name,
  (SELECT id FROM public.sectors WHERE sector_code = 'SEC001'),
  (SELECT id FROM public.sub_units WHERE sub_unit_name = 'Lyceum Schools'),
  'Active'
FROM (VALUES
  (1,'Central Services (LIS)'),(2,'Nugegoda'),(3,'Panadura'),(4,'Katunayake'),
  (5,'Wattala'),(6,'Awissawella'),(7,'Rathnapura'),(8,'Anuradhapura'),
  (9,'Kurunagala'),(10,'Nuwaraeliya')
) t(rn, name);

-- 2 Early Childhood entities
INSERT INTO public.locations (location_code, location_name, sector_id, sub_unit_id, sub_unit_entity_id, status)
SELECT 'LOC' || LPAD(rn::text, 3, '0'), name,
  (SELECT id FROM public.sectors WHERE sector_code = 'SEC001'),
  (SELECT id FROM public.sub_units WHERE sub_unit_name = 'Early Childhood'),
  (SELECT id FROM public.sub_unit_entities WHERE entity_name = name),
  'Active'
FROM (VALUES (11,'Lyceum Leaf School'), (12,'Lyceum Daycare')) t(rn, name);

-- 7 Higher Education entities
INSERT INTO public.locations (location_code, location_name, sector_id, sub_unit_id, sub_unit_entity_id, status)
SELECT 'LOC' || LPAD(rn::text, 3, '0'), name,
  (SELECT id FROM public.sectors WHERE sector_code = 'SEC001'),
  (SELECT id FROM public.sub_units WHERE sub_unit_name = 'Higher Education'),
  (SELECT id FROM public.sub_unit_entities WHERE entity_name = name),
  'Active'
FROM (VALUES
  (13,'Lyceum Placements'),(14,'Placements - LIS'),(15,'Lyceum Campus'),
  (16,'Lyceum Assessments'),(17,'Lyceum Education'),(18,'JBD'),(19,'The Lyceum Academy')
) t(rn, name);

-- 7 Other-sector HQs
INSERT INTO public.locations (location_code, location_name, sector_id, status)
SELECT 'LOC' || LPAD(rn::text, 3, '0'), name,
  (SELECT id FROM public.sectors WHERE sector_code = code), 'Active'
FROM (VALUES
  (20,'Lyceum Global Holdings HQ','SEC002'),
  (21,'Heracle Holdings HQ','SEC003'),
  (22,'Build Holdings HQ','SEC004'),
  (23,'Speed Holdings HQ','SEC005'),
  (24,'NCG Tech Holdings HQ','SEC006'),
  (25,'NCG KIT Holdings HQ','SEC007'),
  (26,'NCG Read Holdings HQ','SEC008')
) t(rn, name, code);

ALTER TABLE public.locations ENABLE TRIGGER trg_generate_location_code;
