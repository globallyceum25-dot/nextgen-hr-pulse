import { useEffect, useMemo, useState } from "react";
import { getLiveTasks, SECTORS, TASKS_UPDATED_EVENT, type Task, getKPIData } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KPICard from "@/components/dashboard/KPICard";

interface AnalyticsProps {
  selectedSector: number | null;
}

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(188, 86%, 43%)",
  "hsl(220, 13%, 56%)",
];

function areTasksEqual(a: Task[], b: Task[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

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
  const [liveTasks, setLiveTasks] = useState<Task[]>(() => getLiveTasks());

  useEffect(() => {
    const syncTasks = () => {
      const latest = getLiveTasks();
      setLiveTasks(prev => (areTasksEqual(prev, latest) ? prev : latest));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") syncTasks();
    };
    window.addEventListener(TASKS_UPDATED_EVENT, syncTasks as EventListener);
    window.addEventListener("storage", syncTasks);
    window.addEventListener("focus", syncTasks);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener(TASKS_UPDATED_EVENT, syncTasks as EventListener);
      window.removeEventListener("storage", syncTasks);
      window.removeEventListener("focus", syncTasks);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const filtered = useMemo(() => {
    return selectedSector ? liveTasks.filter(t => t.sectorId === selectedSector) : liveTasks;
  }, [selectedSector, liveTasks]);

  const kpiData = useMemo(() => getKPIData(selectedSector ?? undefined, liveTasks), [selectedSector, liveTasks]);

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = { Completed: 0, "Almost Completed": 0, "In Progress": 0, Started: 0, Pending: 0, "Not Started": 0, Overdue: 0 };
    filtered.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const subTaskStatusDist = useMemo(() => {
    const counts: Record<string, number> = { Completed: 0, "Almost Completed": 0, "In Progress": 0, Started: 0, "Not Started": 0 };
    filtered.forEach(t => {
      (t.subTasks || []).forEach(st => { if (counts[st.status] !== undefined) counts[st.status]++; });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const totalTasks = useMemo(() => statusDist.reduce((s, d) => s + d.value, 0), [statusDist]);
  const totalSubTasks = useMemo(() => subTaskStatusDist.reduce((s, d) => s + d.value, 0), [subTaskStatusDist]);

  // Task KPI monitoring data - per task KPI details
  const taskKpiData = useMemo(() => {
    return filtered.map(t => ({
      name: t.name.length > 25 ? t.name.slice(0, 25) + "…" : t.name,
      fullName: t.name,
      target: t.kpiTargetPercent,
      achievement: Math.round(t.kpiAchievement * 100) / 100,
      progress: t.progress,
      status: t.status,
      responsible: t.responsible,
      priority: t.priority,
    }));
  }, [filtered]);

  const employeePerf = useMemo(() => {
    const map = new Map<string, { total: number; kpiAchievementSum: number; completed: number; progressSum: number }>();
    filtered.forEach(t => {
      const e = map.get(t.responsible) || { total: 0, kpiAchievementSum: 0, completed: 0, progressSum: 0 };
      e.total++;
      e.kpiAchievementSum += t.kpiAchievement;
      e.progressSum += t.progress;
      if (t.status === "Completed") e.completed++;
      map.set(t.responsible, e);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name: name.split(" ")[0],
        fullName: name,
        kpi: Math.round(d.kpiAchievementSum / d.total),
        completion: Math.round((d.completed / d.total) * 100),
        avgProgress: Math.round(d.progressSum / d.total),
        tasks: d.total,
        completed: d.completed,
      }))
      .sort((a, b) => b.kpi - a.kpi)
      .slice(0, 10);
  }, [filtered]);

  const sectorName = selectedSector ? SECTORS.find(s => s.id === selectedSector)?.name : "All Sectors";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Task Analysis</h1>
        <p className="text-sm text-muted-foreground">{sectorName} — Performance Overview</p>
      </div>

      <Tabs defaultValue="executive-summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executive-summary">Executive Summary</TabsTrigger>
          <TabsTrigger value="task-kpi">Task KPI Monitoring</TabsTrigger>
          <TabsTrigger value="employee-performance">Employee Performance</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: Executive Summary ===== */}
        <TabsContent value="executive-summary" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiData.map(d => <KPICard key={d.label} data={d} />)}
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: "1px solid hsl(214, 32%, 91%)" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="target" name="KPI Target %" fill="hsl(214, 32%, 91%)" radius={[0, 3, 3, 0]} />
                <Bar dataKey="achievement" name="KPI Achievement %" fill="hsl(217, 91%, 60%)" radius={[0, 3, 3, 0]} />
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
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.status === "Completed" ? "bg-success/10 text-success" : t.status === "In Progress" || t.status === "Almost Completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
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
          {/* Employee KPI Rankings */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Employee KPI Rankings</h2>
            <div className="space-y-4">
              {employeePerf.map((emp, i) => (
                <div key={emp.fullName} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm text-card-foreground w-24 truncate">{emp.fullName}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${emp.kpi}%`, backgroundColor: emp.kpi >= 50 ? "hsl(217, 91%, 60%)" : "hsl(38, 92%, 50%)" }} />
                  </div>
                  <span className="text-sm font-semibold text-card-foreground w-10 text-right">{emp.kpi}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Summary Table */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Employee Performance Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Employee</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total Tasks</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completed</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completion Rate</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg Progress</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg KPI Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePerf.map((emp, i) => (
                    <tr key={emp.fullName} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-card-foreground font-medium">{emp.fullName}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.tasks}</td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.completed}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-semibold ${emp.completion >= 80 ? "text-success" : emp.completion >= 50 ? "text-primary" : "text-warning"}`}>{emp.completion}%</span>
                      </td>
                      <td className="px-3 py-2 text-center text-card-foreground">{emp.avgProgress}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-semibold ${emp.kpi >= 80 ? "text-success" : emp.kpi >= 50 ? "text-primary" : emp.kpi >= 30 ? "text-warning" : "text-destructive"}`}>{emp.kpi}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Performance Chart */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-card-foreground mb-4">Employee Performance — KPI vs Completion Rate</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeePerf} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px", border: "1px solid hsl(214, 32%, 91%)" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="kpi" name="Avg KPI Achievement" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completion" name="Completion Rate" fill="hsl(160, 84%, 39%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}