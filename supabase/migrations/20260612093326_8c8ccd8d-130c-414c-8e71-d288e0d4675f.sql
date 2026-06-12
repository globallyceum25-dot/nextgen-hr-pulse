
REVOKE EXECUTE ON FUNCTION public.rbac_has_permission(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rbac_user_company_scope(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rbac_user_department_scope(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rbac_user_location_scope(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rbac_can_access_record(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rbac_has_permission(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rbac_user_company_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rbac_user_department_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rbac_user_location_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rbac_can_access_record(uuid, uuid, uuid, uuid) TO authenticated, service_role;
