import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type RbacModuleKey =
  | "dashboard" | "tasks" | "employees" | "companies" | "departments"
  | "locations" | "user_management" | "reports" | "documents" | "audit_logs"
  | "admin" | "analytics"; // legacy aliases tolerated

export type RbacActionKey =
  | "view" | "create" | "edit" | "delete" | "deactivate"
  | "approve" | "export" | "upload" | "assign_access";

interface MatrixRow {
  module_key: string;
  permission_key: string;
  granted: boolean;
}

interface ScopeRow {
  role_id: string | null;
  role_key: string | null;
  employee_id: string | null;
  company_ids: string[];
  department_ids: string[];
  location_ids: string[];
  all_companies: boolean;
  all_departments: boolean;
  all_locations: boolean;
  status: string;
}

export interface FieldPerm {
  module_key: string;
  field_key: string;
  can_view: boolean;
  can_edit: boolean;
}

interface PermissionState {
  userId: string | null;
  scope: ScopeRow | null;
  matrix: MatrixRow[];
  fields: FieldPerm[];
  legacyAdmin: boolean; // fallback for users with no rbac scope yet
}

// Legacy module aliases → new module keys
const aliasModule = (m: string): string => {
  if (m === "analytics") return "dashboard";
  if (m === "admin") return "user_management";
  return m;
};

export function usePermissions() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery<PermissionState>({
    queryKey: ["rbac-permissions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const uid = userId!;
      const [scopeRes, legacyRolesRes] = await Promise.all([
        supabase.from("rbac_user_scopes")
          .select("role_id,employee_id,company_ids,department_ids,location_ids,all_companies,all_departments,all_locations,status,rbac_roles(role_key)")
          .eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      const legacyRoles = (legacyRolesRes.data ?? []).map((r: { role: string }) => r.role);
      const legacyAdmin = legacyRoles.includes("super_admin");

      const scopeRaw = scopeRes.data as unknown as
        | (Omit<ScopeRow, "role_key"> & { rbac_roles: { role_key: string } | null })
        | null;
      const scope: ScopeRow | null = scopeRaw ? {
        role_id: scopeRaw.role_id,
        role_key: scopeRaw.rbac_roles?.role_key ?? null,
        employee_id: scopeRaw.employee_id,
        company_ids: scopeRaw.company_ids ?? [],
        department_ids: scopeRaw.department_ids ?? [],
        location_ids: scopeRaw.location_ids ?? [],
        all_companies: scopeRaw.all_companies,
        all_departments: scopeRaw.all_departments,
        all_locations: scopeRaw.all_locations,
        status: scopeRaw.status,
      } : null;

      let matrix: MatrixRow[] = [];
      let fields: FieldPerm[] = [];

      if (scope?.role_id) {
        const [mRes, fRes] = await Promise.all([
          supabase.from("rbac_role_permissions")
            .select("granted, rbac_modules(module_key), rbac_permissions(permission_key)")
            .eq("role_id", scope.role_id).eq("granted", true),
          supabase.from("rbac_field_permissions")
            .select("can_view,can_edit,field_key, rbac_modules(module_key)")
            .eq("role_id", scope.role_id),
        ]);

        matrix = ((mRes.data ?? []) as unknown as Array<{
          granted: boolean;
          rbac_modules: { module_key: string } | null;
          rbac_permissions: { permission_key: string } | null;
        }>).map(r => ({
          granted: r.granted,
          module_key: r.rbac_modules?.module_key ?? "",
          permission_key: r.rbac_permissions?.permission_key ?? "",
        })).filter(r => r.module_key && r.permission_key);

        fields = ((fRes.data ?? []) as unknown as Array<{
          can_view: boolean; can_edit: boolean; field_key: string;
          rbac_modules: { module_key: string } | null;
        }>).map(r => ({
          can_view: r.can_view, can_edit: r.can_edit, field_key: r.field_key,
          module_key: r.rbac_modules?.module_key ?? "",
        }));
      }

      return { userId: uid, scope, matrix, fields, legacyAdmin };
    },
    staleTime: 60_000,
  });

  const state = query.data;

  const can = (moduleKey: RbacModuleKey, action: RbacActionKey = "view"): boolean => {
    if (!state) return false;
    // Super admin via legacy table OR via scope role
    if (state.legacyAdmin) return true;
    if (state.scope?.role_key === "super_admin") return true;
    if (!state.scope) {
      // No RBAC scope assigned → allow view for everything (read-only baseline), block writes
      return action === "view";
    }
    const key = aliasModule(moduleKey);
    return state.matrix.some(r => r.module_key === key && r.permission_key === action);
  };

  const canViewField = (moduleKey: RbacModuleKey, fieldKey: string): boolean => {
    if (!state || state.legacyAdmin || state.scope?.role_key === "super_admin") return true;
    const key = aliasModule(moduleKey);
    const rule = state.fields.find(f => f.module_key === key && f.field_key === fieldKey);
    return rule ? rule.can_view : true; // default: visible if no rule
  };

  const canEditField = (moduleKey: RbacModuleKey, fieldKey: string): boolean => {
    if (!state || state.legacyAdmin || state.scope?.role_key === "super_admin") return true;
    const key = aliasModule(moduleKey);
    const rule = state.fields.find(f => f.module_key === key && f.field_key === fieldKey);
    return rule ? rule.can_edit : true;
  };

  /** Returns whether the user can access a record located in (companyName, departmentName, locationName).
   *  These are matched against the user's scope by resolving names to ids via the provided lookup maps. */
  const canAccessByName = (
    companyName: string | null | undefined,
    departmentName: string | null | undefined,
    locationName: string | null | undefined,
    lookups: { companies: Map<string, string>; departments: Map<string, string>; locations: Map<string, string> }
  ): boolean => {
    if (!state || state.legacyAdmin || state.scope?.role_key === "super_admin") return true;
    if (!state.scope) return true;
    const s = state.scope;
    if (!s.all_companies && companyName) {
      const id = lookups.companies.get(companyName.trim().toLowerCase());
      if (!id || !s.company_ids.includes(id)) return false;
    }
    if (!s.all_departments && departmentName) {
      const id = lookups.departments.get(departmentName.trim().toLowerCase());
      if (!id || !s.department_ids.includes(id)) return false;
    }
    if (!s.all_locations && locationName) {
      const id = lookups.locations.get(locationName.trim().toLowerCase());
      if (!id || !s.location_ids.includes(id)) return false;
    }
    return true;
  };

  return {
    loading: query.isLoading,
    state,
    can,
    canViewField,
    canEditField,
    canAccessByName,
    isSuperAdmin: !!state?.legacyAdmin || state?.scope?.role_key === "super_admin",
    roleKey: state?.scope?.role_key ?? null,
  };
}
