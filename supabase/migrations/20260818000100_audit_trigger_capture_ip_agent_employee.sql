-- Populate the rbac_audit_log columns that were being written as NULL.
--
-- rbac_audit_trigger() (migration 20260612095052) inserts only
--   (user_id, action, module, record_id, old_value, new_value)
-- so ip_address, user_agent and employee_id were never written. The Access
-- Control > Audit Logs screen already had an IP column, and it always rendered
-- "—"; the same would be true of the Employee and Device columns.
--
-- PostgREST exposes the HTTP request headers to SQL via the `request.headers`
-- GUC, so the trigger can read the caller's user-agent and forwarded IP.
-- Both lookups use the missing_ok form of current_setting and are wrapped so a
-- non-HTTP caller (psql, a migration, the service role) still audits cleanly
-- rather than failing the write it is attached to.
--
-- employee_id is resolved by matching the acting auth user's email to an
-- employees row, which is the same correspondence the app already relies on.

CREATE OR REPLACE FUNCTION public.rbac_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_record_id text;
  v_old jsonb;
  v_new jsonb;
  v_headers jsonb;
  v_ip text;
  v_agent text;
  v_employee_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := TG_TABLE_NAME || '.created';
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id::text, NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := TG_TABLE_NAME || '.updated';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id::text, OLD.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := TG_TABLE_NAME || '.deleted';
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := COALESCE(OLD.id::text, NULL);
  END IF;

  -- Request context. Absent for non-HTTP callers; never fatal.
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  IF v_headers IS NOT NULL THEN
    v_agent := v_headers ->> 'user-agent';
    -- x-forwarded-for may be a comma-separated chain; the client is the first hop.
    v_ip := split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1);
    v_ip := NULLIF(btrim(v_ip), '');
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT e.id INTO v_employee_id
    FROM public.employees e
    JOIN auth.users u ON lower(u.email) = lower(e.email)
    WHERE u.id = auth.uid()
    LIMIT 1;
  END IF;

  INSERT INTO public.rbac_audit_log
    (user_id, employee_id, action, module, record_id, old_value, new_value, ip_address, user_agent)
  VALUES
    (auth.uid(), v_employee_id, v_action, TG_TABLE_NAME, v_record_id, v_old, v_new, v_ip, v_agent);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
