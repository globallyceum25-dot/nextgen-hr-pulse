export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          company_code: string
          company_name: string
          contact_number: string | null
          created_at: string
          email: string | null
          id: string
          registration_no: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_code: string
          company_name: string
          contact_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          registration_no?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_code?: string
          company_name?: string
          contact_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          registration_no?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string | null
          created_at: string
          department_code: string
          department_name: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department_code: string
          department_name: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department_code?: string
          department_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_name: string
          created_at: string
          date_joined: string | null
          department: string | null
          designation: string | null
          employee_id: string
          employee_name: string
          employment_status: string
          id: string
          location: string | null
          reporting_manager: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          date_joined?: string | null
          department?: string | null
          designation?: string | null
          employee_id: string
          employee_name: string
          employment_status?: string
          id?: string
          location?: string | null
          reporting_manager?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          date_joined?: string | null
          department?: string | null
          designation?: string | null
          employee_id?: string
          employee_name?: string
          employment_status?: string
          id?: string
          location?: string | null
          reporting_manager?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          id: string
          location_code: string
          location_name: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          location_code: string
          location_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          location_code?: string
          location_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          task_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          sector_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          sector_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          sector_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sub_tasks: {
        Row: {
          assignee_id: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          remarks: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_workflow_status"]
          task_id: string
          task_weight: number
          title: string
          updated_at: string
          updated_by: string | null
          weighted_score: number
        }
        Insert: {
          assignee_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          remarks?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_workflow_status"]
          task_id: string
          task_weight?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          weighted_score?: number
        }
        Update: {
          assignee_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          remarks?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_workflow_status"]
          task_id?: string
          task_weight?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          weighted_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "sub_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assignee_id: string | null
          assignee_name: string | null
          category_id: string | null
          company_id: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          escalation_person_id: string | null
          id: string
          kpi_achievement: number
          kpi_target_percent: number
          location_id: string | null
          parent_recurring_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          recurrence_count: number | null
          related_module: string | null
          remarks: string | null
          sector_id: string | null
          sla_frequency: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_workflow_status"]
          task_number: number
          task_weight: number
          title: string
          type_id: string | null
          updated_at: string
          updated_by: string | null
          weighted_score: number
        }
        Insert: {
          assigned_by?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          category_id?: string | null
          company_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          escalation_person_id?: string | null
          id?: string
          kpi_achievement?: number
          kpi_target_percent?: number
          location_id?: string | null
          parent_recurring_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_count?: number | null
          related_module?: string | null
          remarks?: string | null
          sector_id?: string | null
          sla_frequency?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_workflow_status"]
          task_number?: number
          task_weight?: number
          title: string
          type_id?: string | null
          updated_at?: string
          updated_by?: string | null
          weighted_score?: number
        }
        Update: {
          assigned_by?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          category_id?: string | null
          company_id?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          escalation_person_id?: string | null
          id?: string
          kpi_achievement?: number
          kpi_target_percent?: number
          location_id?: string | null
          parent_recurring_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_count?: number | null
          related_module?: string | null
          remarks?: string | null
          sector_id?: string | null
          sla_frequency?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_workflow_status"]
          task_number?: number
          task_weight?: number
          title?: string
          type_id?: string | null
          updated_at?: string
          updated_by?: string | null
          weighted_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_recurring_id_fkey"
            columns: ["parent_recurring_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "sector_hr_admin"
        | "responsible_person"
        | "viewer"
      recurrence_type: "none" | "daily" | "weekly" | "monthly" | "custom"
      task_priority: "Critical" | "High" | "Medium" | "Low"
      task_workflow_status:
        | "Created"
        | "Assigned"
        | "In Progress"
        | "Pending"
        | "Under Review"
        | "Completed"
        | "Closed"
        | "On Hold"
        | "Cancelled"
        | "Overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "sector_hr_admin",
        "responsible_person",
        "viewer",
      ],
      recurrence_type: ["none", "daily", "weekly", "monthly", "custom"],
      task_priority: ["Critical", "High", "Medium", "Low"],
      task_workflow_status: [
        "Created",
        "Assigned",
        "In Progress",
        "Pending",
        "Under Review",
        "Completed",
        "Closed",
        "On Hold",
        "Cancelled",
        "Overdue",
      ],
    },
  },
} as const
