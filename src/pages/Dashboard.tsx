import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useActivityLog, type ActivityEntry } from "@/contexts/ActivityLogContext";
import type { DbTask } from "@/types/tasks";
import { getDeadlineInfo } from "@/types/tasks";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell, PieChart, Pie, Legend, Area, AreaChart } from "recharts";
import { Clock, Plus, Pencil, CheckCircle2, ListChecks, AlertTriangle, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

const CHART_COLORS = {
  primary: "hsl(215, 50%, 35%)",
  secondary: "hsl(200, 30%, 65%)",
  accent: "hsl(152, 45%, 40%)",
  grid: "hsl(214, 20%, 88%)",
  axisText: "hsl(215, 16%, 47%)",
};

export default function Dashboard({ selectedSector }: DashboardProps) {
  const { data: tasks = [], isLoading } = useTasks();
  const { entries } = useActivityLog();
  const [dateRange, setDateRange] = useState<"all" | "week" | "month" | "quarter">("all");

  const filteredTasks = useMemo(() => {
    if (dateRange === "all") return tasks;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === "week") cutoff.setDate(now.getDate() - 7);
    else if (dateRange === "month") cutoff.setMonth(now.getMonth() - 1);
    else cutoff.setMonth(now.getMonth() - 3);
    return tasks.filter(t => new Date(t.created_at) >= cutoff);
  }, [tasks, dateRange]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completed = filteredTasks.filter(t => t.status === "Completed" || t.status === "Closed").length;
    const inProgress = filteredTasks.filter(t => t.status === "In Progress").length;
    const pending = filteredTasks.filter(t => ["Created", "Assigned", "Pending"].includes(t.status)).length;
    const overdue = filteredTasks.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).length;
    const underReview = filteredTasks.filter(t => t.status === "Under Review").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgKpi = total > 0 ? Math.round(filteredTasks.reduce((s, t) => s + Number(t.kpi_achievement), 0) / total) : 0;

    // Status distribution
    const statusDist = Object.entries(
      filteredTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "hsl(220, 15%, 55%)" }));

    // Priority distribution
    const priorityDist = Object.entries(
      filteredTasks.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    // Due this week
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeek = filteredTasks.filter(t => {
      if (!t.due_date || t.status === "Completed" || t.status === "Closed") return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return due >= today && due <= weekEnd;
    }).length;

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; created: number; completed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const created = tasks.filter(t => t.created_at.startsWith(monthKey)).length;
      const comp = tasks.filter(t => t.completed_date && t.completed_date.startsWith(monthKey)).length;
      monthlyTrend.push({ month: monthLabel, created, completed: comp });
    }

    // Tasks by department
    const deptDist = Object.entries(
      filteredTasks.reduce((acc, t) => {
        const dept = t.department?.department_name || "Unassigned";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Sub-task stats
    const allSubTasks = filteredTasks.flatMap(t => t.sub_tasks || []);
    const stTotal = allSubTasks.length;
    const stCompleted = allSubTasks.filter(s => s.status === "Completed" || s.status === "Closed").length;
    const stOverdue = allSubTasks.filter(s => getDeadlineInfo(s.due_date, s.status).isOverdue).length;

    return { total, completed, inProgress, pending, overdue, underReview, completionRate, avgKpi, statusDist, priorityDist, dueThisWeek, monthlyTrend, deptDist, stTotal, stCompleted, stOverdue };
  }, [filteredTasks, tasks]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground">Lyceum Global Holdings — Task Management Overview</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["all", "quarter", "month", "week"] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateRange === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r === "all" ? "All Time" : r === "quarter" ? "Quarter" : r === "month" ? "Month" : "Week"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards - Tasks */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tasks Overview</h3>
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
      </div>

      {/* Sub-task KPI Cards */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sub-tasks Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-lg border p-3 flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Sub-tasks</span>
            <span className="text-2xl font-bold text-foreground mt-1">{stats.stTotal}</span>
          </div>
          <div className="bg-emerald-50 rounded-lg border p-3 flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Completed</span>
            <span className="text-2xl font-bold text-emerald-700 mt-1">{stats.stCompleted}</span>
          </div>
          <div className="bg-red-50 rounded-lg border p-3 flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Overdue</span>
            <span className="text-2xl font-bold text-red-700 mt-1">{stats.stOverdue}</span>
          </div>
          <div className="bg-primary/5 rounded-lg border p-3 flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Completion %</span>
            <span className="text-2xl font-bold text-primary mt-1">{stats.stTotal > 0 ? Math.round((stats.stCompleted / stats.stTotal) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Status + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Task Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {stats.statusDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
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

        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Tasks by Priority</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.priorityDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
                <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: CHART_COLORS.axisText }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
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

      {/* Charts Row 2: Monthly Trend + Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Completion Trend */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Monthly Task Trend (6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="created" name="Created" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks by Department */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Tasks by Department</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
                <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: CHART_COLORS.axisText }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} formatter={(v: number, name: string, props: any) => [v, props.payload.fullName]} />
                <Bar dataKey="value" name="Tasks" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Overdue Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            Overdue Tasks ({stats.overdue})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredTasks.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).map(task => {
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
