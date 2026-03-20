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

/** Summary card for dashboard */
export function DeadlineSummaryCards({ tasks }: { tasks: Task[] }) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdue = 0;
    let dueSoon = 0;
    let totalPending = 0;
    let completed = 0;
    const totalMainTasks = tasks.length;
    let totalSubTasks = 0;

    tasks.forEach(t => {
      totalSubTasks += t.totalTasks;

      if (t.status === "Completed") {
        completed++;
        return;
      }
      totalPending += t.pendingCount;

      if (!t.dueDate) return;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const remaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (remaining < 0) overdue++;
      else if (remaining <= 7) dueSoon++;
    });

    return { overdue, dueSoon, totalPending, completed, totalMainTasks, totalSubTasks };
  }, [tasks]);

  const cards = [
    {
      label: "Overdue Tasks",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10 border-destructive/20",
    },
    {
      label: "Due Within 7 Days",
      value: stats.dueSoon,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10 border-warning/20",
    },
    {
      label: "Main Tasks / Sub-tasks",
      value: `${stats.totalMainTasks} / ${stats.totalSubTasks}`,
      icon: ListChecks,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      subtitle: `Pending: ${stats.totalPending}`,
    },
    {
      label: "Completed Tasks",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10 border-success/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className={`rounded-lg border p-4 ${c.bg}`}>
          <div className="flex items-center gap-2 mb-1">
            <c.icon size={16} className={c.color} />
            <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
          </div>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
