import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AppRole,
  Module,
  Action,
  canAccessModule,
  canPerformAction,
} from "@/config/rbac";

// Full RBAC role vocabulary (matches rbac_roles.role_key), highest privilege first.
// The displayed role must reflect whatever the super admin assigned — NOT be collapsed
// to the 4 legacy roles (which previously turned every modern role into "viewer").
const ROLE_PRIORITY = [
  "super_admin",
  "sector_hr_admin",
  "group_admin",
  "company_admin",
  "department_manager",
  "location_manager",
  "responsible_person",
  "data_entry_user",
  "employee_user",
  "viewer",
];

const getEffectiveRoleKey = (keys: string[]): string => {
  for (const k of ROLE_PRIORITY) if (keys.includes(k)) return k;
  return keys[0] ?? "viewer";
};

// Map an arbitrary role key to the nearest legacy AppRole, used only for the
// backward-compatible can()/module helpers. Access is authoritatively decided by
// the RBAC permission matrix in usePermissions().
const toLegacyRole = (key: string): AppRole => {
  if (key === "super_admin" || key === "sector_hr_admin") return key;
  if (["group_admin", "company_admin", "department_manager", "location_manager", "responsible_person"].includes(key))
    return "responsible_person";
  return "viewer";
};

interface UseUserRoleReturn {
  role: string;
  roles: string[];
  isAdmin: boolean;
  loading: boolean;
  can: (module: Module, action?: Action) => boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Read the role from BOTH systems the super admin can assign through:
      //   - user_roles (legacy enum, written by "Assign User to Role")
      //   - rbac_user_scopes → rbac_roles.role_key (the RBAC matrix system)
      // so the displayed role always matches the assignment.
      const [legacyRes, scopeRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("rbac_user_scopes")
          .select("status, rbac_roles(role_key)")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const legacy = (legacyRes.data?.map((r) => r.role as string) ?? []);
      const scopeRow = scopeRes.data as unknown as
        | { status: string; rbac_roles: { role_key: string } | null }
        | null;
      const scopeKey =
        scopeRow && scopeRow.status === "active" ? scopeRow.rbac_roles?.role_key : undefined;

      const merged = Array.from(new Set([...legacy, ...(scopeKey ? [scopeKey] : [])]));

      if (!cancelled) {
        setRoles(merged);
      }
    }

    // Always clear the loading flag, even if the lookup rejects. Without this a
    // network error left `loading` true forever and every consumer — including
    // the profile page — rendered its loading state indefinitely.
    check()
      .catch(() => { if (!cancelled) setRoles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const effectiveRole = getEffectiveRoleKey(roles);

  const can = useCallback(
    (module: Module, action?: Action) => {
      const legacyRole = toLegacyRole(effectiveRole);
      if (action) return canPerformAction(legacyRole, module, action);
      return canAccessModule(legacyRole, module);
    },
    [effectiveRole]
  );

  const adminRoles = ["super_admin", "sector_hr_admin"];
  const isAdmin = roles.some((r) => adminRoles.includes(r));

  return { role: effectiveRole, roles, isAdmin, loading, can };
}

/** Backward-compatible hook */
export function useIsAdmin() {
  const { isAdmin, loading } = useUserRole();
  return { isAdmin, loading };
}
