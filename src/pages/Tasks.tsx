import { useState, useMemo } from "react";
import { mockTasks, SECTORS, LOCATIONS, RESPONSIBLE_PERSONS, type TaskStatus, type Priority, type Stage, type Task } from "@/data/mockData";
import { StatusBadge, PriorityBadge } from "@/components/dashboard/StatusBadge";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { Search, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface TasksProps {
  selectedSector: number | null;
}

export default function Tasks({ selectedSector }: TasksProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "All">("All");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    responsible: "",
    location: "",
    priority: "Medium" as Priority,
    status: "Pending" as TaskStatus,
    stage: "Planning" as Stage,
    progress: 0,
    kpiScore: 0,
    sectorId: 1,
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
  });

  const resetForm = () => {
    setFormData({
      name: "", responsible: "", location: "", priority: "Medium",
      status: "Pending", stage: "Planning", progress: 0, kpiScore: 0,
      sectorId: selectedSector || 1, startDate: new Date().toISOString().split("T")[0], dueDate: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.responsible || !formData.location || !formData.dueDate) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    const newTask: Task = {
      id: `task-${Date.now()}`,
      taskId: `TSK-${String(tasks.length + 1).padStart(3, "0")}`,
      name: formData.name,
      sectorId: formData.sectorId,
      location: formData.location,
      responsible: formData.responsible,
      priority: formData.priority,
      stage: formData.stage,
      progress: formData.progress,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      status: formData.status,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      kpiScore: formData.kpiScore,
      subTasks: [],
    };
    setTasks(prev => [newTask, ...prev]);
    resetForm();
    setDialogOpen(false);
    toast({ title: "Task Created", description: `"${newTask.name}" has been added successfully.` });
  };

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (selectedSector && t.sectorId !== selectedSector) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.responsible.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, selectedSector, statusFilter, priorityFilter, search]);

  const sectorName = selectedSector ? SECTORS.find(s => s.id === selectedSector)?.name : "All Sectors";

  const inputClass = "w-full px-3 py-2 text-sm rounded-md border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Task Management</h1>
          <p className="text-sm text-muted-foreground">{sectorName} — {filtered.length} tasks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <label className={labelClass}>Task Name *</label>
                <input className={inputClass} placeholder="Enter task name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Responsible *</label>
                  <select className={inputClass} value={formData.responsible} onChange={e => setFormData(p => ({ ...p, responsible: e.target.value }))}>
                    <option value="">Select person</option>
                    {RESPONSIBLE_PERSONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Location *</label>
                  <select className={inputClass} value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}>
                    <option value="">Select location</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Priority</label>
                  <select className={inputClass} value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as Priority }))}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as TaskStatus }))}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Sector</label>
                  <select className={inputClass} value={formData.sectorId} onChange={e => setFormData(p => ({ ...p, sectorId: Number(e.target.value) }))}>
                    {SECTORS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Stage</label>
                  <select className={inputClass} value={formData.stage} onChange={e => setFormData(p => ({ ...p, stage: e.target.value as Stage }))}>
                    <option value="Planning">Planning</option>
                    <option value="Execution">Execution</option>
                    <option value="Review">Review</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Progress (%)</label>
                  <input type="number" min={0} max={100} className={inputClass} value={formData.progress} onChange={e => setFormData(p => ({ ...p, progress: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
                </div>
                <div>
                  <label className={labelClass}>KPI Score (%)</label>
                  <input type="number" min={0} max={100} className={inputClass} value={formData.kpiScore} onChange={e => setFormData(p => ({ ...p, kpiScore: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" className={inputClass} value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Due Date *</label>
                  <input type="date" className={inputClass} value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Task</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
