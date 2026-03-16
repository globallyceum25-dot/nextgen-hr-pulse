import { useMemo } from "react";
import { mockTasks, SECTORS, RESPONSIBLE_PERSONS } from "@/data/mockData";
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
];

export default function Analytics({ selectedSector }: AnalyticsProps) {
  const filtered = useMemo(() => {
    return selectedSector ? mockTasks.filter(t => t.sectorId === selectedSector) : mockTasks;
  }, [selectedSector]);

  const statusDist = useMemo(() => {
    const counts = { Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 };
    filtered.forEach(t => counts[t.status]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

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
        {/* Status Distribution */}
        <div className="bg-card rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">Task Status Distribution</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusDist.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
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
