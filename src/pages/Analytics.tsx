import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import type { DbTask } from "@/types/tasks";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine, LabelList } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsProps {
  selectedSector: number | null;
}

// Formal corporate color palette for donut/pie charts - high contrast & distinguishable
const COLORS = [
  "hsl(152, 45%, 40%)",   // Forest green (Completed)
  "hsl(215, 50%, 42%)",   // Deep navy blue
  "hsl(35, 65%, 50%)",    // Warm amber (In Progress)
  "hsl(0, 50%, 48%)",     // Muted crimson
  "hsl(270, 35%, 50%)",   // Plum purple (Pending)
  "hsl(195, 40%, 48%)",   // Teal
  "hsl(220, 15%, 55%)",   // Cool grey
  "hsl(45, 70%, 50%)",    // Gold
  "hsl(330, 40%, 50%)",   // Rose
  "hsl(160, 40%, 45%)",   // Sage
];

// Chart-specific formal colors
const CHART_COLORS = {
  primary: "hsl(215, 50%, 35%)",
  secondary: "hsl(200, 30%, 65%)",
  accent: "hsl(210, 40%, 52%)",
  target: "hsl(215, 50%, 35%)",
  achievement: "hsl(200, 30%, 65%)",
  workload: "hsl(215, 50%, 35%)",
  output: "hsl(195, 35%, 55%)",
  referenceLine: "hsl(0, 45%, 45%)",
  grid: "hsl(214, 20%, 88%)",
  axisText: "hsl(215, 16%, 47%)",
};

const RADIAN = Math.PI / 180;

function renderPieLabel(total: number) {
  return ({ value, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
    if (!value || total === 0) return null;
    const pct = ((value / total) * 100).toFixed(1);
    if (parseFloat(pct) < 3) return null;
    const radius = (innerRadius + outerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <g>
        <rect x={x - 16} y={y - 8} width={32} height={16} rx={3} fill="white" fillOpacity={0.85} />
        <text x={x} y={y} fill="#000000" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700}>{pct}%</text>
      </g>
    );
  };
}

export default function Analytics({ selectedSector }: AnalyticsProps) {
  const { data: tasks = [], isLoading } = useTasks();

  const filtered = useMemo(() => tasks, [tasks]);

  // KPI summary - Tasks
  const kpiData = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(t => t.status === "Completed" || t.status === "Closed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgKpi = total > 0 ? Math.round(filtered.reduce((s, t) => s + Number(t.kpi_achievement), 0) / total) : 0;
    const overdue = filtered.filter(t => {
      if (t.status === "Completed" || t.status === "Closed") return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length;
    return [
      { label: "Total Tasks", value: total },
      { label: "Completion Rate", value: completionRate, suffix: "%" },
      { label: "Avg KPI Score", value: avgKpi },
      { label: "Overdue Tasks", value: overdue },
    ];
  }, [filtered]);

  // KPI summary - Sub-tasks
  const subTaskKpiData = useMemo(() => {
    const allSubs = filtered.flatMap(t => (t.sub_tasks || []).map(st => ({ ...st, parentKpiTarget: Number(t.kpi_target_percent) || 100 })));
    const total = allSubs.length;
    const completed = allSubs.filter(st => st.status === "Completed" || st.status === "Closed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgKpi = total > 0 ? Math.round(allSubs.reduce((s, st) => {
      const kpi = st.parentKpiTarget > 0 ? Math.min((Number(st.progress) / st.parentKpiTarget) * 100, 100) : 0;
      return s + kpi;
    }, 0) / total) : 0;
    const overdue = allSubs.filter(st => {
      if (st.status === "Completed" || st.status === "Closed") return false;
      if (!st.due_date) return false;
      return new Date(st.due_date) < new Date();
    }).length;
    return [
      { label: "Total Sub-Tasks", value: total },
      { label: "Completion Rate", value: completionRate, suffix: "%" },
      { label: "Avg KPI Score", value: avgKpi },
      { label: "Overdue Sub-Tasks", value: overdue },
    ];
  }, [filtered]);

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const subTaskStatusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(t => {
      (t.sub_tasks || []).forEach(st => { counts[st.status] = (counts[st.status] ?? 0) + 1; });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const totalTasks = useMemo(() => statusDist.reduce((s, d) => s + d.value, 0), [statusDist]);
  const totalSubTasks = useMemo(() => subTaskStatusDist.reduce((s, d) => s + d.value, 0), [subTaskStatusDist]);

  const taskKpiData = useMemo(() => {
    return filtered.map(t => ({
      name: t.title.length > 25 ? t.title.slice(0, 25) + "…" : t.title,
      fullName: t.title,
      target: Number(t.kpi_target_percent),
      achievement: Math.round(Number(t.kpi_achievement) * 100) / 100,
      progress: Number(t.progress),
      status: t.status,
      responsible: t.assignee_profile?.full_name || "Unassigned",
      priority: t.priority,
    }));
  }, [filtered]);

  // KPI Achievement Distribution for donut chart
  const KPI_RATING_COLORS = [
    "hsl(270, 35%, 50%)",   // 1 - Unsatisfactory (purple)
    "hsl(215, 50%, 42%)",   // 2 - Needs Improvement (blue)
    "hsl(35, 65%, 50%)",    // 3 - Meets Expectations (amber)
    "hsl(160, 40%, 45%)",   // 4 - Very Good (green)
    "hsl(45, 70%, 50%)",    // 5 - Exceeds Expectations (gold)
  ];

  const kpiAchievementDist = useMemo(() => {
    const buckets = [
      { name: "1 - Unsatisfactory / Below Expectations", value: 0 },
      { name: "2 - Needs Improvement", value: 0 },
      { name: "3 - Meets Expectations", value: 0 },
      { name: "4 - Very Good / Above Expectations", value: 0 },
      { name: "5 - Exceeds Expectations", value: 0 },
    ];
    filtered.forEach(t => {
      const kpi = Number(t.kpi_achievement) || 0;
      if (kpi <= 20) buckets[0].value++;
      else if (kpi <= 40) buckets[1].value++;
      else if (kpi <= 60) buckets[2].value++;
      else if (kpi <= 80) buckets[3].value++;
      else buckets[4].value++;
    });
    return buckets.filter(b => b.value > 0);
  }, [filtered]);
  // Employee Performance: Tasks=1.0, Sub-tasks=0.5
  // Step 1: Calculate task perf & sub-task perf separately per employee
  // Step 2: Combine with weighted average: (taskPerf×1.0 + subTaskPerf×0.5) / (1.0+0.5)
  // If only tasks → taskPerf. If only sub-tasks → subTaskPerf × 0.5
  const employeePerf = useMemo(() => {
    const TYPE_TASK = 1.0;
    const TYPE_SUBTASK = 0.5;

    const map = new Map<string, {
      taskWeightedNum: number; taskWeightedDen: number;
      stWeightedNum: number; stWeightedDen: number;
    }>();

    filtered.forEach(t => {
      // Main task → assigned to task assignee
      const taskKey = t.assignee_profile?.full_name || (t as any).assignee_name || "Unassigned";
      const te = map.get(taskKey) || { taskWeightedNum: 0, taskWeightedDen: 0, stWeightedNum: 0, stWeightedDen: 0 };
      const tw = Number(t.task_weight ?? 0);
      const tp = Number(t.progress ?? 0) / 100;
      te.taskWeightedNum += tw * tp;
      te.taskWeightedDen += tw;
      map.set(taskKey, te);

      // Sub-tasks → assigned to sub-task assignee
      (t.sub_tasks || []).forEach(st => {
        const stKey = (st as any).assignee_name || taskKey;
        const se = map.get(stKey) || { taskWeightedNum: 0, taskWeightedDen: 0, stWeightedNum: 0, stWeightedDen: 0 };
        const sw = Number(st.task_weight ?? 0);
        const sp = Number(st.progress ?? 0) / 100;
        se.stWeightedNum += sw * sp;
        se.stWeightedDen += sw;
        map.set(stKey, se);
      });
    });

    return Array.from(map.entries())
      .map(([name, d]) => {
        const hasTask = d.taskWeightedDen > 0;
        const hasSt = d.stWeightedDen > 0;
        const taskPerf = hasTask ? (d.taskWeightedNum / d.taskWeightedDen) * 100 : 0;
        const stPerf = hasSt ? (d.stWeightedNum / d.stWeightedDen) * 100 : 0;

        let overall = 0;
        if (hasTask && hasSt) {
          // Weighted average: tasks count 1.0, sub-tasks count 0.5
          overall = (taskPerf * TYPE_TASK + stPerf * TYPE_SUBTASK) / (TYPE_TASK + TYPE_SUBTASK);
        } else if (hasTask) {
          overall = taskPerf;
        } else if (hasSt) {
          overall = stPerf * TYPE_SUBTASK;
        }

        return {
          name: name.length > 15 ? name.slice(0, 15) + "…" : name,
          fullName: name,
          overallWeightedPerformance: Math.round(overall * 100) / 100,
        };
      })
      .sort((a, b) => b.overallWeightedPerformance - a.overallWeightedPerformance)
      .slice(0, 10);
  }, [filtered]);

  // Task-only summary (main tasks grouped by assignee)
  const taskOnlyPerf = useMemo(() => {
    const map = new Map<string, {
      total: number; completed: number; progressSum: number; kpiSum: number;
      weightedScoreSum: number; taskWeightSum: number;
    }>();
    filtered.forEach(t => {
      const key = t.assignee_profile?.full_name || (t as any).assignee_name || "Unassigned";
      const e = map.get(key) || { total: 0, completed: 0, progressSum: 0, kpiSum: 0, weightedScoreSum: 0, taskWeightSum: 0 };
      e.total++;
      if (t.status === "Completed" || t.status === "Closed") e.completed++;
      e.progressSum += Number(t.progress ?? 0);
      e.kpiSum += Number(t.kpi_achievement ?? 0);
      e.weightedScoreSum += Number(t.weighted_score ?? 0);
      e.taskWeightSum += Number(t.task_weight ?? 0);
      map.set(key, e);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        fullName: name,
        total: d.total,
        completed: d.completed,
        avgProgress: d.total > 0 ? Math.round(d.progressSum / d.total) : 0,
        avgKpi: d.total > 0 ? Math.round(d.kpiSum / d.total) : 0,
        overallWeightedPerf: d.taskWeightSum > 0 ? Math.round((d.weightedScoreSum / d.taskWeightSum) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.overallWeightedPerf - a.overallWeightedPerf);
  }, [filtered]);

  // Sub-task performance grouped by sub-task's own assignee
  const subTaskPerf = useMemo(() => {
    const map = new Map<string, {
      stTotal: number; stCompleted: number; stProgressSum: number; stKpiAchievementSum: number;
      stWeightedScoreSum: number; stTaskWeightSum: number;
    }>();
    filtered.forEach(t => {
      (t.sub_tasks || []).forEach(st => {
        const key = (st as any).assignee_name || t.assignee_profile?.full_name || (t as any).assignee_name || "Unassigned";
        const e = map.get(key) || {
          stTotal: 0, stCompleted: 0, stProgressSum: 0, stKpiAchievementSum: 0, stWeightedScoreSum: 0, stTaskWeightSum: 0,
        };
        e.stTotal++;
        if (st.status === "Completed" || st.status === "Closed") e.stCompleted++;
        const stProgress = Number(st.progress);
        e.stProgressSum += stProgress;
        const stKpiTarget = Number(t.kpi_target_percent) || 100;
        e.stKpiAchievementSum += stKpiTarget > 0 ? Math.min((stProgress / stKpiTarget) * 100, 100) : 0;
        e.stWeightedScoreSum += Number(st.weighted_score ?? 0);
        e.stTaskWeightSum += Number(st.task_weight ?? 0);
        map.set(key, e);
      });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name: name.length > 15 ? name.slice(0, 15) + "…" : name,
        fullName: name,
        stTotal: d.stTotal,
        stCompleted: d.stCompleted,
        stAvgProgress: d.stTotal > 0 ? Math.round(d.stProgressSum / d.stTotal) : 0,
        stAvgKpi: d.stTotal > 0 ? Math.round(d.stKpiAchievementSum / d.stTotal) : 0,
        stOverallWeightedPerf: d.stTaskWeightSum > 0 ? Math.round((d.stWeightedScoreSum / d.stTaskWeightSum) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.stOverallWeightedPerf - a.stOverallWeightedPerf)
      .slice(0, 10);
  }, [filtered]);

  // Workload vs Output grouped by sub-task assignee
  const workloadVsOutput = useMemo(() => {
    const map = new Map<string, { totalSubTasks: number; completedSubTasks: number }>();
    filtered.forEach(t => {
      (t.sub_tasks || []).forEach(st => {
        const key = (st as any).assignee_name || t.assignee_profile?.full_name || (t as any).assignee_name || "Unassigned";
        const e = map.get(key) || { totalSubTasks: 0, completedSubTasks: 0 };
        e.totalSubTasks++;
        if (st.status === "Completed" || st.status === "Closed") e.completedSubTasks++;
        map.set(key, e);
      });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name: name.length > 15 ? name.slice(0, 15) + "…" : name,
        fullName: name,
        totalSubTasks: d.totalSubTasks,
        completedSubTasks: d.completedSubTasks,
      }))
      .sort((a, b) => b.totalSubTasks - a.totalSubTasks);
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Task Analysis</h1>
        <p className="text-sm text-muted-foreground">Performance Overview</p>
      </div>

      <Tabs defaultValue="executive-summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executive-summary">Executive Summary</TabsTrigger>
          <TabsTrigger value="task-kpi">Task KPI Monitoring</TabsTrigger>
          <TabsTrigger value="employee-performance">Employee Performance</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: Executive Summary ===== */}
        <TabsContent value="executive-summary" className="space-y-6 mt-4">
          {/* Task KPI Cards */}
          <div>
            <h2 className="text-sm font-semibold text-card-foreground mb-2">Tasks</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map(d => (
                <div key={d.label} className="bg-card rounded-lg border p-4">
                  <span className="text-xs text-muted-foreground">{d.label}</span>
                  <p className="text-2xl font-bold text-foreground mt-1">{d.value}{(d as any).suffix || ""}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-Task KPI Cards */}
          <div>
            <h2 className="text-sm font-semibold text-card-foreground mb-2">Sub-Tasks</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {subTaskKpiData.map(d => (
                <div key={d.label} className="bg-card rounded-lg border p-4">
                  <span className="text-xs text-muted-foreground">{d.label}</span>
                  <p className="text-2xl font-bold text-foreground mt-1">{d.value}{(d as any).suffix || ""}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Task Status Distribution */}
            <div className="bg-card rounded-lg border p-5">
              <h2 className="text-sm font-semibold text-card-foreground mb-4">Task Status Distribution</h2>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} label={renderPieLabel(totalTasks)} labelLine={false}>
                      {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusDist.map((item, i) => {
                    const pct = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold text-card-foreground ml-auto">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-Task Status Distribution */}
            <div className="bg-card rounded-lg border p-5">
              <h2 className="text-sm font-semibold text-card-foreground mb-4">Sub-Task Status Distribution <span className="text-muted-foreground font-normal">({totalSubTasks} sub-tasks)</span></h2>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={subTaskStatusDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} label={renderPieLabel(totalSubTasks)} labelLine={false}>
                      {subTaskStatusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {subTaskStatusDist.map((item, i) => {
                    const pct = totalSubTasks > 0 ? Math.round((item.value / totalSubTasks) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-semibold text-card-foreground ml-auto">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB 2: Task KPI Monitoring ===== */}
        <TabsContent value="task-kpi" className="space-y-6 mt-4">
          {/* KPI Achievement Overview Chart */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">KPI Achievement vs Target by Task</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={taskKpiData.slice(0, 15)} barGap={2} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10, fill: CHART_COLORS.axisText }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: `1px solid ${CHART_COLORS.grid}` }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="target" name="KPI Target %" fill={CHART_COLORS.secondary} radius={[0, 3, 3, 0]} />
                <Bar dataKey="achievement" name="KPI Achievement %" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task KPI Table */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Task KPI Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Task Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Responsible</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Priority</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Progress</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">KPI Target %</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">KPI Achievement %</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {taskKpiData.map((t, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-card-foreground font-medium" title={t.fullName}>{t.name}</td>
                      <td className="px-3 py-2 text-card-foreground">{t.responsible}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.priority === "High" ? "bg-destructive/10 text-destructive" : t.priority === "Medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>{t.priority}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-muted-foreground w-8 text-right">{t.progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-card-foreground">{t.target}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-semibold ${t.achievement >= 80 ? "text-success" : t.achievement >= 50 ? "text-primary" : t.achievement >= 30 ? "text-warning" : "text-destructive"}`}>{t.achievement.toFixed(2)}%</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.status === "Completed" ? "bg-success/10 text-success" : t.status === "In Progress" || t.status === "Under Review" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB 3: Employee Performance ===== */}
        <TabsContent value="employee-performance" className="space-y-6 mt-4">
          {/* Employee Performance Chart - Overall Weighted Performance */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Employee Performance Chart</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={employeePerf} barGap={2} margin={{ bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} label={{ value: "Responsible Person", position: "insideBottom", offset: -15, fontSize: 12, fill: CHART_COLORS.axisText }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} tickFormatter={(v: number) => `${v}%`} label={{ value: "Overall Weighted Performance", angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: CHART_COLORS.axisText }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: `1px solid ${CHART_COLORS.grid}` }} formatter={(value: number) => [`${value}%`, "Overall Weighted Performance"]} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} />
                <ReferenceLine y={70} stroke={CHART_COLORS.referenceLine} strokeWidth={2} label={{ value: "Target Performance (0.7)", position: "insideTopLeft", fill: CHART_COLORS.referenceLine, fontSize: 11, fontWeight: 600 }} />
                <Bar dataKey="overallWeightedPerformance" name="Overall Weighted Performance" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="overallWeightedPerformance" position="top" fontSize={10} fontWeight={600} formatter={(v: number) => `${v}%`} fill={CHART_COLORS.axisText} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Work Load Vs Output of Employee (Sub Tasks) */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Work Load Vs Output of Employee (Sub Tasks)</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={workloadVsOutput} barGap={4} margin={{ bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} label={{ value: "Responsible Person", position: "insideBottom", offset: -15, fontSize: 12, fill: CHART_COLORS.axisText }} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axisText }} label={{ value: "Total Tasks", angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: CHART_COLORS.axisText }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: `1px solid ${CHART_COLORS.grid}` }} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} />
                <Bar dataKey="totalSubTasks" name="Total Tasks" fill={CHART_COLORS.workload} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="totalSubTasks" position="top" fontSize={10} fontWeight={700} fill={CHART_COLORS.workload} />
                </Bar>
                <Bar dataKey="completedSubTasks" name="Completed" fill={CHART_COLORS.output} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="completedSubTasks" position="top" fontSize={10} fontWeight={700} fill={CHART_COLORS.output} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task Summary Table */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Task Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Employee</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total Tasks</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completed</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg Progress</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg KPI Achievement</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Overall Weighted Perf.</th>
                  </tr>
                </thead>
                <tbody>
                  {taskOnlyPerf.map((emp, i) => (
                    <tr key={emp.fullName} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-card-foreground font-medium">{emp.fullName}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.total}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.completed}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.avgProgress}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-semibold ${emp.avgKpi >= 80 ? "text-success" : emp.avgKpi >= 50 ? "text-primary" : emp.avgKpi >= 30 ? "text-warning" : "text-destructive"}`}>{emp.avgKpi}%</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-bold ${emp.overallWeightedPerf >= 70 ? "text-success" : emp.overallWeightedPerf >= 50 ? "text-primary" : emp.overallWeightedPerf >= 30 ? "text-warning" : "text-destructive"}`}>{emp.overallWeightedPerf}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-Task Summary Table */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Sub-Task Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Employee</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total Sub-Tasks</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completed</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg Progress</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg KPI Achievement</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Overall Weighted Perf.</th>
                  </tr>
                </thead>
                <tbody>
                  {subTaskPerf.map((emp, i) => (
                    <tr key={emp.fullName} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-card-foreground font-medium">{emp.fullName}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.stTotal}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.stCompleted}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.stAvgProgress}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-semibold ${emp.stAvgKpi >= 80 ? "text-success" : emp.stAvgKpi >= 50 ? "text-primary" : emp.stAvgKpi >= 30 ? "text-warning" : "text-destructive"}`}>{emp.stAvgKpi}%</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-bold ${emp.stOverallWeightedPerf >= 70 ? "text-success" : emp.stOverallWeightedPerf >= 50 ? "text-primary" : emp.stOverallWeightedPerf >= 30 ? "text-warning" : "text-destructive"}`}>{emp.stOverallWeightedPerf}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}