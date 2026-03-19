import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Company {
  id: string;
  company_code: string;
  company_name: string;
  registration_no: string | null;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("company_code", { ascending: true });
      if (error) throw error;
      return data as Company[];
    },
  });
}

export function useAddCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: { company_name: string; registration_no?: string | null; address?: string | null; contact_number?: string | null; email?: string | null; status?: string }) => {
      const { data, error } = await supabase.from("companies").insert([{ company_name: company.company_name, registration_no: company.registration_no, address: company.address, contact_number: company.contact_number, email: company.email, status: company.status }]).select().single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase.from("companies").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
