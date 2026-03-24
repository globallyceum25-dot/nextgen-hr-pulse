import { useMemo } from "react";
import { AlertTriangle, Clock, CheckCircle2, ListChecks } from "lucide-react";
import type { Task } from "@/data/mockData";

export interface DeadlineInfo {
  remainingDays: number;
  totalDuration: number;
  message: string;
  isOverdue: boolean;
  isDueWithin7Days: boolean;
  showAlert: boolean;
  pendingCount: number;
}

export function getDeadlineInfo(task: Pick<Task, "status" | "dueDate" | "startDate" | "pendingCount">): DeadlineInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const noAlert: DeadlineInfo = {
    remainingDays: 0,
    totalDuration: 0,
    message: "",
    isOverdue: false,
    isDueWithin7Days: false,
    showAlert: false,
    pendingCount: task.pendingCount,
  };

  // Completed tasks: suppress all alerts
  if (task.status === "Completed") return noAlert;

  // No due date: cannot calculate
  if (!task.dueDate) return noAlert;

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let totalDuration = 0;
  if (task.startDate) {
    const start = new Date(task.startDate);
    start.setHours(0, 0, 0, 0);
    totalDuration = Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isOverdue = remainingDays < 0;
  const isDueWithin7Days = remainingDays >= 0 && remainingDays <= 7;

  let message = "";
  if (isOverdue) {
    message = `Overdue by ${Math.abs(remainingDays)} day${Math.abs(remainingDays) !== 1 ? "s" : ""}`;
  } else if (remainingDays === 0) {
    message = "Due today";
  } else if (remainingDays === 1) {
    message = "1 day remaining to complete the task";
  } else if (remainingDays <= 7) {
    message = `${remainingDays} days remaining to complete the task`;
  }

  const showAlert = isOverdue || isDueWithin7Days;

  return {
    remainingDays,
    totalDuration,
    message,
    isOverdue,
    isDueWithin7Days,
    showAlert,
    pendingCount: task.pendingCount,
  };
}

/** Inline alert shown beside a task row */
export function DeadlineAlert({ task }: { task: Task }) {
  const info = useMemo(() => getDeadlineInfo(task), [task]);

  if (!info.showAlert) return null;

  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap ${
      info.isOverdue ? "text-destructive font-bold" : "text-destructive"
    }`}>
      {info.isOverdue ? <AlertTriangle size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
      <span>
        <span className="font-bold">Pending: {info.pendingCount}</span>
        {" | "}
        {info.message}
      </span>
    </div>
  );
}

/** Summary cards for dashboard — two rows: Tasks + Sub-tasks */
export function DeadlineSummaryCards({ tasks }: { tasks: Task[] }) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let taskOverdue = 0;
    let taskDueSoon = 0;
    let taskCompleted = 0;
    const totalMainTasks = tasks.length;

    let subOverdue = 0;
    let subDueSoon = 0;
    let subCompleted = 0;
    let totalSubTasks = 0;

    tasks.forEach(t => {
      // Parent task stats
      if (t.status === "Completed") {
        taskCompleted++;
      } else if (t.dueDate) {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        const remaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (remaining < 0) taskOverdue++;
        else if (remaining <= 7) taskDueSoon++;
      }

      // Sub-task stats
      t.subTasks.forEach(st => {
        totalSubTasks++;
        const stStatus = (st as any).status as string;
        const stDueDate = (st as any).dueDate as string | undefined;

        if (stStatus === "Completed") {
          subCompleted++;
        } else if (stDueDate) {
          const due = new Date(stDueDate);
          due.setHours(0, 0, 0, 0);
          const remaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (remaining < 0) subOverdue++;
          else if (remaining <= 7) subDueSoon++;
        }
      });
    });

    return {
      totalMainTasks, taskOverdue, taskDueSoon, taskCompleted,
      totalSubTasks, subOverdue, subDueSoon, subCompleted,
    };
  }, [tasks]);

  const taskCards = [
    { label: "Total Tasks", value: stats.totalMainTasks, icon: ListChecks, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { label: "Completed", value: stats.taskCompleted, icon: CheckCircle2, color: "text-success", bg: "bg-success/10 border-success/20" },
    { label: "Overdue", value: stats.taskOverdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
    { label: "Due Within 7 Days", value: stats.taskDueSoon, icon: Clock, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  ];

  const subTaskCards = [
    { label: "Total Sub-tasks", value: stats.totalSubTasks, icon: ListChecks, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { label: "Completed", value: stats.subCompleted, icon: CheckCircle2, color: "text-success", bg: "bg-success/10 border-success/20" },
    { label: "Overdue", value: stats.subOverdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
    { label: "Due Within 7 Days", value: stats.subDueSoon, icon: Clock, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  ];

  const renderRow = (title: string, cards: typeof taskCards) => (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label + title} className={`rounded-lg border p-4 ${c.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={16} className={c.color} />
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderRow("Tasks Summary", taskCards)}
      <hr className="border-border" />
      {renderRow("Sub-tasks Summary", subTaskCards)}
    </div>
  );
}
