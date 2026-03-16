import { useState, useMemo } from "react";
import { mockTasks, SECTORS, LOCATIONS, RESPONSIBLE_PERSONS, type TaskStatus, type Priority } from "@/data/mockData";
import { StatusBadge, PriorityBadge } from "@/components/dashboard/StatusBadge";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { Search, Filter, ChevronDown, ChevronRight } from "lucide-react";

interface TasksProps {
  selectedSector: number | null;
}

export default function Tasks({ selectedSector }: TasksProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "All">("All");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return mockTasks.filter(t => {
      if (selectedSector && t.sectorId !== selectedSector) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.responsible.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [selectedSector, statusFilter, priorityFilter, search]);

  const sectorName = selectedSector ? SECTORS.find(s => s.id === selectedSector)?.name : "All Sectors";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Task Management</h1>
        <p className="text-sm text-muted-foreground">{sectorName} — {filtered.length} tasks</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks or people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TaskStatus | "All")}
          className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="All">All Status</option>
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as Priority | "All")}
          className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="All">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Responsible</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">KPI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <>
                  <tr
                    key={task.id}
                    className="border-b hover:bg-muted/30 transition-snappy cursor-pointer"
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedTask === task.id ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{task.taskId}</td>
                    <td className="px-4 py-3 font-medium text-card-foreground">{task.name}</td>
                    <td className="px-4 py-3 text-card-foreground">{task.responsible}</td>
                    <td className="px-4 py-3 text-muted-foreground">{task.location}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3"><ProgressBar value={task.progress} size="sm" /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${task.kpiScore >= 80 ? "text-success" : task.kpiScore >= 60 ? "text-warning" : "text-destructive"}`}>
                        {task.kpiScore}%
                      </span>
                    </td>
                  </tr>
                  {expandedTask === task.id && task.subTasks.length > 0 && (
                    <tr key={`${task.id}-sub`}>
                      <td colSpan={9} className="bg-muted/20 px-8 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Sub-tasks ({task.subTasks.length})</p>
                        <div className="space-y-1.5">
                          {task.subTasks.map(st => (
                            <div key={st.id} className="flex items-center gap-4 text-xs">
                              <span className="font-mono text-muted-foreground w-20">{st.id}</span>
                              <span className="flex-1 text-card-foreground">{st.name}</span>
                              <span className="text-muted-foreground">{st.responsible}</span>
                              <StatusBadge status={st.status} />
                              <div className="w-24"><ProgressBar value={st.progress} size="sm" /></div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No tasks found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
