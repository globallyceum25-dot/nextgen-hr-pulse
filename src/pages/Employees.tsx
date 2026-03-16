import { useMemo } from "react";
import { mockTasks, SECTORS, RESPONSIBLE_PERSONS } from "@/data/mockData";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { User } from "lucide-react";

interface EmployeesProps {
  selectedSector: number | null;
}

export default function Employees({ selectedSector }: EmployeesProps) {
  const employees = useMemo(() => {
    const filtered = selectedSector ? mockTasks.filter(t => t.sectorId === selectedSector) : mockTasks;
    const map = new Map<string, { total: number; completed: number; overdue: number; kpiSum: number; sectors: Set<number> }>();

    filtered.forEach(t => {
      const e = map.get(t.responsible) || { total: 0, completed: 0, overdue: 0, kpiSum: 0, sectors: new Set() };
      e.total++;
      if (t.status === "Completed") e.completed++;
      if (t.status === "Overdue") e.overdue++;
      e.kpiSum += t.kpiScore;
      e.sectors.add(t.sectorId);
      map.set(t.responsible, e);
    });

    return Array.from(map.entries()).map(([name, d]) => ({
      name,
      initials: name.split(" ").map(n => n[0]).join(""),
      tasks: d.total,
      completed: d.completed,
      overdue: d.overdue,
      kpi: Math.round(d.kpiSum / d.total),
      completion: Math.round((d.completed / d.total) * 100),
      sectors: d.sectors.size,
    })).sort((a, b) => b.kpi - a.kpi);
  }, [selectedSector]);

  const sectorName = selectedSector ? SECTORS.find(s => s.id === selectedSector)?.name : "All Sectors";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Employees</h1>
        <p className="text-sm text-muted-foreground">{sectorName} — {employees.length} team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {employees.map(emp => (
          <div key={emp.name} className="bg-card rounded-lg border p-4 hover:shadow-md transition-snappy">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {emp.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{emp.name}</p>
                <p className="text-[11px] text-muted-foreground">{emp.sectors} sector{emp.sectors > 1 ? "s" : ""} · {emp.tasks} tasks</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">KPI Score</span>
                <span className={`font-semibold ${emp.kpi >= 80 ? "text-success" : emp.kpi >= 60 ? "text-warning" : "text-destructive"}`}>{emp.kpi}%</span>
              </div>
              <ProgressBar value={emp.kpi} size="sm" />
              <div className="flex gap-4 mt-2 text-[11px]">
                <span className="text-success">{emp.completed} completed</span>
                {emp.overdue > 0 && <span className="text-destructive">{emp.overdue} overdue</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
