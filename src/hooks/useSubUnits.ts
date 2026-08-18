import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubUnit {
  id: string;
  sub_unit_name: string;
  sector_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useSubUnits() {
  return useQuery({
    queryKey: ["sub_units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_units")
        .select("*")
        .order("sub_unit_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubUnit[];
    },
  });
}

export interface SubUnitEntity {
  id: string;
  entity_name: string;
  sub_unit_id: string | null;
  sector_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useSubUnitEntities() {
  return useQuery({
    queryKey: ["sub_unit_entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_unit_entities")
        .select("*")
        .order("entity_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubUnitEntity[];
    },
  });
}
