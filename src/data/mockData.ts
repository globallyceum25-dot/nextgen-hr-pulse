export const SECTORS = [
  { id: 1, name: "Human Resources Outsourcing" },
  { id: 2, name: "Talent Acquisition" },
  { id: 3, name: "Payroll Management" },
  { id: 4, name: "Compliance & Legal" },
  { id: 5, name: "Training & Development" },
  { id: 6, name: "Employee Engagement" },
  { id: 7, name: "HR Technology Solutions" },
];

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

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getStatusFromProgress(progress: number): TaskStatus {
  if (progress === 0) return "Pending";
  if (progress <= 25) return "Started";
  if (progress <= 75) return "In Progress";
  if (progress < 100) return "Almost Completed";
  return "Completed";
}

function generateSubTasks(count: number, parentResponsible: string): SubTask[] {
  const subtasks: SubTask[] = [];
  const names = [
    "Draft policy document", "Conduct interviews", "Review submissions",
    "Prepare report", "Schedule meeting", "Update database",
    "Send notifications", "Verify compliance", "Collect feedback",
    "Finalize documentation", "Coordinate with vendors", "Audit records",
  ];
  for (let i = 0; i < count; i++) {
    const progress = Math.floor(Math.random() * 101);
    const status = getStatusFromProgress(progress);
    subtasks.push({
      id: `ST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: randomFrom(names),
      status,
      progress,
      responsible: Math.random() > 0.5 ? parentResponsible : randomFrom(RESPONSIBLE_PERSONS),
      dueDate: "2026-03-30",
      completedDate: status === "Completed" ? "2026-03-15" : undefined,
    });
  }
  return subtasks;
}

// Spreadsheet-based task definitions
const SPREADSHEET_TASKS = [
  { name: "New Employee Document Collection", responsible: "Supun", category: "Daily", type: "Process" as TaskType, sla: "Day 1", priority: "High" as Priority, description: "Collect and file personal, educational, experience, ID documents and record verification" },
  { name: "Document Verification", responsible: "Dileepa", category: "Weekly", type: "Process" as TaskType, sla: "Within 2 days", priority: "High" as Priority, description: "Verify authenticity of submitted documents and record verification" },
  { name: "Employee Profile Creation (HRIS)", responsible: "Supun", category: "Monthly", type: "Process" as TaskType, sla: "Within 2 days", priority: "High" as Priority, description: "Create employee profile with personal, payroll, bank and statutory details" },
  { name: "Appointment / Contract Letter Issuance", responsible: "Heshani", category: "Daily", type: "Letter" as TaskType, sla: "Within 1 day of document verification", priority: "High" as Priority, description: "Prepare, approve and issue appointment or contract letters" },
  { name: "Induction Program Coordination", responsible: "Heshani", category: "Daily", type: "Process" as TaskType, sla: "Within 1 week", priority: "Medium" as Priority, description: "Plan and coordinate induction sessions and departmental orientations" },
  { name: "ICT / Email / System Access Setup", responsible: "Chitra", category: "Monthly", type: "Process" as TaskType, sla: "Day 1", priority: "Medium" as Priority, description: "Coordinate email, HRIS, attendance and system access setup" },
  { name: "Workstation & Resource Setup", responsible: "Supun", category: "Daily", type: "Process" as TaskType, sla: "Day 1", priority: "Medium" as Priority, description: "Ensure workstation, system, and tools are ready before joining" },
  { name: "Buddy / Mentor Assignment", responsible: "Supun", category: "Weekly", type: "Process" as TaskType, sla: "Day 1", priority: "Medium" as Priority, description: "Assign buddy and monitor initial integration" },
  { name: "Handbook & Policy Issuance", responsible: "Chitra", category: "Monthly", type: "Process" as TaskType, sla: "Day 1", priority: "Medium" as Priority, description: "Share handbook and policies and obtain acknowledgement" },
  { name: "Probation KPI / Goal Setting", responsible: "Chitra", category: "Weekly", type: "Process" as TaskType, sla: "Within 7 & 30 days", priority: "Medium" as Priority, description: "Coordinate probation KPIs and update HRIS" },
  { name: "First-Week/First-Month Review", responsible: "Chitra", category: "Weekly", type: "Process" as TaskType, sla: "Monthly / As needed", priority: "Medium" as Priority, description: "Conduct review meetings to ensure employee adaptation; provide feedback" },
  { name: "Employee File Management", responsible: "Heshani", category: "Weekly", type: "Process" as TaskType, sla: "Daily", priority: "High" as Priority, description: "Maintain updated physical and digital employee files" },
  { name: "Attendance & Leave Management", responsible: "Dileepa", category: "Weekly", type: "Process" as TaskType, sla: "Daily", priority: "High" as Priority, description: "Monitor attendance, process leave requests, update balances" },
  { name: "Time & Attendance System Updates", responsible: "Chitra", category: "Weekly", type: "Process" as TaskType, sla: "Weekly", priority: "Medium" as Priority, description: "Update late/absent data and ensure payroll linkage" },
  { name: "Shift / Roster Management", responsible: "Supun", category: "Weekly", type: "Process" as TaskType, sla: "Within 10 days", priority: "Medium" as Priority, description: "Prepare, update and communicate duty rosters" },
  { name: "Service Letter", responsible: "Heshani", category: "Daily", type: "Letter" as TaskType, sla: "Within 5 day post review", priority: "High" as Priority, description: "Issue service verification letters upon request" },
  { name: "Confirmation Letter Issuance", responsible: "Dileepa", category: "Weekly", type: "Letter" as TaskType, sla: "Within 2 days of approval", priority: "High" as Priority, description: "Issue confirmation letter after probation completion" },
  { name: "Promotion / Transfer Letter Issuance", responsible: "Heshani", category: "Monthly", type: "Letter" as TaskType, sla: "Within 1 day of approval", priority: "High" as Priority, description: "Issue letters for promotions or transfers" },
  { name: "Disciplinary Letters", responsible: "Dileepa", category: "Daily", type: "Letter" as TaskType, sla: "Within 2 days", priority: "Medium" as Priority, description: "Draft and issue warning or show cause letters" },
  { name: "Salary Confirmation Letter", responsible: "Heshani", category: "Daily", type: "Letter" as TaskType, sla: "Within 2 days", priority: "Medium" as Priority, description: "Issue salary confirmation for bank/visa purposes" },
  { name: "NOC / Visa Support Letter", responsible: "Chitra", category: "Monthly", type: "Process" as TaskType, sla: "Daily", priority: "Medium" as Priority, description: "Issue NOC or visa-related letters" },
  { name: "HR Helpdesk & Queries", responsible: "Dileepa", category: "Daily", type: "Process" as TaskType, sla: "Ongoing", priority: "Medium" as Priority, description: "Respond to employee HR queries and escalate when needed" },
  { name: "Policy Communication & Enforcement", responsible: "Chitra", category: "Weekly", type: "Process" as TaskType, sla: "Daily", priority: "High" as Priority, description: "Communicate policies and ensure compliance" },
  { name: "HRIS Data Maintenance", responsible: "Heshani", category: "Monthly", type: "Process" as TaskType, sla: "Daily", priority: "High" as Priority, description: "Update HRIS for joiners, movements, leaves and exits" },
  { name: "Payroll Inputs Collection", responsible: "Heshani", category: "Weekly", type: "Process" as TaskType, sla: "1st week of month", priority: "High" as Priority, description: "Collect attendance, OT, allowances, deductions and benefits" },
  { name: "Payroll Processing & Validation", responsible: "Chitra", category: "Weekly", type: "Process" as TaskType, sla: "By 15th of month", priority: "High" as Priority, description: "Process payroll and verify salary accuracy" },
  { name: "Allowance / OT Validation", responsible: "Dileepa", category: "Weekly", type: "Process" as TaskType, sla: "By 14th of month", priority: "High" as Priority, description: "Validate payroll components before finalization" },
];

function getKpiStatus(achievement: number): string {
  if (achievement >= 100) return "5 - Exceeds Expectations";
  if (achievement >= 70) return "4 - Very Good / Above Expectations";
  if (achievement >= 40) return "3 - Meets Expectations";
  if (achievement >= 25) return "2 - Needs Improvement";
  return "1 - Unsatisfactory / Below Expectations";
}

export function generateMockTasks(): Task[] {
  const tasks: Task[] = [];

  SPREADSHEET_TASKS.forEach((def, index) => {
    const totalTasks = [10, 4, 7, 5, 4, 5, 10, 12, 5, 4, 4, 10, 7, 5, 4, 5, 10, 12, 5, 4, 7, 5, 4, 5, 10, 5, 10][index] || (4 + Math.floor(Math.random() * 9));
    const completedCount = Math.floor(Math.random() * (totalTasks + 1));
    const pendingCount = totalTasks - completedCount;
    const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 10000) / 100 : 0;
    const kpiTarget = 100;
    const kpiAchievement = Math.min(100, Math.max(0, progress));
    const kpiStatus = getKpiStatus(kpiAchievement);
    const taskWeight = def.priority === "High" ? 1 : 0.6;
    const maxWeight = def.priority === "High" ? 1 : 0.6;
    const weightedScore = Math.round((kpiAchievement / 100) * taskWeight * 100) / 100;
    const status: TaskStatus = getStatusFromProgress(progress);
    const completionFlag = status === "Completed" ? 1 : 0;
    const month = Math.floor(Math.random() * 3) + 1;

    tasks.push({
      id: `T-${index + 1}`,
      taskId: String(index + 1).padStart(3, "0"),
      name: def.name,
      description: def.description,
      sectorId: (index % SECTORS.length) + 1,
      location: "Nugegoda",
      responsible: def.responsible,
      companyName: "NextGen Human Capital Solutions",
      taskCategory: def.category,
      taskType: def.type,
      slaFrequency: def.sla,
      priority: def.priority,
      stage: randomFrom<Stage>(["Planning", "Execution", "Review", "Closed"]),
      totalTasks,
      completedCount,
      pendingCount,
      progress,
      kpiTargetPercent: kpiTarget,
      kpiAchievement,
      kpiAchievementStatus: kpiStatus,
      taskWeight,
      weightedScore,
      maxWeight,
      startDate: `2026-0${month}-01`,
      dueDate: `2026-0${month}-28`,
      completedDate: status === "Completed" ? `2026-0${month}-20` : undefined,
      status,
      completionFlag,
      month,
      year: 2026,
      kpiScore: Math.round(kpiAchievement),
      subTasks: generateSubTasks(totalTasks, def.responsible),
    });
  });

  return tasks;
}

export const mockTasks = generateMockTasks();

export interface KPIData {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

export function getKPIData(sectorId?: number): KPIData[] {
  const filtered = sectorId ? mockTasks.filter(t => t.sectorId === sectorId) : mockTasks;
  const total = filtered.length;
  const completed = filtered.filter(t => t.status === "Completed").length;
  const overdue = filtered.filter(t => t.status === "Overdue").length;
  const avgKpi = total > 0 ? Math.round(filtered.reduce((s, t) => s + t.kpiScore, 0) / total) : 0;

  return [
    { label: "Total Tasks", value: total, change: 12, trend: "up" },
    { label: "Completion Rate", value: total > 0 ? Math.round((completed / total) * 100) : 0, change: 5, trend: "up" },
    { label: "Avg KPI Score", value: avgKpi, change: 3, trend: "up" },
    { label: "Overdue Tasks", value: overdue, change: -2, trend: "down" },
  ];
}

export function getMonthlyTrend() {
  return MONTHS.slice(0, 3).map((month, i) => {
    const monthTasks = mockTasks.filter(t => t.month === i + 1);
    const total = monthTasks.length;
    const completed = monthTasks.filter(t => t.status === "Completed").length;
    return {
      month: month.slice(0, 3),
      completed,
      pending: total - completed,
      kpiAvg: total > 0 ? Math.round(monthTasks.reduce((s, t) => s + t.kpiScore, 0) / total) : 0,
    };
  });
}

export function getSectorPerformance() {
  return SECTORS.map(sector => {
    const sectorTasks = mockTasks.filter(t => t.sectorId === sector.id);
    const total = sectorTasks.length;
    const completed = sectorTasks.filter(t => t.status === "Completed").length;
    return {
      name: sector.name.length > 15 ? sector.name.slice(0, 15) + "…" : sector.name,
      fullName: sector.name,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0,
      kpi: total > 0 ? Math.round(sectorTasks.reduce((s, t) => s + t.kpiScore, 0) / total) : 0,
      tasks: total,
    };
  });
}
