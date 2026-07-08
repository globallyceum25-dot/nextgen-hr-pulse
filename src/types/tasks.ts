// Shared task types for the HR Task Management Platform

export type TaskWorkflowStatus =
  | "Created" | "Assigned" | "In Progress" | "Pending" | "Under Review"
  | "Completed" | "Closed" | "On Hold" | "Cancelled" | "Overdue";

export type TaskPriority = "High" | "Medium" | "Low";

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "custom";

export const WORKFLOW_STATUSES: TaskWorkflowStatus[] = [
  "Created", "Assigned", "In Progress", "Pending", "Under Review",
  "Completed", "Closed", "On Hold", "Cancelled", "Overdue",
];

export const MAIN_TASK_STATUSES: TaskWorkflowStatus[] = [
  "Created", "Assigned", "In Progress", "Under Review",
  "Completed", "On Hold", "Cancelled",
];

export const ACTIVE_STATUSES: TaskWorkflowStatus[] = [
  "Created", "Assigned", "In Progress", "Pending", "Under Review",
];

export const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];

export const RECURRENCE_OPTIONS: RecurrenceType[] = ["none", "daily", "weekly", "monthly", "custom"];

export interface DbTask {
  id: string;
  task_number: number;
  title: string;
  description: string | null;
  category_id: string | null;
  type_id: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assigned_by: string | null;
  department_id: string | null;
  sector_id: string | null;
  company_id: string | null;
  location_id: string | null;
  sub_unit_id: string | null;
  sub_unit_entity_id?: string | null;
  priority: TaskPriority;
  status: TaskWorkflowStatus;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  progress: number;
  kpi_target_percent: number;
  kpi_achievement: number;
  task_weight: number;
  weighted_score: number;
  remarks: string | null;
  escalation_person_id: string | null;
  recurrence: RecurrenceType;
  recurrence_count: number | null;
  parent_recurring_id: string | null;
  related_module: string | null;
  sla_frequency: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: { id: string; name: string } | null;
  type?: { id: string; name: string } | null;
  department?: { id: string; department_name: string } | null;
  sector?: { id: string; name: string } | null;
  company?: { id: string; company_name: string } | null;
  location?: { id: string; location_name: string } | null;
  assignee_profile?: { id: string; full_name: string | null; email: string | null } | null;
  assigned_by_profile?: { id: string; full_name: string | null; email: string | null } | null;
  sub_tasks?: DbSubTask[];
}

export interface DbSubTask {
  id: string;
  task_id: string;
  title: string;
  status: TaskWorkflowStatus;
  progress: number;
  priority: TaskPriority;
  task_weight: number;
  weighted_score: number;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  completed_date: string | null;
  remarks: string | null;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  assignee_profile?: { id: string; full_name: string | null; email: string | null } | null;
}

export interface DbTaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile?: { full_name: string | null; email: string | null } | null;
}

export interface DbActivityLog {
  id: string;
  task_id: string | null;
  user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

export interface TaskMasterItem {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

// Helper functions
export function getWeightFromPriority(priority: TaskPriority): number {
  switch (priority) {
    case "High": return 1;
    case "Medium": return 0.6;
    case "Low": return 0.2;
    default: return 0.6;
  }
}

export function getStatusFromProgress(progress: number): TaskWorkflowStatus {
  if (progress >= 100) return "Completed";
  if (progress >= 80) return "Under Review";
  if (progress >= 50) return "In Progress";
  if (progress >= 10) return "Assigned";
  if (progress > 0) return "Created";
  return "Created";
}

export function getProgressFromStatus(status: TaskWorkflowStatus): number {
  switch (status) {
    case "Created": return 0;
    case "Assigned": return 5;
    case "Pending": return 10;
    case "In Progress": return 50;
    case "Under Review": return 80;
    case "On Hold": return 0; // paused
    case "Cancelled": return 0;
    case "Completed": return 100;
    case "Closed": return 100;
    case "Overdue": return 0; // calculated separately
    default: return 0;
  }
}

export function getStatusColor(status: TaskWorkflowStatus): string {
  switch (status) {
    case "Created": return "bg-muted text-muted-foreground border-border";
    case "Assigned": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "In Progress": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Pending": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Under Review": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "Completed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Closed": return "bg-muted text-muted-foreground border-border";
    case "On Hold": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "Cancelled": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "Overdue": return "bg-red-500/15 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case "High": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Medium": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Low": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getDeadlineInfo(dueDate: string | null, status: TaskWorkflowStatus) {
  if (!dueDate || status === "Completed" || status === "Closed" || status === "Cancelled") {
    return { remainingDays: 0, isOverdue: false, isDueSoon: false, showAlert: false, label: "" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diff < 0;
  const isDueSoon = diff >= 0 && diff <= 7;

  let label = "";
  if (isOverdue) label = `Overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""}`;
  else if (diff === 0) label = "Due today";
  else if (diff <= 3) label = `${diff} day${diff !== 1 ? "s" : ""} remaining`;
  else if (diff <= 7) label = `${diff} days remaining`;

  return { remainingDays: diff, isOverdue, isDueSoon, showAlert: isOverdue || isDueSoon, label };
}
