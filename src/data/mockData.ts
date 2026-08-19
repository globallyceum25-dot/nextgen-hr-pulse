export type SectorType = "LEDU" | "Other Sectors";

// NOTE: the sector / sub-unit / entity hierarchy is NOT defined here any more.
// It lives in the `sectors`, `sub_units` and `sub_unit_entities` tables and is
// read through useSectors() / useSubUnits() / useSubUnitEntities(). The former
// SECTORS, LEDU_SUB_UNITS, LEDU_SUB_UNIT_ENTITIES, LYCEUM_CAMPUSES,
// EARLY_CHILDHOOD_ENTITIES and HIGHER_EDUCATION_ENTITIES constants duplicated
// those rows verbatim, so edits made in Master Sheets never reached the sidebar.

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const LOCATIONS = ["Nugegoda", "Colombo", "Kandy", "Galle", "Jaffna"];

export const RESPONSIBLE_PERSONS = ["Supun", "Dileepa", "Chitra", "Heshani"];

export const COMPANY_NAMES = ["NextGen Human Capital Solutions"];

export const TASK_CATEGORIES = ["Daily", "Weekly", "Monthly"];

export const TASK_TYPES = ["Process", "Letter"];

export const SLA_OPTIONS = [
  "Day 1", "Within 1 day", "Within 2 days", "Within 5 days",
  "Within 1 week", "Within 7 & 30 days", "Within 10 days",
  "1st week of month", "By 15th of month", "By 14th of month", "By 20th of month",
  "Within 1 day of approval", "Within 2 days of approval",
  "Within 1 day of document verification", "Within 5 day post review",
  "Daily", "Weekly", "Monthly / As needed", "Ongoing",
];

export const KPI_ACHIEVEMENT_STATUSES = [
  "5 - Exceeds Expectations",
  "4 - Very Good / Above Expectations",
  "3 - Meets Expectations",
  "2 - Needs Improvement",
  "1 - Unsatisfactory / Below Expectations",
];

export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "Completed" | "In Progress" | "Pending" | "Overdue" | "Started" | "Almost Completed" | "Not Started";

export type SubTaskStatus = "Not Started" | "Started" | "In Progress" | "Almost Completed" | "Completed";

export const SUB_TASK_STATUSES: SubTaskStatus[] = ["Not Started", "Started", "In Progress", "Almost Completed", "Completed"];

export function getProgressFromSubTaskStatus(status: SubTaskStatus): number {
  switch (status) {
    case "Not Started": return 0;
    case "Started": return 25;
    case "In Progress": return 50;
    case "Almost Completed": return 80;
    case "Completed": return 100;
    default: return 0;
  }
}
export type Stage = "Planning" | "Execution" | "Review" | "Closed";
export type TaskType = "Process" | "Letter";

export interface SubTask {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  priority: Priority;
  taskWeight: number;
  weightedScore: number;
  responsible: string;
  dueDate: string;
  completedDate?: string;
}

export interface Task {
  id: string;
  taskId: string;
  name: string;
  description: string;
  sectorId: number;
  location: string;
  responsible: string;
  companyName: string;
  taskCategory: string;
  taskType: TaskType;
  slaFrequency: string;
  priority: Priority;
  stage: Stage;
  totalTasks: number;
  completedCount: number;
  pendingCount: number;
  progress: number;
  kpiTargetPercent: number;
  kpiAchievement: number;
  kpiAchievementStatus: string;
  taskWeight: number;
  weightedScore: number;
  maxWeight: number;
  createdDate: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: TaskStatus;
  completionFlag: number;
  month: number;
  year: number;
  kpiScore: number;
  subTasks: SubTask[];
}

export function getStatusFromProgress(progress: number): TaskStatus {
  if (progress === 0) return "Pending";
  if (progress <= 25) return "Started";
  if (progress <= 75) return "In Progress";
  if (progress < 100) return "Almost Completed";
  return "Completed";
}

export interface KPIData {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}
