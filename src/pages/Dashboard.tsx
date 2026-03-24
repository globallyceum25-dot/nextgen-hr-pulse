import { useMemo } from "react";
import KPICard from "@/components/dashboard/KPICard";
import { getKPIData, getMonthlyTrend, getSectorPerformance, SECTORS, getLiveTasks } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { useActivityLog, type ActivityEntry } from "@/contexts/ActivityLogContext";
import { Clock, Plus, Pencil, CheckCircle2, ListChecks } from "lucide-react";

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

export default function Dashboard({ selectedSector }: DashboardProps) {
  const kpis = useMemo(() => getKPIData(selectedSector ?? undefined), [selectedSector]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(), []);
  const sectorPerf = useMemo(() => getSectorPerformance(), []);
  const { entries } = useActivityLog();

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

      {/* Recent Transactions / Activity Log */}
      <div className="bg-card rounded-lg border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-card-foreground">Recent Transactions</h2>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No recent activity. Changes made in Tasks will appear here.</p>
        ) : (
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {entries.slice(0, 20).map(entry => (
              <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="mt-0.5 shrink-0">{getActionIcon(entry.action)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{getActionLabel(entry.action)}</span>
                    <span className="text-xs text-muted-foreground">• Task #{entry.taskId}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                  {entry.changes && entry.changes.length > 0 && (
                    <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-border">
                      {entry.changes.map((change, i) => (
                        <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="font-medium text-foreground/70">{change.field}:</span>
                          {change.oldValue && (
                            <>
                              <span className="line-through opacity-60">{change.oldValue}</span>
                              <span>→</span>
                            </>
                          )}
                          <span className="text-foreground/80 font-medium">{change.newValue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
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
