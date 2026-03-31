import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AppRole,
  Module,
  Action,
  getEffectiveRole,
  canAccessModule,
  canPerformAction,
} from "@/config/rbac";

interface UseUserRoleReturn {
  role: AppRole;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  can: (module: Module, action?: Action) => boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!cancelled) {
        const userRoles = (data?.map(r => r.role) ?? []) as AppRole[];
        setRoles(userRoles);
        setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  const effectiveRole = getEffectiveRole(roles);

  const can = useCallback(
    (module: Module, action?: Action) => {
      if (action) return canPerformAction(effectiveRole, module, action);
      return canAccessModule(effectiveRole, module);
    },
    [effectiveRole]
  );

  const adminRoles: AppRole[] = ["super_admin", "sector_hr_admin"];
  const isAdmin = roles.some(r => adminRoles.includes(r));

  return { role: effectiveRole, roles, isAdmin, loading, can };
}

/** Backward-compatible hook */
export function useIsAdmin() {
  const { isAdmin, loading } = useUserRole();
  return { isAdmin, loading };
}
