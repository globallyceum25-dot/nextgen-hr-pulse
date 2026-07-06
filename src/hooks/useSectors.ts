import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Sector {
  id: string;
  sector_code: string | null;
  name: string;
  sector_type: string | null; // 'LEDU' | 'Other Sectors'
  company_id: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sectors")
        .select("*")
        .order("sector_code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Sector[];
    },
  });
}

export function useAddSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<Sector> & { name: string }) => {
      const { data, error } = await supabase
        .from("sectors")
        .insert([{ name: s.name, sector_code: s.sector_code ?? null, sector_type: s.sector_type ?? null, company_id: s.company_id ?? null, status: s.status ?? "Active", is_active: true } as any])
        .select().single();
      if (error) throw error;
      return data as Sector;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sectors"] }),
  });
}

export function useUpdateSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sector> & { id: string }) => {
      const { data, error } = await supabase.from("sectors").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Sector;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sectors"] }),
  });
}

export function useDeleteSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sectors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sectors"] }),
  });
}
