import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Designation {
  id: string;
  designation_code: string;
  designation_name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useDesignations() {
  return useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designations")
        .select("*")
        .order("designation_code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Designation[];
    },
  });
}

export function useAddDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { designation_name: string; description?: string | null; status?: string }) => {
      const { data, error } = await supabase
        .from("designations")
        // designation_code is filled in by the set_designation_code trigger.
        .insert({ designation_code: "", designation_name: d.designation_name, description: d.description ?? null, status: d.status ?? "Active" })
        .select()
        .single();
      if (error) throw error;
      return data as Designation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations"] }),
  });
}

export function useUpdateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Designation> & { id: string }) => {
      const { data, error } = await supabase
        .from("designations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Designation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations"] }),
  });
}

export function useDeleteDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("designations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations"] }),
  });
}
