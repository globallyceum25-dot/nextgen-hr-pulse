
-- Auto-generate company_id
ALTER TABLE public.companies ADD COLUMN company_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_company_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(company_code AS integer)), 0) + 1 INTO next_num FROM public.companies WHERE company_code ~ '^\d+$';
  NEW.company_code := LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_company_code BEFORE INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION generate_company_code();

-- Update existing rows
UPDATE public.companies SET company_code = '001' WHERE company_code IS NULL;
ALTER TABLE public.companies ALTER COLUMN company_code SET NOT NULL;

-- Auto-generate location_id
ALTER TABLE public.locations ADD COLUMN location_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_location_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(location_code AS integer)), 0) + 1 INTO next_num FROM public.locations WHERE location_code ~ '^\d+$';
  NEW.location_code := LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_location_code BEFORE INSERT ON public.locations FOR EACH ROW EXECUTE FUNCTION generate_location_code();

-- Update existing rows
DO $$
DECLARE r RECORD; i integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.locations ORDER BY created_at LOOP
    i := i + 1;
    UPDATE public.locations SET location_code = LPAD(i::text, 3, '0') WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.locations ALTER COLUMN location_code SET NOT NULL;
