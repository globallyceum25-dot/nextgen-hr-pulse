
-- Change master-data FKs to ON DELETE SET NULL so deletes cascade cleanly
ALTER TABLE public.tasks DROP CONSTRAINT tasks_sector_id_fkey,
  ADD CONSTRAINT tasks_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_department_id_fkey,
  ADD CONSTRAINT tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_company_id_fkey,
  ADD CONSTRAINT tasks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_location_id_fkey,
  ADD CONSTRAINT tasks_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_sub_unit_id_fkey,
  ADD CONSTRAINT tasks_sub_unit_id_fkey FOREIGN KEY (sub_unit_id) REFERENCES public.sub_units(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_sub_unit_entity_id_fkey,
  ADD CONSTRAINT tasks_sub_unit_entity_id_fkey FOREIGN KEY (sub_unit_entity_id) REFERENCES public.sub_unit_entities(id) ON DELETE SET NULL;

ALTER TABLE public.employees DROP CONSTRAINT employees_sector_id_fkey,
  ADD CONSTRAINT employees_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;
ALTER TABLE public.employees DROP CONSTRAINT employees_sub_unit_id_fkey,
  ADD CONSTRAINT employees_sub_unit_id_fkey FOREIGN KEY (sub_unit_id) REFERENCES public.sub_units(id) ON DELETE SET NULL;

ALTER TABLE public.sectors DROP CONSTRAINT sectors_company_id_fkey,
  ADD CONSTRAINT sectors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.locations DROP CONSTRAINT locations_company_id_fkey,
  ADD CONSTRAINT locations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.locations DROP CONSTRAINT locations_sector_id_fkey,
  ADD CONSTRAINT locations_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;
ALTER TABLE public.locations DROP CONSTRAINT locations_sub_unit_id_fkey,
  ADD CONSTRAINT locations_sub_unit_id_fkey FOREIGN KEY (sub_unit_id) REFERENCES public.sub_units(id) ON DELETE SET NULL;
ALTER TABLE public.locations DROP CONSTRAINT locations_sub_unit_entity_id_fkey,
  ADD CONSTRAINT locations_sub_unit_entity_id_fkey FOREIGN KEY (sub_unit_entity_id) REFERENCES public.sub_unit_entities(id) ON DELETE SET NULL;

ALTER TABLE public.departments DROP CONSTRAINT departments_company_id_fkey,
  ADD CONSTRAINT departments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.sub_unit_entities DROP CONSTRAINT sub_unit_entities_sector_id_fkey,
  ADD CONSTRAINT sub_unit_entities_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE CASCADE;
