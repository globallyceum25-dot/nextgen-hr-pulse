import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  department_code: string;
  department_name: string;
  company_id: string | null;
  sector_type: string | null;
  applies_to: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("department_code", { ascending: true });
      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useAddDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dept: Partial<Omit<Department, "id" | "department_code" | "created_at" | "updated_at">> & { department_name: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .insert({ ...dept, department_code: "" })
        .select()
        .single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Department> & { id: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}
