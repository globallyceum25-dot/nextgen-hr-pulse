import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbTask, DbSubTask, TaskWorkflowStatus, TaskPriority, RecurrenceType } from "@/types/tasks";
import { getWeightFromPriority } from "@/types/tasks";

const TASKS_KEY = ["tasks"];
const SUB_TASKS_KEY = ["sub_tasks"];

// Status-to-progress mapping for tasks without sub-tasks
const statusToProgress: Record<string, number> = {
  "Created": 0,
  "Assigned": 10,
  "In Progress": 50,
  "Pending": 40,
  "Under Review": 80,
  "Completed": 100,
  "Closed": 100,
  "On Hold": 0,
  "Cancelled": 0,
  "Overdue": 0,
};

export function useTasks(filters?: {
  status?: TaskWorkflowStatus | "All";
  priority?: TaskPriority | "All";
  sector_id?: string | null;
  department_id?: string | null;
  company_id?: string | null;
  location_id?: string | null;
  assignee_id?: string | null;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
}) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          category:task_categories(id, name),
          type:task_types(id, name),
          department:departments(id, department_name),
          sector:sectors(id, name),
          company:companies(id, company_name),
          location:locations(id, location_name),
          assignee_profile:profiles!tasks_assignee_id_fkey(id, full_name, email),
          assigned_by_profile:profiles!tasks_assigned_by_fkey(id, full_name, email),
          sub_tasks(*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority && filters.priority !== "All") {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.sector_id) {
        query = query.eq("sector_id", filters.sector_id);
      }
      if (filters?.department_id) {
        query = query.eq("department_id", filters.department_id);
      }
      if (filters?.company_id) {
        query = query.eq("company_id", filters.company_id);
      }
      if (filters?.location_id) {
        query = query.eq("location_id", filters.location_id);
      }
      if (filters?.assignee_id) {
        query = query.eq("assignee_id", filters.assignee_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.due_date_from) {
        query = query.gte("due_date", filters.due_date_from);
      }
      if (filters?.due_date_to) {
        query = query.lte("due_date", filters.due_date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Auto-mark overdue tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let tasks = (data as unknown as DbTask[])?.map(task => {
        if (
          task.due_date &&
          new Date(task.due_date) < today &&
          !["Completed", "Closed", "Cancelled", "Overdue"].includes(task.status)
        ) {
          return { ...task, status: "Overdue" as TaskWorkflowStatus };
        }
        return task;
      }) || [];

      // RBAC: restrict to own tasks for employee_user / data_entry_user roles
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: scopeRow } = await supabase
            .from("rbac_user_scopes")
            .select("rbac_roles(role_key)")
            .eq("user_id", user.id)
            .maybeSingle();
          const roleKey = (scopeRow as any)?.rbac_roles?.role_key as string | undefined;
          const restrictedRoles = ["employee_user", "data_entry_user"];
          if (roleKey && restrictedRoles.includes(roleKey)) {
            const emailLower = user.email?.toLowerCase();
            // Find matching employee_name via profiles/employees email match
            const { data: emp } = await supabase
              .from("employees")
              .select("employee_name")
              .ilike("email", user.email || "")
              .maybeSingle();
            const nameLower = emp?.employee_name?.toLowerCase();
            tasks = tasks.filter(t => {
              const isAssigneeById = t.assignee_id === user.id;
              const isAssigneeByName = !!(nameLower && (t as any).assignee_name?.toLowerCase() === nameLower);
              const isAssigneeByEmail = !!(emailLower && (t as any).assignee_profile?.email?.toLowerCase() === emailLower);
              const isAssigner = t.assigned_by === user.id;
              const isCreator = t.created_by === user.id;
              const hasSub = (t.sub_tasks || []).some((st: any) =>
                st.assignee_id === user.id ||
                (nameLower && st.assignee_name?.toLowerCase() === nameLower) ||
                st.created_by === user.id
              );
              return isAssigneeById || isAssigneeByName || isAssigneeByEmail || isAssigner || isCreator || hasSub;
            });
          }
        }
      } catch (e) {
        // Fail open (RLS still applies at DB level)
        console.warn("RBAC task filter skipped:", e);
      }

      return tasks;
    },
  });
}

export function useTaskById(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          category:task_categories(id, name),
          type:task_types(id, name),
          department:departments(id, department_name),
          sector:sectors(id, name),
          company:companies(id, company_name),
          location:locations(id, location_name),
          sub_tasks(*)
        `)
        .eq("id", taskId!)
        .single();
      if (error) throw error;
      return data as unknown as DbTask;
    },
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category_id?: string;
  type_id?: string;
  assignee_id?: string;
  assignee_name?: string;
  assigned_by?: string;
  department_id?: string;
  sector_id?: string;
  company_id?: string;
  location_id?: string;
  sub_unit_id?: string;
  priority: TaskPriority;
  start_date?: string;
  due_date?: string;
  kpi_target_percent?: number;
  remarks?: string;
  escalation_person_id?: string;
  recurrence?: RecurrenceType;
  recurrence_count?: number;
  related_module?: string;
  sla_frequency?: string;
  sub_task_count?: number;
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const weight = getWeightFromPriority(input.priority);

      const taskData = {
        title: input.title,
        description: input.description || null,
        category_id: input.category_id || null,
        type_id: input.type_id || null,
        assignee_id: input.assignee_id || null,
        assignee_name: input.assignee_name || null,
        assigned_by: input.assigned_by || userId || null,
        department_id: input.department_id || null,
        sector_id: input.sector_id || null,
        company_id: input.company_id || null,
        location_id: input.location_id || null,
        sub_unit_id: input.sub_unit_id || null,
        priority: input.priority,
        status: (input.assignee_id ? "Assigned" : "Created") as TaskWorkflowStatus,
        start_date: input.start_date || null,
        due_date: input.due_date || null,
        kpi_target_percent: input.kpi_target_percent ?? 100,
        task_weight: weight,
        remarks: input.remarks || null,
        escalation_person_id: input.escalation_person_id || null,
        recurrence: input.recurrence || "none",
        recurrence_count: input.recurrence_count || 0,
        related_module: input.related_module || null,
        sla_frequency: input.sla_frequency || null,
        created_by: userId || null,
        updated_by: userId || null,
      };

      const { data: task, error } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();
      if (error) throw error;

      // Create sub-tasks if specified
      if (input.sub_task_count && input.sub_task_count > 0) {
        const subTasks = Array.from({ length: input.sub_task_count }, (_, i) => ({
          task_id: task.id,
          title: `Sub Task ${i + 1}`,
          status: "Created" as TaskWorkflowStatus,
          priority: input.priority,
          task_weight: weight,
          assignee_id: input.assignee_id || null,
          due_date: input.due_date || null,
          sort_order: i,
          created_by: userId || null,
          updated_by: userId || null,
        }));

        const { error: stError } = await supabase.from("sub_tasks").insert(subTasks);
        if (stError) throw stError;
      }

      // Create recurring copies
      if (input.recurrence && input.recurrence !== "none" && input.recurrence_count && input.recurrence_count > 0) {
        for (let i = 1; i <= input.recurrence_count; i++) {
          const futureStart = input.start_date ? new Date(input.start_date) : new Date();
          const futureDue = input.due_date ? new Date(input.due_date) : new Date();

          if (input.recurrence === "daily") {
            futureStart.setDate(futureStart.getDate() + i);
            futureDue.setDate(futureDue.getDate() + i);
          } else if (input.recurrence === "weekly") {
            futureStart.setDate(futureStart.getDate() + i * 7);
            futureDue.setDate(futureDue.getDate() + i * 7);
          } else {
            futureStart.setMonth(futureStart.getMonth() + i);
            futureDue.setMonth(futureDue.getMonth() + i);
          }

          const { data: recurTask, error: recurError } = await supabase
            .from("tasks")
            .insert({
              ...taskData,
              start_date: futureStart.toISOString().split("T")[0],
              due_date: futureDue.toISOString().split("T")[0],
              parent_recurring_id: task.id,
            })
            .select()
            .single();
          if (recurError) throw recurError;

          if (input.sub_task_count && input.sub_task_count > 0) {
            const subTasks = Array.from({ length: input.sub_task_count }, (_, j) => ({
              task_id: recurTask.id,
              title: `Sub Task ${j + 1}`,
              status: "Created" as TaskWorkflowStatus,
              priority: input.priority,
              task_weight: weight,
              assignee_id: input.assignee_id || null,
              due_date: futureDue.toISOString().split("T")[0],
              sort_order: j,
              created_by: userId || null,
              updated_by: userId || null,
            }));
            await supabase.from("sub_tasks").insert(subTasks);
          }
        }
      }

      // Log activity
      await supabase.from("task_activity_log").insert({
        task_id: task.id,
        user_id: userId,
        action: "created",
        description: `Task "${input.title}" created`,
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DbTask> }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Check if this task has sub-tasks
      const { data: subTasks } = await supabase
        .from("sub_tasks")
        .select("id, progress, status")
        .eq("task_id", id);

      const hasSubTasks = subTasks && subTasks.length > 0;
      let finalUpdates = { ...updates, updated_by: user?.id || null };

      if (hasSubTasks) {
        // Progress comes from sub-tasks — recalculate from sub-task statuses
        const avgProgress = subTasks.reduce((sum, s) => sum + Number(s.progress), 0) / subTasks.length;
        const progress = Math.round(avgProgress * 100) / 100;

        // Auto-determine status from progress when sub-tasks exist
        const { getStatusFromProgress } = await import("@/types/tasks");
        const autoStatus = getStatusFromProgress(progress);

        const { data: taskMeta } = await supabase.from("tasks").select("kpi_target_percent, task_weight").eq("id", id).single();
        const kpiTarget = taskMeta?.kpi_target_percent || 100;
        const kpiAchievement = kpiTarget > 0 ? Math.min(100, Math.round((progress / kpiTarget) * 10000) / 100) : 0;
        const taskWeight = taskMeta?.task_weight || 0.6;
        const weightedScore = Math.round(taskWeight * (progress / 100) * 10000) / 10000;

        // Remove any user-supplied status override — status is auto-calculated
        delete (finalUpdates as any).status;
        finalUpdates = {
          ...finalUpdates,
          status: autoStatus,
          progress,
          kpi_achievement: kpiAchievement,
          weighted_score: weightedScore,
          completed_date: progress >= 100 ? new Date().toISOString().split("T")[0] : null,
        } as any;
      } else if (updates.status) {
        // No sub-tasks — calculate progress from task status
        const progress = statusToProgress[updates.status as string] ?? 0;

        const { data: taskMeta } = await supabase.from("tasks").select("kpi_target_percent, task_weight").eq("id", id).single();
        const kpiTarget = taskMeta?.kpi_target_percent || 100;
        const kpiAchievement = kpiTarget > 0 ? Math.min(100, Math.round((progress / kpiTarget) * 10000) / 100) : 0;
        const taskWeight = taskMeta?.task_weight || 0.6;
        const weightedScore = Math.round(taskWeight * (progress / 100) * 10000) / 10000;

        finalUpdates = {
          ...finalUpdates,
          progress,
          kpi_achievement: kpiAchievement,
          weighted_score: weightedScore,
          completed_date: progress === 100 ? new Date().toISOString().split("T")[0] : null,
        } as any;
      }

      // Strip relation properties before update
      const { assigned_by_profile, assignee_profile, category, company, department, location, sector, sub_tasks, type, ...cleanUpdates } = finalUpdates as any;

      const { data, error } = await supabase
        .from("tasks")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("task_activity_log").insert({
        task_id: id,
        user_id: user?.id,
        action: "updated",
        description: `Task updated`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useUpdateSubTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DbSubTask> }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Auto-calculate sub-task progress from status if status is being changed
      let finalUpdates = { ...updates, updated_by: user?.id || null };
      if (updates.status) {
        const subTaskStatusToProgress: Record<string, number> = {
          "Created": 0,
          "Assigned": 10,
          "In Progress": 50,
          "Pending": 40,
          "Under Review": 80,
          "Completed": 100,
          "Closed": 100,
          "On Hold": 0,
          "Cancelled": 0,
          "Overdue": 0,
        };
        const autoProgress = subTaskStatusToProgress[updates.status as string] ?? 0;
        finalUpdates = { ...finalUpdates, progress: autoProgress } as any;
        if (autoProgress === 100) {
          (finalUpdates as any).completed_date = new Date().toISOString().split("T")[0];
        }
      }

      // Strip relation properties before update
      const { assignee_profile, ...cleanSubUpdates } = finalUpdates as any;

      const { data, error } = await supabase
        .from("sub_tasks")
        .update(cleanSubUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Recalculate parent task progress
      const taskId = data.task_id;
      const { data: allSubTasks } = await supabase
        .from("sub_tasks")
        .select("*")
        .eq("task_id", taskId);

      if (allSubTasks && allSubTasks.length > 0) {
        const total = allSubTasks.length;
        const completedCount = allSubTasks.filter(s => s.status === "Completed" || s.status === "Closed").length;
        const avgProgress = allSubTasks.reduce((sum, s) => sum + Number(s.progress), 0) / total;
        const progress = Math.round(avgProgress * 100) / 100;

        // Get parent task for KPI target
        const { data: parentTask } = await supabase.from("tasks").select("kpi_target_percent, task_weight").eq("id", taskId).single();
        const kpiTarget = parentTask?.kpi_target_percent || 100;
        const kpiAchievement = kpiTarget > 0 ? Math.min(100, Math.round((progress / kpiTarget) * 10000) / 100) : 0;
        const taskWeight = parentTask?.task_weight || 0.6;
        const weightedScore = Math.round(taskWeight * (progress / 100) * 10000) / 10000;

        let newStatus: TaskWorkflowStatus = "In Progress";
        if (progress === 0) newStatus = "Created";
        else if (progress >= 100) newStatus = "Completed";
        else if (progress >= 80) newStatus = "Under Review";

        await supabase.from("tasks").update({
          progress,
          kpi_achievement: kpiAchievement,
          weighted_score: weightedScore,
          status: completedCount === total ? "Completed" : newStatus,
          completed_date: completedCount === total ? new Date().toISOString().split("T")[0] : null,
        }).eq("id", taskId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: SUB_TASKS_KEY });
    },
  });
}

export function useDeleteSubTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from("sub_tasks").delete().eq("id", id);
      if (error) throw error;

      // Recalculate parent task progress
      const { data: allSubTasks } = await supabase
        .from("sub_tasks")
        .select("*")
        .eq("task_id", taskId);

      if (allSubTasks && allSubTasks.length > 0) {
        const total = allSubTasks.length;
        const completedCount = allSubTasks.filter(s => s.status === "Completed" || s.status === "Closed").length;
        const avgProgress = allSubTasks.reduce((sum, s) => sum + Number(s.progress), 0) / total;
        const progress = Math.round(avgProgress * 100) / 100;
        const { data: parentTask } = await supabase.from("tasks").select("kpi_target_percent, task_weight").eq("id", taskId).single();
        const kpiTarget = parentTask?.kpi_target_percent || 100;
        const kpiAchievement = kpiTarget > 0 ? Math.min(100, Math.round((progress / kpiTarget) * 10000) / 100) : 0;
        const taskWeight = parentTask?.task_weight || 0.6;
        const weightedScore = Math.round(taskWeight * (progress / 100) * 10000) / 10000;

        let newStatus: TaskWorkflowStatus = "In Progress";
        if (progress === 0) newStatus = "Created";
        else if (progress >= 100) newStatus = "Completed";
        else if (progress >= 80) newStatus = "Under Review";

        await supabase.from("tasks").update({
          progress, kpi_achievement: kpiAchievement, weighted_score: weightedScore,
          status: completedCount === total ? "Completed" : newStatus,
          completed_date: completedCount === total ? new Date().toISOString().split("T")[0] : null,
        }).eq("id", taskId);
      } else {
        // No sub-tasks left, reset to status-based progress
        await supabase.from("tasks").update({ progress: 0, kpi_achievement: 0, weighted_score: 0 }).eq("id", taskId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: SUB_TASKS_KEY });
    },
  });
}


export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ task_id, content }: { task_id: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("task_comments")
        .insert({ task_id, content, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["task_comments", vars.task_id] });
    },
  });
}

// Activity log
export function useTaskActivityLog(taskId: string | null) {
  return useQuery({
    queryKey: ["task_activity_log", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_activity_log")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
