import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useActivityLog, type ActivityEntry } from "@/contexts/ActivityLogContext";
import type { DbTask } from "@/types/tasks";
import { getDeadlineInfo, getStatusColor, getPriorityColor } from "@/types/tasks";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import { Clock, Plus, Pencil, CheckCircle2, ListChecks, AlertTriangle, TrendingUp, Users, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardProps {
  selectedSector: number | null;
}

function getActionIcon(action: ActivityEntry["action"]) {
  switch (action) {
    case "created": return <Plus className="h-4 w-4 text-emerald-500" />;
    case "updated": return <Pencil className="h-4 w-4 text-blue-500" />;
    case "completed": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "subtask_updated": return <ListChecks className="h-4 w-4 text-orange-500" />;
    case "subtask_completed": return <CheckCircle2 className="h-4 w-4 text-teal-500" />;
  }
}

function getActionLabel(action: ActivityEntry["action"]) {
  switch (action) {
    case "created": return "Task Created";
    case "updated": return "Task Updated";
    case "completed": return "Task Completed";
    case "subtask_updated": return "Sub-task Updated";
    case "subtask_completed": return "Sub-task Completed";
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  Created: "hsl(215, 50%, 42%)",
  Assigned: "hsl(200, 60%, 48%)",
  "In Progress": "hsl(35, 65%, 50%)",
  Pending: "hsl(25, 75%, 55%)",
  "Under Review": "hsl(270, 35%, 50%)",
  Completed: "hsl(152, 45%, 40%)",
  Closed: "hsl(220, 15%, 55%)",
  "On Hold": "hsl(45, 70%, 50%)",
  Cancelled: "hsl(0, 50%, 48%)",
  Overdue: "hsl(0, 70%, 55%)",
};

export default function Dashboard({ selectedSector }: DashboardProps) {
  const { data: tasks = [], isLoading } = useTasks();
  const { entries } = useActivityLog();

  const stats = useMemo(() => {
    const total = tasks.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completed = tasks.filter(t => t.status === "Completed" || t.status === "Closed").length;
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    const pending = tasks.filter(t => ["Created", "Assigned", "Pending"].includes(t.status)).length;
    const overdue = tasks.filter(t => {
      const dl = getDeadlineInfo(t.due_date, t.status);
      return dl.isOverdue;
    }).length;
    const underReview = tasks.filter(t => t.status === "Under Review").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgKpi = total > 0 ? Math.round(tasks.reduce((s, t) => s + Number(t.kpi_achievement), 0) / total) : 0;

    // Status distribution for pie chart
    const statusDist = Object.entries(
      tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "hsl(220, 15%, 55%)" }));

    // Priority distribution
    const priorityDist = Object.entries(
      tasks.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    // Due this week
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeek = tasks.filter(t => {
      if (!t.due_date || t.status === "Completed" || t.status === "Closed") return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due >= today && due <= weekEnd;
    }).length;

    return { total, completed, inProgress, pending, overdue, underReview, completionRate, avgKpi, statusDist, priorityDist, dueThisWeek };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Lyceum Global Holdings — Task Management Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, icon: ListChecks, color: "text-foreground", bg: "bg-card" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "In Progress", value: stats.inProgress, icon: TrendingUp, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50" },
          { label: "Under Review", value: stats.underReview, icon: Users, color: "text-purple-700", bg: "bg-purple-50" },
          { label: "Due This Week", value: stats.dueThisWeek, icon: Calendar, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Completion %", value: `${stats.completionRate}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/5" },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-lg border p-3 flex flex-col`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <card.icon size={14} className="text-muted-foreground" />
            </div>
            <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Task Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {stats.statusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.statusDist.map(s => (
              <div key={s.name} className="flex items-center gap-1 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Tasks by Priority</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.priorityDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.priorityDist.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.name === "Critical" ? "hsl(0, 70%, 55%)" :
                      entry.name === "High" ? "hsl(25, 75%, 55%)" :
                      entry.name === "Medium" ? "hsl(215, 50%, 50%)" : "hsl(220, 15%, 60%)"
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Overdue Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                {getActionIcon(entry.action)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-card-foreground">{getActionLabel(entry.action)}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{entry.taskName} — {entry.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(entry.timestamp)}</span>
              </div>
            ))}
            {entries.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No recent activity.</p>}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            Overdue Tasks ({stats.overdue})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tasks.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).map(task => {
              const dl = getDeadlineInfo(task.due_date, task.status);
              return (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded bg-red-50/50 border border-red-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">Due: {task.due_date}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-red-600 whitespace-nowrap">{dl.label}</span>
                </div>
              );
            })}
            {stats.overdue === 0 && <p className="text-xs text-emerald-600 text-center py-4">🎉 No overdue tasks!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
