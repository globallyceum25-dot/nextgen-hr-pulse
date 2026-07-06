import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Location {
  id: string;
  location_code: string;
  location_name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
  company_id: string | null;
  sector_id: string | null;
  sub_unit_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("location_code", { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useAddLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: { location_name: string; address?: string | null; city?: string | null; country?: string | null; status?: string; company_id?: string | null; sector_id?: string | null; sub_unit_id?: string | null }) => {
      const { data, error } = await supabase.from("locations").insert([{ location_name: loc.location_name, address: loc.address, city: loc.city, country: loc.country, status: loc.status, company_id: loc.company_id, sector_id: loc.sector_id ?? null, sub_unit_id: loc.sub_unit_id ?? null } as any]).select().single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Location> & { id: string }) => {
      const { data, error } = await supabase.from("locations").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}
