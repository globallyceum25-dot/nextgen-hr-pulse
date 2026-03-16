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

export const LOCATIONS = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata"];

export const RESPONSIBLE_PERSONS = [
  "Arjun Mehta", "Priya Sharma", "Rahul Verma", "Sneha Patel",
  "Vikram Singh", "Anjali Nair", "Karan Joshi", "Divya Reddy",
  "Amit Kumar", "Neha Gupta", "Rohan Das", "Pooja Iyer",
];

export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "Completed" | "In Progress" | "Pending" | "Overdue";
export type Stage = "Planning" | "Execution" | "Review" | "Closed";

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
  sectorId: number;
  location: string;
  responsible: string;
  priority: Priority;
  stage: Stage;
  progress: number;
  startDate: string;
  dueDate: string;
  completedDate?: string;
  status: TaskStatus;
  month: number;
  year: number;
  kpiScore: number;
  subTasks: SubTask[];
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
    const status = randomFrom<TaskStatus>(["Completed", "In Progress", "Pending", "Overdue"]);
    subtasks.push({
      id: `ST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: randomFrom(names),
      status,
      progress: status === "Completed" ? 100 : status === "Overdue" ? Math.floor(Math.random() * 40) : Math.floor(Math.random() * 90),
      responsible: Math.random() > 0.5 ? parentResponsible : randomFrom(RESPONSIBLE_PERSONS),
      dueDate: "2026-03-30",
      completedDate: status === "Completed" ? "2026-03-15" : undefined,
    });
  }
  return subtasks;
}

export function generateMockTasks(): Task[] {
  const tasks: Task[] = [];
  const taskNames = [
    "Employee Onboarding Process", "Quarterly Performance Review", "Compliance Audit",
    "Training Program Rollout", "Payroll Processing Cycle", "Benefits Enrollment",
    "Workplace Safety Assessment", "Recruitment Campaign", "Exit Interview Analysis",
    "Employee Satisfaction Survey", "Policy Update Implementation", "Vendor Contract Review",
    "Diversity & Inclusion Initiative", "Leadership Development Program", "Compensation Benchmarking",
    "Attendance Management Review", "Grievance Resolution Process", "Workforce Planning",
    "Succession Planning Framework", "HR Systems Migration",
  ];

  let counter = 1;
  for (const sector of SECTORS) {
    const taskCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < taskCount; i++) {
      const status = randomFrom<TaskStatus>(["Completed", "In Progress", "Pending", "Overdue"]);
      const progress = status === "Completed" ? 100 : status === "Overdue" ? Math.floor(Math.random() * 40) : Math.floor(Math.random() * 95);
      const month = Math.floor(Math.random() * 3) + 1; // Jan-Mar 2026
      tasks.push({
        id: `T-${counter}`,
        taskId: `TASK-${String(counter).padStart(4, "0")}`,
        name: randomFrom(taskNames),
        sectorId: sector.id,
        location: randomFrom(LOCATIONS),
        responsible: randomFrom(RESPONSIBLE_PERSONS),
        priority: randomFrom<Priority>(["High", "Medium", "Low"]),
        stage: randomFrom<Stage>(["Planning", "Execution", "Review", "Closed"]),
        progress,
        startDate: `2026-0${month}-01`,
        dueDate: `2026-0${month}-28`,
        completedDate: status === "Completed" ? `2026-0${month}-20` : undefined,
        status,
        month,
        year: 2026,
        kpiScore: Math.floor(Math.random() * 40) + 60,
        subTasks: generateSubTasks(2 + Math.floor(Math.random() * 4), randomFrom(RESPONSIBLE_PERSONS)),
      });
      counter++;
    }
  }
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
