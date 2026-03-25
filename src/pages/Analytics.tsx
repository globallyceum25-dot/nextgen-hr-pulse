import { useEffect, useMemo, useState } from "react";
import { getLiveTasks, SECTORS, TASKS_UPDATED_EVENT, type Task } from "@/data/mockData";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      "Almost Completed": 0,
      "In Progress": 0,
      Started: 0,
      Pending: 0,
      "Not Started": 0,
      Overdue: 0,
    };
    filtered.forEach(t => {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const subTaskStatusDist = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      "Almost Completed": 0,
      "In Progress": 0,
      Started: 0,
      "Not Started": 0,
    };
    filtered.forEach(t => {
      (t.subTasks || []).forEach(st => {
        if (counts[st.status] !== undefined) {
          counts[st.status]++;
        }
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const totalSubTasks = useMemo(() => subTaskStatusDist.reduce((s, d) => s + d.value, 0), [subTaskStatusDist]);

  const employeePerf = useMemo(() => {
    const map = new Map<string, { total: number; kpiSum: number; completed: number }>();
    filtered.forEach(t => {
      const e = map.get(t.responsible) || { total: 0, kpiSum: 0, completed: 0 };
      e.total++;
      e.kpiSum += t.kpiScore;
      if (t.status === "Completed") e.completed++;
      map.set(t.responsible, e);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name: name.split(" ")[0],
        fullName: name,
        kpi: Math.round(d.kpiSum / d.total),
        completion: Math.round((d.completed / d.total) * 100),
        tasks: d.total,
      }))
      .sort((a, b) => b.kpi - a.kpi)
      .slice(0, 10);
  }, [filtered]);

  const sectorName = selectedSector ? SECTORS.find(s => s.id === selectedSector)?.name : "All Sectors";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">KPI Analytics</h1>
        <p className="text-sm text-muted-foreground">{sectorName} — Performance Overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Status Distribution */}
        <div className="bg-card rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">Task Status Distribution</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusDist.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-card-foreground ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-Task Status Distribution */}
        <div className="bg-card rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">Sub-Task Status Distribution <span className="text-muted-foreground font-normal">({totalSubTasks} sub-tasks)</span></h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={subTaskStatusDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {subTaskStatusDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {subTaskStatusDist.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-card-foreground ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Employee KPI Ranking */}
      <div className="bg-card rounded-lg border p-5">
        <h2 className="text-sm font-semibold text-card-foreground mb-4">Employee KPI Rankings</h2>
        <div className="space-y-3">
          {employeePerf.slice(0, 6).map((emp, i) => (
            <div key={emp.fullName} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
              <span className="text-xs text-card-foreground w-20 truncate">{emp.fullName}</span>
              <div className="flex-1"><ProgressBar value={emp.kpi} size="sm" /></div>
            </div>
          ))}
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
            <Bar dataKey="kpi" name="KPI Score" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="completion" name="Completion %" fill="hsl(160, 84%, 39%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
