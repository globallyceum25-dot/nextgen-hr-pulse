import { useMemo } from "react";
import KPICard from "@/components/dashboard/KPICard";
import { getKPIData, getMonthlyTrend, getSectorPerformance, SECTORS } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";

interface DashboardProps {
  selectedSector: number | null;
}

export default function Dashboard({ selectedSector }: DashboardProps) {
  const kpis = useMemo(() => getKPIData(selectedSector ?? undefined), [selectedSector]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(), []);
  const sectorPerf = useMemo(() => getSectorPerformance(), []);

  const sectorName = selectedSector
    ? SECTORS.find(s => s.id === selectedSector)?.name
    : "All Sectors";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{sectorName} — March 2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KPICard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <div className="bg-card rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">Monthly Task Completion</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 32%, 91%)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="completed" fill="hsl(160, 84%, 39%)" radius={[3, 3, 0, 0]} name="Completed" />
              <Bar dataKey="pending" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* KPI Trend */}
        <div className="bg-card rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">KPI Score Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 32%, 91%)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="kpiAvg" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(217, 91%, 60%)" }} name="Avg KPI" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Performance */}
      {!selectedSector && (
        <div className="bg-card rounded-lg border p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">Sector Performance Comparison</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sectorPerf} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 32%, 91%)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="completion" name="Completion %" radius={[0, 3, 3, 0]}>
                {sectorPerf.map((entry, i) => (
                  <Cell key={i} fill={entry.completion >= 60 ? "hsl(160, 84%, 39%)" : entry.completion >= 40 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
