import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type RbacModuleKey =
  | "dashboard" | "tasks" | "employees" | "sectors" | "companies" | "departments"
  | "locations" | "user_management" | "reports"
  | "documents" | "audit_logs" // retired modules — kept for existing grant rows
  | "admin" | "analytics"; // legacy aliases tolerated

export type RbacActionKey =
  | "view" | "create" | "edit" | "delete" | "deactivate"
  | "approve" | "export" | "upload" | "assign_access"
  | "create_subtask";

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
  roleIds: string[];
  roleKeys: string[];
  effectiveRoleKey: string | null;
  matrix: MatrixRow[];
  fields: FieldPerm[];
  legacyAdmin: boolean; // fallback for users with no rbac scope yet
}

const ROLE_PRIORITY = [
  "super_admin",
  "sector_hr_admin",
  "company_admin",
  "group_admin",
  "department_manager",
  "location_manager",
  "responsible_person",
  "data_entry_user",
  "employee_user",
  "viewer",
];

const getEffectiveRoleKey = (roleKeys: string[]): string | null => {
  for (const key of ROLE_PRIORITY) {
    if (roleKeys.includes(key)) return key;
  }
  return roleKeys[0] ?? null;
};

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

      const { data: assignedRoleRows } = legacyRoles.length > 0
        ? await supabase.from("rbac_roles")
          .select("id,role_key")
          .in("role_key", legacyRoles)
          .eq("status", "active")
        : { data: [] as Array<{ id: string; role_key: string }> };

      const assignedRoleIds = (assignedRoleRows ?? []).map(r => r.id);
      const assignedRoleKeys = (assignedRoleRows ?? []).map(r => r.role_key);

      const scopeRaw = scopeRes.data as unknown as
        | (Omit<ScopeRow, "role_key"> & { rbac_roles: { role_key: string } | null })
        | null;
      let scope: ScopeRow | null = scopeRaw ? {
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

      // Fallback display scope: if no rbac_user_scopes row exists, derive role from user_roles.
      // Actual access is always loaded from roleIds below, so the Permission Matrix is the source of truth.
      if (!scope && assignedRoleRows && assignedRoleRows.length > 0) {
        const roleKey = getEffectiveRoleKey(assignedRoleKeys) ?? assignedRoleRows[0].role_key;
        const roleRow = assignedRoleRows.find(r => r.role_key === roleKey) ?? assignedRoleRows[0];
        if (roleRow) {
          scope = {
            role_id: roleRow.id,
            role_key: roleRow.role_key,
            employee_id: null,
            company_ids: [], department_ids: [], location_ids: [],
            all_companies: true, all_departments: true, all_locations: true,
            status: "active",
          };
        }
      }

      const scopeIsActive = !!scope && scope.status === "active";
      const roleIds = Array.from(new Set([
        ...assignedRoleIds,
        ...(scopeIsActive && scope?.role_id ? [scope.role_id] : []),
      ]));
      const roleKeys = Array.from(new Set([
        ...assignedRoleKeys,
        ...(scopeIsActive && scope?.role_key ? [scope.role_key] : []),
      ]));
      const effectiveRoleKey = getEffectiveRoleKey(roleKeys);

      let matrix: MatrixRow[] = [];
      let fields: FieldPerm[] = [];

      if (roleIds.length > 0) {
        const [mRes, fRes] = await Promise.all([
          supabase.from("rbac_role_permissions")
            .select("granted, rbac_modules(module_key), rbac_permissions(permission_key)")
            .in("role_id", roleIds).eq("granted", true),
          supabase.from("rbac_field_permissions")
            .select("can_view,can_edit,field_key, rbac_modules(module_key)")
            .in("role_id", roleIds),
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

      return { userId: uid, scope, roleIds, roleKeys, effectiveRoleKey, matrix, fields, legacyAdmin };
    },
    staleTime: 15_000,
  });


  const state = query.data;

  const can = (moduleKey: RbacModuleKey, action: RbacActionKey = "view"): boolean => {
    if (!state) return false;
    // Super admin via legacy table OR via scope role
    if (state.legacyAdmin || state.roleKeys.includes("super_admin")) return true;
    if (state.roleIds.length === 0) {
      // No role assigned → deny by default (secure-by-default)
      return false;
    }
    const key = aliasModule(moduleKey);
    return state.matrix.some(r => r.module_key === key && r.permission_key === action);
  };

  const canViewField = (moduleKey: RbacModuleKey, fieldKey: string): boolean => {
    if (!state || state.legacyAdmin || state.roleKeys.includes("super_admin")) return true;
    const key = aliasModule(moduleKey);
    const rule = state.fields.find(f => f.module_key === key && f.field_key === fieldKey);
    return rule ? rule.can_view : true; // default: visible if no rule
  };

  const canEditField = (moduleKey: RbacModuleKey, fieldKey: string): boolean => {
    if (!state || state.legacyAdmin || state.roleKeys.includes("super_admin")) return true;
    const key = aliasModule(moduleKey);
    const rule = state.fields.find(f => f.module_key === key && f.field_key === fieldKey);
    return rule ? rule.can_edit : true;
  };

  /** Returns whether the user can access a record located in (companyName, departmentName, locationName).
   *  Resolved against the user's scope via name->id lookups.
   *  For role `employee_user`, the user can only access their own employee record. */
  const canAccessByName = (
    companyName: string | null | undefined,
    departmentName: string | null | undefined,
    locationName: string | null | undefined,
    lookups: { companies: Map<string, string>; departments: Map<string, string>; locations: Map<string, string> },
    employeeId?: string | null
  ): boolean => {
    if (!state || state.legacyAdmin || state.roleKeys.includes("super_admin")) return true;
    if (!state.scope) return true;
    const s = state.scope;
    if (s.role_key === "employee_user") {
      if (!s.employee_id) return false;
      if (employeeId !== undefined && employeeId !== s.employee_id) return false;
    }
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

  const canAccessEmployeeId = (employeeId: string | null | undefined): boolean => {
    if (!state || state.legacyAdmin || state.roleKeys.includes("super_admin")) return true;
    if (!state.scope) return true;
    if (state.scope.role_key === "employee_user") {
      return !!employeeId && employeeId === state.scope.employee_id;
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
    canAccessEmployeeId,
    isSuperAdmin: !!state?.legacyAdmin || !!state?.roleKeys.includes("super_admin"),
    roleKey: state?.effectiveRoleKey ?? state?.scope?.role_key ?? null,
    roleKeys: state?.roleKeys ?? [],
    ownEmployeeId: state?.scope?.employee_id ?? null,
  };
}
