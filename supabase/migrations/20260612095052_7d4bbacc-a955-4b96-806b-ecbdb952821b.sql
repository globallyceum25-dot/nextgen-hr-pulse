
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

  INSERT INTO public.rbac_audit_log (user_id, action, module, record_id, old_value, new_value)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_record_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rbac_audit_roles ON public.rbac_roles;
CREATE TRIGGER trg_rbac_audit_roles
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_roles
FOR EACH ROW EXECUTE FUNCTION public.rbac_audit_trigger();

DROP TRIGGER IF EXISTS trg_rbac_audit_role_perms ON public.rbac_role_permissions;
CREATE TRIGGER trg_rbac_audit_role_perms
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_role_permissions
FOR EACH ROW EXECUTE FUNCTION public.rbac_audit_trigger();

DROP TRIGGER IF EXISTS trg_rbac_audit_user_scopes ON public.rbac_user_scopes;
CREATE TRIGGER trg_rbac_audit_user_scopes
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_user_scopes
FOR EACH ROW EXECUTE FUNCTION public.rbac_audit_trigger();

DROP TRIGGER IF EXISTS trg_rbac_audit_field_perms ON public.rbac_field_permissions;
CREATE TRIGGER trg_rbac_audit_field_perms
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_field_permissions
FOR EACH ROW EXECUTE FUNCTION public.rbac_audit_trigger();

DROP TRIGGER IF EXISTS trg_rbac_audit_access_requests ON public.rbac_access_requests;
CREATE TRIGGER trg_rbac_audit_access_requests
AFTER INSERT OR UPDATE OR DELETE ON public.rbac_access_requests
FOR EACH ROW EXECUTE FUNCTION public.rbac_audit_trigger();
