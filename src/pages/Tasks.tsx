import { useState, useMemo } from "react";
import {
  mockTasks, SECTORS, LOCATIONS, RESPONSIBLE_PERSONS, COMPANY_NAMES,
  TASK_CATEGORIES, TASK_TYPES, SLA_OPTIONS, KPI_ACHIEVEMENT_STATUSES,
  type TaskStatus, type Priority, type Stage, type Task, type TaskType, type SubTask,
} from "@/data/mockData";
import { useEmployees } from "@/hooks/useEmployees";
import { useActivityLog, type FieldChange } from "@/contexts/ActivityLogContext";
import { StatusBadge, PriorityBadge } from "@/components/dashboard/StatusBadge";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { Search, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";


interface TasksProps {
  selectedSector: number | null;
}

function getKpiStatusFromAchievement(achievement: number): string {
  if (achievement >= 100) return "5 - Exceeds Expectations";
  if (achievement >= 70) return "4 - Very Good / Above Expectations";
  if (achievement >= 40) return "3 - Meets Expectations";
  if (achievement >= 25) return "2 - Needs Improvement";
  return "1 - Unsatisfactory / Below Expectations";
}

function getTaskWeightFromPriority(priority: Priority): number {
  switch (priority) {
    case "High": return 1;
    case "Medium": return 0.6;
    case "Low": return 0.2;
    default: return 0.6;
  }
}

export default function Tasks({ selectedSector }: TasksProps) {
  const { addEntry } = useActivityLog();
  const { isAdmin } = useIsAdmin();
  const { data: employeesList = [] } = useEmployees();

  const handleResponsibleChange = (name: string, setter: React.Dispatch<React.SetStateAction<typeof formData>>) => {
    const emp = employeesList.find(e => e.employee_name === name);
    setter(p => ({
      ...p,
      responsible: name,
      companyName: emp?.company_name || "",
      location: emp?.location || "",
    }));
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "All">("All");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [subTaskEditOpen, setSubTaskEditOpen] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState<{ taskId: string; subTask: SubTask } | null>(null);
  const [subTaskForm, setSubTaskForm] = useState({ name: "", status: "In Progress" as TaskStatus, progress: 0, responsible: "", dueDate: "" });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    responsible: "",
    companyName: COMPANY_NAMES[0],
    location: "",
    taskCategory: "Daily",
    taskType: "Process" as TaskType,
    slaFrequency: "Day 1",
    priority: "Medium" as Priority,
    status: "In Progress" as TaskStatus,
    stage: "Planning" as Stage,
    totalTasks: 0,
    completedCount: 0,
    pendingCount: 0,
    kpiTargetPercent: 100,
    maxWeight: 0.6,
    sectorId: 1,
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
  });

  const resetForm = () => {
    setFormData({
      name: "", description: "", responsible: "", companyName: COMPANY_NAMES[0],
      location: "", taskCategory: "Daily", taskType: "Process",
      slaFrequency: "Day 1", priority: "Medium", status: "In Progress",
      stage: "Planning", totalTasks: 0, completedCount: 0, pendingCount: 0,
      kpiTargetPercent: 100, maxWeight: 0.6, sectorId: selectedSector || 1,
      startDate: new Date().toISOString().split("T")[0], dueDate: "",
    });
  };

  const computedProgress = formData.totalTasks > 0
    ? Math.round((formData.completedCount / formData.totalTasks) * 10000) / 100 : 0;
  const computedKpiAchievement = computedProgress;
  const computedTaskWeight = getTaskWeightFromPriority(formData.priority);
  const computedWeightedScore = Math.round((computedTaskWeight * (computedProgress / 100)) * 100) / 100;
  const computedKpiStatus = getKpiStatusFromAchievement(computedKpiAchievement);
  const computedCompletionFlag = computedProgress >= 100 ? 1 : 0;

  const handleDeleteTask = (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    addEntry({
      action: "updated",
      taskName: task.name,
      taskId: task.taskId,
      description: `Task deleted`,
      changes: [{ field: "Action", oldValue: "Active", newValue: "Deleted" }],
    });
    toast({ title: "Task Deleted", description: `"${task.name}" has been removed.` });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.responsible || !formData.location || !formData.dueDate) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    const pending = formData.totalTasks - formData.completedCount;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      taskId: String(tasks.length + 1).padStart(3, "0"),
      name: formData.name,
      description: formData.description,
      sectorId: formData.sectorId,
      location: formData.location,
      responsible: formData.responsible,
      companyName: formData.companyName,
      taskCategory: formData.taskCategory,
      taskType: formData.taskType,
      slaFrequency: formData.slaFrequency,
      priority: formData.priority,
      stage: formData.stage,
      totalTasks: formData.totalTasks,
      completedCount: formData.completedCount,
      pendingCount: pending,
      progress: computedProgress,
      kpiTargetPercent: formData.kpiTargetPercent,
      kpiAchievement: computedKpiAchievement,
      kpiAchievementStatus: computedKpiStatus,
      taskWeight: computedTaskWeight,
      weightedScore: computedWeightedScore,
      maxWeight: formData.maxWeight,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      status: formData.status,
      completionFlag: computedCompletionFlag,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      kpiScore: Math.round(computedKpiAchievement),
      subTasks: [],
    };
    setTasks(prev => [newTask, ...prev]);
    addEntry({ action: "created", taskName: newTask.name, taskId: newTask.taskId, description: `New task created`, changes: [
      { field: "Name", oldValue: "", newValue: newTask.name },
      { field: "Responsible", oldValue: "", newValue: newTask.responsible },
      { field: "Priority", oldValue: "", newValue: newTask.priority },
      { field: "Status", oldValue: "", newValue: newTask.status },
      { field: "Sector", oldValue: "", newValue: SECTORS.find(s => s.id === newTask.sectorId)?.name || "" },
    ] });
    resetForm();
    setDialogOpen(false);
    toast({ title: "Task Created", description: `"${newTask.name}" has been added successfully.` });
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description,
      responsible: task.responsible,
      companyName: task.companyName,
      location: task.location,
      taskCategory: task.taskCategory,
      taskType: task.taskType,
      slaFrequency: task.slaFrequency,
      priority: task.priority,
      status: task.status,
      stage: task.stage,
      totalTasks: task.totalTasks,
      completedCount: task.completedCount,
      pendingCount: task.pendingCount,
      kpiTargetPercent: task.kpiTargetPercent,
      maxWeight: task.maxWeight,
      sectorId: task.sectorId,
      startDate: task.startDate,
      dueDate: task.dueDate,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!formData.name || !formData.responsible || !formData.location || !formData.dueDate) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    const pending = formData.totalTasks - formData.completedCount;
    setTasks(prev => prev.map(t => {
      if (t.id !== editingTask.id) return t;
      return {
        ...t,
        name: formData.name,
        description: formData.description,
        responsible: formData.responsible,
        companyName: formData.companyName,
        location: formData.location,
        taskCategory: formData.taskCategory,
        taskType: formData.taskType,
        slaFrequency: formData.slaFrequency,
        priority: formData.priority,
        status: formData.status,
        stage: formData.stage,
        totalTasks: formData.totalTasks,
        completedCount: formData.completedCount,
        pendingCount: pending,
        progress: computedProgress,
        kpiTargetPercent: formData.kpiTargetPercent,
        kpiAchievement: computedKpiAchievement,
        kpiAchievementStatus: computedKpiStatus,
        taskWeight: computedTaskWeight,
        weightedScore: computedWeightedScore,
        maxWeight: formData.maxWeight,
        sectorId: formData.sectorId,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        completionFlag: computedCompletionFlag,
        kpiScore: Math.round(computedKpiAchievement),
      };
    }));
    // Build change description with field-level detail
    const fieldChanges: FieldChange[] = [];
    if (editingTask.name !== formData.name) fieldChanges.push({ field: "Name", oldValue: editingTask.name, newValue: formData.name });
    if (editingTask.responsible !== formData.responsible) fieldChanges.push({ field: "Responsible", oldValue: editingTask.responsible, newValue: formData.responsible });
    if (editingTask.status !== formData.status) fieldChanges.push({ field: "Status", oldValue: editingTask.status, newValue: formData.status });
    if (editingTask.priority !== formData.priority) fieldChanges.push({ field: "Priority", oldValue: editingTask.priority, newValue: formData.priority });
    if (editingTask.location !== formData.location) fieldChanges.push({ field: "Location", oldValue: editingTask.location, newValue: formData.location });
    if (editingTask.stage !== formData.stage) fieldChanges.push({ field: "Stage", oldValue: editingTask.stage, newValue: formData.stage });
    if (editingTask.dueDate !== formData.dueDate) fieldChanges.push({ field: "Due Date", oldValue: editingTask.dueDate, newValue: formData.dueDate });
    if (editingTask.description !== formData.description) fieldChanges.push({ field: "Description", oldValue: editingTask.description || "", newValue: formData.description });
    const desc = fieldChanges.length > 0 ? `${fieldChanges.length} field(s) changed` : "Task details updated";
    const action = formData.status === "Completed" && editingTask.status !== "Completed" ? "completed" as const : "updated" as const;
    addEntry({ action, taskName: formData.name, taskId: editingTask.taskId, description: desc, changes: fieldChanges });
    setEditDialogOpen(false);
    setEditingTask(null);
    resetForm();
    toast({ title: "Task Updated", description: `"${formData.name}" has been updated successfully.` });
  };

  const openSubTaskEdit = (taskId: string, st: SubTask) => {
    setEditingSubTask({ taskId, subTask: st });
    setSubTaskForm({ name: st.name, status: st.status, progress: st.progress, responsible: st.responsible, dueDate: st.dueDate });
    setSubTaskEditOpen(true);
  };

  const recalcTaskFromSubTasks = (task: Task, updatedSubTasks: SubTask[]): Task => {
    const total = updatedSubTasks.length;
    const completedCount = updatedSubTasks.filter(s => s.status === "Completed").length;
    const pendingCount = total - completedCount;
    const progress = total > 0 ? Math.round((completedCount / total) * 10000) / 100 : 0;
    const kpiAchievement = progress;
    const kpiStatus = getKpiStatusFromAchievement(kpiAchievement);
    const weightedScore = Math.round(task.taskWeight * (progress / 100) * 100) / 100;
    const status: TaskStatus = progress >= 100 ? "Completed" : progress > 0 ? "In Progress" : "Started";
    return {
      ...task,
      subTasks: updatedSubTasks,
      totalTasks: total,
      completedCount,
      pendingCount,
      progress,
      kpiAchievement,
      kpiAchievementStatus: kpiStatus,
      weightedScore,
      status,
      completionFlag: progress >= 100 ? 1 : 0,
      kpiScore: Math.round(kpiAchievement),
    };
  };

  const handleSubTaskEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubTask) return;
    const { taskId, subTask } = editingSubTask;
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updatedSubTasks = t.subTasks.map(st => {
        if (st.id !== subTask.id) return st;
        return {
          ...st,
          name: subTaskForm.name,
          status: subTaskForm.status,
          progress: subTaskForm.status === "Completed" ? 100 : subTaskForm.progress,
          responsible: subTaskForm.responsible,
          dueDate: subTaskForm.dueDate,
          completedDate: subTaskForm.status === "Completed" ? new Date().toISOString().split("T")[0] : undefined,
        };
      });
      return recalcTaskFromSubTasks(t, updatedSubTasks);
    }));
    const parentTask = tasks.find(t => t.id === taskId);
    const stAction = subTaskForm.status === "Completed" && subTask.status !== "Completed" ? "subtask_completed" as const : "subtask_updated" as const;
    const stFieldChanges: FieldChange[] = [];
    if (subTask.name !== subTaskForm.name) stFieldChanges.push({ field: "Name", oldValue: subTask.name, newValue: subTaskForm.name });
    if (subTask.responsible !== subTaskForm.responsible) stFieldChanges.push({ field: "Responsible", oldValue: subTask.responsible, newValue: subTaskForm.responsible });
    if (subTask.status !== subTaskForm.status) stFieldChanges.push({ field: "Status", oldValue: subTask.status, newValue: subTaskForm.status });
    if (String(subTask.progress) !== String(subTaskForm.progress)) stFieldChanges.push({ field: "Progress", oldValue: `${subTask.progress}%`, newValue: `${subTaskForm.progress}%` });
    addEntry({ action: stAction, taskName: parentTask?.name || "", taskId: parentTask?.taskId || "", description: `Sub-task "${subTaskForm.name}": ${stFieldChanges.length > 0 ? `${stFieldChanges.length} field(s) changed` : "details updated"}`, changes: stFieldChanges });
    setSubTaskEditOpen(false);
    setEditingSubTask(null);
    toast({ title: "Sub-task Updated", description: `"${subTaskForm.name}" updated. Parent task progress recalculated.` });
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
  const labelClass = "block text-xs font-medium text-foreground mb-1";

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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Basic Information</h3>
                <div>
                  <label className={labelClass}>Task Name *</label>
                  <input className={inputClass} placeholder="e.g. New Employee Document Collection" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea className={inputClass + " min-h-[60px]"} placeholder="Task description..." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Responsible Person *</label>
                    <select className={inputClass} value={formData.responsible} onChange={e => handleResponsibleChange(e.target.value, setFormData)}>
                      <option value="">Select person</option>
                      {employeesList.filter(e => e.employment_status === "Active").map(e => <option key={e.id} value={e.employee_name}>{e.employee_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input className={inputClass + " opacity-60"} value={formData.companyName} readOnly placeholder="Auto-filled from employee" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Location *</label>
                    <input className={inputClass + " opacity-60"} value={formData.location} readOnly placeholder="Auto-filled from employee" />
                  </div>
                  <div>
                    <label className={labelClass}>Task Category</label>
                    <select className={inputClass} value={formData.taskCategory} onChange={e => setFormData(p => ({ ...p, taskCategory: e.target.value }))}>
                      {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Sector</label>
                    <select className={inputClass} value={formData.sectorId} onChange={e => setFormData(p => ({ ...p, sectorId: Number(e.target.value) }))}>
                      {SECTORS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Task Type & SLA */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Task Type & SLA</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Task Type</label>
                    <select className={inputClass} value={formData.taskType} onChange={e => setFormData(p => ({ ...p, taskType: e.target.value as TaskType }))}>
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>SLA / Frequency</label>
                    <select className={inputClass} value={formData.slaFrequency} onChange={e => setFormData(p => ({ ...p, slaFrequency: e.target.value }))}>
                      {SLA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Priority</label>
                    <select className={inputClass} value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as Priority }))}>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Progress & KPI */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Progress & KPI Metrics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Total Tasks</label>
                    <input type="number" min={0} className={inputClass} value={formData.totalTasks} onChange={e => {
                      const total = Math.max(0, Number(e.target.value));
                      setFormData(p => ({ ...p, totalTasks: total, completedCount: Math.min(p.completedCount, total) }));
                    }} />
                  </div>
                  <div>
                    <label className={labelClass}>Completed</label>
                    <input type="number" min={0} max={formData.totalTasks} className={inputClass} value={formData.completedCount} onChange={e => setFormData(p => ({ ...p, completedCount: Math.min(p.totalTasks, Math.max(0, Number(e.target.value))) }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Pending</label>
                    <input type="number" disabled className={inputClass + " opacity-60"} value={formData.totalTasks - formData.completedCount} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Progress %</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={`${computedProgress}%`} />
                  </div>
                  <div>
                    <label className={labelClass}>KPI Target %</label>
                    <input type="number" min={0} max={100} className={inputClass} value={formData.kpiTargetPercent} onChange={e => setFormData(p => ({ ...p, kpiTargetPercent: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>KPI Achievement</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={`${computedKpiAchievement}%`} />
                  </div>
                  <div>
                    <label className={labelClass}>KPI Achievement Status</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={computedKpiStatus} />
                  </div>
                </div>
              </div>

              {/* Section 4: Weights */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Weights & Scoring</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Task Weight (Auto)</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={computedTaskWeight} />
                  </div>
                  <div>
                    <label className={labelClass}>Weighted Score</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={computedWeightedScore} />
                  </div>
                  <div>
                    <label className={labelClass}>Max Weight</label>
                    <input type="number" step={0.1} min={0} max={1} className={inputClass} value={formData.maxWeight} onChange={e => setFormData(p => ({ ...p, maxWeight: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              {/* Section 5: Status & Dates */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Status & Dates</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select className={inputClass} value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as TaskStatus }))}>
                      <option value="In Progress">In Progress</option>
                      <option value="Started">Started</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Start Date</label>
                    <input type="date" className={inputClass} value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Due Date *</label>
                    <input type="date" className={inputClass} value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Stage</label>
                    <select className={inputClass} value={formData.stage} onChange={e => setFormData(p => ({ ...p, stage: e.target.value as Stage }))}>
                      <option value="Planning">Planning</option>
                      <option value="Execution">Execution</option>
                      <option value="Review">Review</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Completion Flag</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={computedCompletionFlag} />
                  </div>
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | "All")} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Status</option>
          <option value="Completed">Completed</option>
          <option value="In Progress">In Progress</option>
          <option value="Started">Started</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | "All")} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
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
                <th className="text-left px-3 py-3 font-medium text-muted-foreground w-8"></th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Task ID</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Task Name</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Responsible</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">SLA</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Done</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Pending</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground w-28">Progress</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">KPI%</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Actions</th>
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
                    <td className="px-3 py-2.5">
                      {expandedTask === task.id ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{task.taskId}</td>
                    <td className="px-3 py-2.5 font-medium text-card-foreground max-w-[200px] truncate">{task.name}</td>
                    <td className="px-3 py-2.5 text-card-foreground">{task.responsible}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[150px] truncate">{task.companyName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{task.location}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{task.taskCategory}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{task.taskType}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[100px] truncate">{task.slaFrequency}</td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-3 py-2.5 text-center text-card-foreground">{task.totalTasks}</td>
                    <td className="px-3 py-2.5 text-center text-card-foreground">{task.completedCount}</td>
                    <td className="px-3 py-2.5 text-center text-card-foreground">{task.pendingCount}</td>
                    <td className="px-3 py-2.5"><ProgressBar value={Math.round(task.progress)} size="sm" /></td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-semibold ${task.kpiAchievement >= 80 ? "text-success" : task.kpiAchievement >= 60 ? "text-warning" : "text-destructive"}`}>
                        {task.kpiAchievement.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={task.status} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditDialog(task); }}>
                          <Pencil size={14} />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                <Trash2 size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "<strong>{task.name}</strong>"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteTask(task)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedTask === task.id && (
                    <tr key={`${task.id}-detail`}>
                      <td colSpan={17} className="bg-muted/20 px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                          <div><span className="text-muted-foreground">Description:</span> <span className="text-card-foreground">{task.description}</span></div>
                          <div><span className="text-muted-foreground">KPI Target:</span> <span className="text-card-foreground">{task.kpiTargetPercent}%</span></div>
                          <div><span className="text-muted-foreground">KPI Achievement:</span> <span className="text-card-foreground">{task.kpiAchievement.toFixed(2)}%</span></div>
                          <div><span className="text-muted-foreground">KPI Status:</span> <span className="text-card-foreground">{task.kpiAchievementStatus}</span></div>
                          <div><span className="text-muted-foreground">Task Weight:</span> <span className="text-card-foreground">{task.taskWeight}</span></div>
                          <div><span className="text-muted-foreground">Weighted Score:</span> <span className="text-card-foreground">{task.weightedScore}</span></div>
                          <div><span className="text-muted-foreground">Max Weight:</span> <span className="text-card-foreground">{task.maxWeight}</span></div>
                          <div><span className="text-muted-foreground">Completion Flag:</span> <span className="text-card-foreground">{task.completionFlag}</span></div>
                        </div>
                        {task.subTasks.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Sub-tasks ({task.subTasks.length})</p>
                            <div className="space-y-1.5">
                              {task.subTasks.map(st => (
                                <div key={st.id} className="flex items-center gap-4 text-xs">
                                  <span className="font-mono text-muted-foreground w-20">{st.id}</span>
                                  <span className="flex-1 text-card-foreground">{st.name}</span>
                                  <span className="text-muted-foreground">{st.responsible}</span>
                                  <StatusBadge status={st.status} />
                                  <div className="w-24"><ProgressBar value={st.progress} size="sm" /></div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openSubTaskEdit(task.id, st); }}>
                                    <Pencil size={12} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-4 py-12 text-center text-muted-foreground">
                    No tasks found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingTask(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task — <span className="font-mono text-muted-foreground">{editingTask?.taskId}</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Basic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Task ID</label>
                  <input className={inputClass + " opacity-60"} disabled value={editingTask?.taskId || ""} />
                </div>
                <div>
                  <label className={labelClass}>Task Name *</label>
                  <input className={inputClass} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea className={inputClass + " min-h-[60px]"} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Responsible Person *</label>
                  <select className={inputClass} value={formData.responsible} onChange={e => handleResponsibleChange(e.target.value, setFormData)}>
                    <option value="">Select person</option>
                    {employeesList.filter(e => e.employment_status === "Active").map(e => <option key={e.id} value={e.employee_name}>{e.employee_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Company Name</label>
                  <input className={inputClass + " opacity-60"} value={formData.companyName} readOnly placeholder="Auto-filled from employee" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Location *</label>
                  <input className={inputClass + " opacity-60"} value={formData.location} readOnly placeholder="Auto-filled from employee" />
                </div>
                <div>
                  <label className={labelClass}>Task Category</label>
                  <select className={inputClass} value={formData.taskCategory} onChange={e => setFormData(p => ({ ...p, taskCategory: e.target.value }))}>
                    {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sector</label>
                  <select className={inputClass} value={formData.sectorId} onChange={e => setFormData(p => ({ ...p, sectorId: Number(e.target.value) }))}>
                    {SECTORS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Task Type & SLA */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Task Type & SLA</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Task Type</label>
                  <select className={inputClass} value={formData.taskType} onChange={e => setFormData(p => ({ ...p, taskType: e.target.value as TaskType }))}>
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>SLA / Frequency</label>
                  <select className={inputClass} value={formData.slaFrequency} onChange={e => setFormData(p => ({ ...p, slaFrequency: e.target.value }))}>
                    {SLA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select className={inputClass} value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as Priority }))}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Progress & KPI */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Progress & KPI Metrics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Total Tasks</label>
                  <input type="number" min={0} className={inputClass} value={formData.totalTasks} onChange={e => {
                    const total = Math.max(0, Number(e.target.value));
                    setFormData(p => ({ ...p, totalTasks: total, completedCount: Math.min(p.completedCount, total) }));
                  }} />
                </div>
                <div>
                  <label className={labelClass}>Completed</label>
                  <input type="number" min={0} max={formData.totalTasks} className={inputClass} value={formData.completedCount} onChange={e => setFormData(p => ({ ...p, completedCount: Math.min(p.totalTasks, Math.max(0, Number(e.target.value))) }))} />
                </div>
                <div>
                  <label className={labelClass}>Pending</label>
                  <input type="number" disabled className={inputClass + " opacity-60"} value={formData.totalTasks - formData.completedCount} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Progress %</label>
                  <input type="text" disabled className={inputClass + " opacity-60"} value={`${computedProgress}%`} />
                </div>
                <div>
                  <label className={labelClass}>KPI Target %</label>
                  <input type="number" min={0} max={100} className={inputClass} value={formData.kpiTargetPercent} onChange={e => setFormData(p => ({ ...p, kpiTargetPercent: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>KPI Achievement</label>
                  <input type="text" disabled className={inputClass + " opacity-60"} value={`${computedKpiAchievement}%`} />
                </div>
                <div>
                  <label className={labelClass}>KPI Achievement Status</label>
                  <input type="text" disabled className={inputClass + " opacity-60"} value={computedKpiStatus} />
                </div>
              </div>
            </div>

            {/* Section 4: Weights */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Weights & Scoring</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Task Weight (Auto)</label>
                  <input type="text" disabled className={inputClass + " opacity-60"} value={computedTaskWeight} />
                </div>
                <div>
                  <label className={labelClass}>Weighted Score</label>
                  <input type="text" disabled className={inputClass + " opacity-60"} value={computedWeightedScore} />
                </div>
                <div>
                  <label className={labelClass}>Max Weight</label>
                  <input type="number" step={0.1} min={0} max={1} className={inputClass} value={formData.maxWeight} onChange={e => setFormData(p => ({ ...p, maxWeight: Number(e.target.value) }))} />
                </div>
              </div>
            </div>

            {/* Section 5: Status & Dates */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Status & Dates</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as TaskStatus }))}>
                    <option value="In Progress">In Progress</option>
                    <option value="Started">Started</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" className={inputClass} value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Due Date *</label>
                  <input type="date" className={inputClass} value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Stage</label>
                  <select className={inputClass} value={formData.stage} onChange={e => setFormData(p => ({ ...p, stage: e.target.value as Stage }))}>
                    <option value="Planning">Planning</option>
                    <option value="Execution">Execution</option>
                    <option value="Review">Review</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Completion Flag</label>
                  <input type="text" disabled className={inputClass + " opacity-60"} value={computedCompletionFlag} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-task Edit Dialog */}
      <Dialog open={subTaskEditOpen} onOpenChange={(open) => { setSubTaskEditOpen(open); if (!open) setEditingSubTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sub-task — <span className="font-mono text-muted-foreground">{editingSubTask?.subTask.id}</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubTaskEditSubmit} className="space-y-3 mt-2">
            <div>
              <label className={labelClass}>Sub-task ID</label>
              <input className={inputClass + " opacity-60"} disabled value={editingSubTask?.subTask.id || ""} />
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input className={inputClass} value={subTaskForm.name} onChange={e => setSubTaskForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={subTaskForm.status} onChange={e => {
                  const newStatus = e.target.value as TaskStatus;
                  setSubTaskForm(p => ({ ...p, status: newStatus, progress: newStatus === "Completed" ? 100 : p.progress }));
                }}>
                  <option value="In Progress">In Progress</option>
                  <option value="Started">Started</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Progress %</label>
                <input type="number" min={0} max={100} className={inputClass} disabled={subTaskForm.status === "Completed"} value={subTaskForm.progress} onChange={e => setSubTaskForm(p => ({ ...p, progress: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Responsible</label>
                <select className={inputClass} value={subTaskForm.responsible} onChange={e => setSubTaskForm(p => ({ ...p, responsible: e.target.value }))}>
                  {employeesList.filter(e => e.employment_status === "Active").map(e => <option key={e.id} value={e.employee_name}>{e.employee_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input type="date" className={inputClass} value={subTaskForm.dueDate} onChange={e => setSubTaskForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSubTaskEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
