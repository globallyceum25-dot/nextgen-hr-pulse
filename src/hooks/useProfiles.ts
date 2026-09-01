import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

/**
 * The profile directory. Readable by EVERY authenticated user via the
 * "Authenticated users can view profiles" policy (migration 20260819010000),
 * unlike public.employees which requires the employees:view permission.
 */
export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,user_id,full_name,email");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: 60_000,
  });
}

/** handle_new_user() seeds profiles.full_name with the email, so a "name" may be one. */
const isRealName = (v?: string | null): boolean =>
  !!v && v.trim() !== "" && !v.includes("@");

export interface CurrentUser {
  userId: string | null;
  email: string | null;
  fullName: string | null;
}

/**
 * The signed-in user's identity, resolved from central auth plus the profile
 * directory — never from public.employees (RLS-restricted) and never from local
 * storage, so behaviour is identical on every device.
 */
export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  return useQuery<CurrentUser>({
    queryKey: ["current-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,email")
        .eq("user_id", userId!)
        .maybeSingle();

      const metaName = user?.user_metadata?.full_name as string | undefined;
      const fullName = isRealName(profile?.full_name)
        ? profile!.full_name!.trim()
        : isRealName(metaName)
          ? metaName!.trim()
          : null;

      return {
        userId: userId ?? null,
        email: (profile?.email || user?.email || "").toLowerCase() || null,
        fullName,
      };
    },
    staleTime: 60_000,
  });
}
