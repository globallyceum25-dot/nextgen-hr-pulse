import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTaskCategories() {
  return useQuery({
    queryKey: ["task_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_categories")
        .select("id, name, description, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTaskTypes() {
  return useQuery({
    queryKey: ["task_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_types")
        .select("id, name, description, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sectors")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}
