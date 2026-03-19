import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!cancelled) {
        const adminRoles = ["super_admin", "sector_hr_admin"];
        setIsAdmin(roles?.some(r => adminRoles.includes(r.role)) ?? false);
        setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return { isAdmin, loading };
}
