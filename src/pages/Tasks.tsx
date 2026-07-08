import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useUpdateSubTask, useDeleteSubTask, useTaskComments, useAddComment } from "@/hooks/useTasks";
import { useTaskCategories, useTaskTypes, useSectors } from "@/hooks/useTaskMasterData";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompanies } from "@/hooks/useCompanies";
import { useDepartments } from "@/hooks/useDepartments";
import { useLocations } from "@/hooks/useLocations";
import { useSubUnits } from "@/hooks/useSubUnits";
import { useIsAdmin } from "@/hooks/useUserRole";
import type { DbTask, DbSubTask, TaskWorkflowStatus, TaskPriority, RecurrenceType } from "@/types/tasks";
import { WORKFLOW_STATUSES, MAIN_TASK_STATUSES, PRIORITIES, getWeightFromPriority, getStatusColor, getPriorityColor, getDeadlineInfo, getProgressFromStatus } from "@/types/tasks";
import { Search, ChevronDown, ChevronRight, Plus, Pencil, Trash2, Filter, Calendar, AlertTriangle, CheckCircle2, Clock, X, MessageSquare, Send, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { Can } from "@/components/rbac/Can";
import { usePermissions } from "@/hooks/usePermissions";
import { useScope } from "@/contexts/ScopeContext";

interface TasksProps {
  selectedSector: number | null;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-md border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "block text-xs font-medium text-foreground mb-1";

const QUICK_FILTERS = [
  { label: "All", value: "all", icon: Filter },
  { label: "Overdue", value: "overdue", icon: AlertTriangle },
  { label: "Due Today", value: "due_today", icon: Clock },
  { label: "Due This Week", value: "due_week", icon: Calendar },
  { label: "Completed", value: "completed", icon: CheckCircle2 },
] as const;

const SLA_OPTIONS = [
  "Day 1", "Within 1 day", "Within 2 days", "Within 5 days",
  "Within 1 week", "Within 7 & 30 days", "Within 10 days",
  "1st week of month", "By 15th of month", "By 14th of month", "By 20th of month",
  "Within 1 day of approval", "Within 2 days of approval",
  "Within 1 day of document verification", "Within 5 day post review",
  "Daily", "Weekly", "Monthly / As needed", "Ongoing",
];

const SUB_TASK_STATUSES: TaskWorkflowStatus[] = ["Created", "Assigned", "In Progress", "Under Review", "Completed"];

export default function Tasks({ selectedSector }: TasksProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const myTasksMode = searchParams.get("myTasks") === "true";
  const { isAdmin } = useIsAdmin();
  const { can: rbacCan } = usePermissions();
  const canDeleteTasks = isAdmin || rbacCan("tasks", "delete");
  const { data: employeesList = [] } = useEmployees();
  const { data: categories = [] } = useTaskCategories();
  const { data: types = [] } = useTaskTypes();
  const { data: sectors = [] } = useSectors();
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();
  const { data: locations = [] } = useLocations();
  const { data: subUnits = [] } = useSubUnits();



  // Current user identity for My Tasks filtering
  const [currentUserEmployeeName, setCurrentUserEmployeeName] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    async function matchEmployee() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email?.toLowerCase() || null);
      const matched = employeesList.find(
        e => e.email?.toLowerCase() === user.email?.toLowerCase()
      );
      setCurrentUserEmployeeName(matched?.employee_name || null);
    }
    matchEmployee();
  }, [employeesList]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskWorkflowStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">("All");
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [companyFilter, setCompanyFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { companyId: scopeCompanyId, departmentId: scopeDepartmentId } = useScope();

  // UI state
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DbTask | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
  const [subTaskEditOpen, setSubTaskEditOpen] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState<{ taskId: string; subTask: DbSubTask } | null>(null);
  const [subTaskDetailOpen, setSubTaskDetailOpen] = useState(false);
  const [detailSubTask, setDetailSubTask] = useState<{ task: DbTask; subTask: DbSubTask } | null>(null);

  // Data hooks
  const { data: tasks = [], isLoading } = useTasks({ search: search || undefined });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateSubTask = useUpdateSubTask();
  const deleteSubTask = useDeleteSubTask();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    type_id: "",
    assignee_name: "",
    department_id: "",
    sector_id: "",
    company_id: "",
    location_id: "",
    sub_unit_id: "",
    priority: "Medium" as TaskPriority,
    start_date: new Date().toISOString().split("T")[0],
    due_date: "",
    kpi_target_percent: 100,
    remarks: "",
    sla_frequency: "Day 1",
    escalation_person: "",
    recurrence: "none" as RecurrenceType,
    recurrence_count: 0,
    related_module: "",
    sub_task_count: 0,
  });

  const [subTaskForm, setSubTaskForm] = useState({
    title: "",
    status: "Created" as TaskWorkflowStatus,
    priority: "Medium" as TaskPriority,
    assignee_name: "",
    due_date: "",
    remarks: "",
  });

  const resetForm = () => {
    setFormData({
      title: "", description: "", category_id: "", type_id: "",
      assignee_name: "", department_id: "", sector_id: "",
      company_id: "", location_id: "", sub_unit_id: "", priority: "Medium",
      start_date: new Date().toISOString().split("T")[0], due_date: "",
      kpi_target_percent: 100, remarks: "", sla_frequency: "Day 1",
      escalation_person: "", recurrence: "none", recurrence_count: 0,
      related_module: "", sub_task_count: 0,
    });
  };

  const handleAssigneeChange = (name: string) => {
    const emp = employeesList.find(e => e.employee_name === name);
    if (emp) {
      const comp = companies.find(c => c.company_name === emp.company_name);
      const loc = locations.find(l => l.location_name === emp.location);
      const dept = departments.find(d => d.department_name === emp.department);
      setFormData(p => ({
        ...p,
        assignee_name: name,
        company_id: comp?.id || "",
        location_id: loc?.id || "",
        department_id: dept?.id || "",
      }));
    } else {
      setFormData(p => ({ ...p, assignee_name: name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) {
      toast({ title: "Validation Error", description: "Title and Due Date are required.", variant: "destructive" });
      return;
    }
    if (formData.start_date && formData.due_date && formData.due_date < formData.start_date) {
      toast({ title: "Validation Error", description: "Due date cannot be before start date.", variant: "destructive" });
      return;
    }

    try {
      await createTask.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        category_id: formData.category_id || undefined,
        type_id: formData.type_id || undefined,
        assignee_name: formData.assignee_name || undefined,
        department_id: formData.department_id || undefined,
        sector_id: formData.sector_id || undefined,
        company_id: formData.company_id || undefined,
        location_id: formData.location_id || undefined,
        sub_unit_id: formData.sub_unit_id || undefined,
        priority: formData.priority,
        start_date: formData.start_date || undefined,
        due_date: formData.due_date || undefined,
        kpi_target_percent: formData.kpi_target_percent,
        remarks: formData.remarks || undefined,
        sla_frequency: formData.sla_frequency || undefined,
        recurrence: formData.recurrence,
        recurrence_count: formData.recurrence_count,
        related_module: formData.related_module || undefined,
        sub_task_count: formData.sub_task_count,
      });
      toast({ title: "Task Created", description: `"${formData.title}" has been created successfully.` });
      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await updateTask.mutateAsync({
        id: editingTask.id,
        updates: {
          title: formData.title,
          description: formData.description || null,
          category_id: formData.category_id || null,
          type_id: formData.type_id || null,
          assignee_name: formData.assignee_name || null,
          department_id: formData.department_id || null,
          sector_id: formData.sector_id || null,
          company_id: formData.company_id || null,
          location_id: formData.location_id || null,
          sub_unit_id: formData.sub_unit_id || null,
          priority: formData.priority as any,
          start_date: formData.start_date || null,
          due_date: formData.due_date || null,
          kpi_target_percent: formData.kpi_target_percent,
          task_weight: getWeightFromPriority(formData.priority),
          remarks: formData.remarks || null,
          sla_frequency: formData.sla_frequency || null,
          related_module: formData.related_module || null,
          recurrence: formData.recurrence as any,
          recurrence_count: formData.recurrence_count,
        } as any,
      });
      toast({ title: "Task Updated", description: `"${formData.title}" has been updated.` });
      setEditDialogOpen(false);
      setEditingTask(null);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEditDialog = (task: DbTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      category_id: task.category_id || "",
      type_id: task.type_id || "",
      assignee_name: (task as any).assignee_name || "",
      department_id: task.department_id || "",
      sector_id: task.sector_id || "",
      company_id: task.company_id || "",
      location_id: task.location_id || "",
      sub_unit_id: (task as any).sub_unit_id || "",
      priority: task.priority,
      start_date: task.start_date || "",
      due_date: task.due_date || "",
      kpi_target_percent: Number(task.kpi_target_percent),
      remarks: task.remarks || "",
      sla_frequency: task.sla_frequency || "Day 1",
      escalation_person: "",
      recurrence: task.recurrence || "none",
      recurrence_count: task.recurrence_count || 0,
      related_module: task.related_module || "",
      sub_task_count: task.sub_tasks?.length || 0,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteTask = async (task: DbTask) => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast({ title: "Task Deleted", description: `"${task.title}" has been removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (task: DbTask, newStatus: TaskWorkflowStatus) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: {
          status: newStatus as any,
          completed_date: (newStatus === "Completed" || newStatus === "Closed") ? new Date().toISOString().split("T")[0] : null,
        } as any,
      });
      toast({ title: "Status Updated", description: `Task moved to "${newStatus}".` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openSubTaskEdit = (taskId: string, st: DbSubTask) => {
    setEditingSubTask({ taskId, subTask: st });
    setSubTaskForm({
      title: st.title,
      status: st.status,
      priority: st.priority,
      assignee_name: (st as any).assignee_name || "",
      due_date: st.due_date || "",
      remarks: st.remarks || "",
    });
    setSubTaskEditOpen(true);
  };

  const handleSubTaskEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubTask) return;

    const newProgress = getProgressFromStatus(subTaskForm.status);
    const newWeight = getWeightFromPriority(subTaskForm.priority);
    const newWeightedScore = Math.round(newWeight * (newProgress / 100) * 10000) / 10000;

    try {
      await updateSubTask.mutateAsync({
        id: editingSubTask.subTask.id,
        updates: {
          title: subTaskForm.title,
          status: subTaskForm.status as any,
          progress: newProgress,
          priority: subTaskForm.priority as any,
          task_weight: newWeight,
          weighted_score: newWeightedScore,
          assignee_name: subTaskForm.assignee_name || null,
          due_date: subTaskForm.due_date || null,
          remarks: subTaskForm.remarks || null,
          completed_date: subTaskForm.status === "Completed" ? new Date().toISOString().split("T")[0] : null,
        } as any,
      });
      toast({ title: "Sub-task Updated", description: `"${subTaskForm.title}" updated. Parent recalculated.` });
      setSubTaskEditOpen(false);
      setEditingSubTask(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Apply client-side filters
  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter(t => {
      // My Tasks filter: show tasks where user is assignee or assigned_by, or has subtasks assigned
      if (myTasksMode && (currentUserEmployeeName || currentUserId)) {
        const nameLower = currentUserEmployeeName?.toLowerCase();
        // Check if user is the assignee (by name, id, or email)
        const isAssignee = !!(
          (nameLower && (t as any).assignee_name?.toLowerCase() === nameLower) ||
          (currentUserId && t.assignee_id === currentUserId)
        );
        // Check if user assigned the task (assigned_by)
        const isAssigner = !!(currentUserId && t.assigned_by === currentUserId);
        // Check if user created the task
        const isCreator = !!(currentUserId && t.created_by === currentUserId);
        // Check sub-tasks: assigned to user or created by user
        const hasRelatedSubTask = (t.sub_tasks || []).some((st: any) => {
          const stAssignee = !!(
            (nameLower && st.assignee_name?.toLowerCase() === nameLower) ||
            (currentUserId && st.assignee_id === currentUserId)
          );
          const stCreator = !!(currentUserId && st.created_by === currentUserId);
          return stAssignee || stCreator;
        });
        if (!isAssignee && !isAssigner && !isCreator && !hasRelatedSubTask) return false;
      }

      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (departmentFilter !== "All" && t.department_id !== departmentFilter) return false;
      if (companyFilter !== "All" && t.company_id !== companyFilter) return false;
      // Header scope filter (global) — applies on top of page-local filters
      if (scopeCompanyId && t.company_id !== scopeCompanyId) return false;
      if (scopeDepartmentId && t.department_id !== scopeDepartmentId) return false;
      if (locationFilter !== "All" && t.location_id !== locationFilter) return false;
      if (sectorFilter !== "All" && t.sector_id !== sectorFilter) return false;
      if (dateFrom && t.due_date && t.due_date < dateFrom) return false;
      if (dateTo && t.due_date && t.due_date > dateTo) return false;

      if (quickFilter === "overdue") {
        const dl = getDeadlineInfo(t.due_date, t.status);
        if (!dl.isOverdue) return false;
      } else if (quickFilter === "due_today") {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() !== today.getTime()) return false;
      } else if (quickFilter === "due_week") {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < today || due > weekEnd) return false;
      } else if (quickFilter === "completed") {
        if (t.status !== "Completed" && t.status !== "Closed") return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, departmentFilter, companyFilter, locationFilter, sectorFilter, dateFrom, dateTo, quickFilter, myTasksMode, currentUserEmployeeName, currentUserId, scopeCompanyId, scopeDepartmentId]);

  // KPI summary cards
  const summary = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(t => t.status === "Completed" || t.status === "Closed").length;
    const inProgress = filtered.filter(t => t.status === "In Progress").length;
    const pending = filtered.filter(t => t.status === "Pending" || t.status === "Created" || t.status === "Assigned").length;
    const overdue = filtered.filter(t => {
      const dl = getDeadlineInfo(t.due_date, t.status);
      return dl.isOverdue;
    }).length;
    const onHold = filtered.filter(t => t.status === "On Hold").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, overdue, onHold, completionRate };
  }, [filtered]);

  const openTaskDetail = (task: DbTask) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total Tasks", value: summary.total, color: "text-foreground", bg: "bg-card" },
          { label: "Completed", value: summary.completed, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "In Progress", value: summary.inProgress, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Pending", value: summary.pending, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Overdue", value: summary.overdue, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "On Hold", value: summary.onHold, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Completion %", value: `${summary.completionRate}%`, color: "text-primary", bg: "bg-primary/10" },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-lg border p-3 flex flex-col`}>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
            <span className={`text-xl font-bold ${card.color} mt-1`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Header + Quick Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {myTasksMode ? "My Tasks" : "Task Management"}
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} tasks</p>
          </div>
          {myTasksMode && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1 hover:bg-destructive/20"
              onClick={() => setSearchParams({})}
            >
              <X size={12} /> Clear My Tasks Filter
            </Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <Can module="tasks" action="create">
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> New Task</Button>
            </DialogTrigger>
          </Can>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Basic Information</h3>
                <div>
                  <label className={labelClass}>Task Title *</label>
                  <input className={inputClass} placeholder="e.g. New Employee Document Collection" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea className={inputClass + " min-h-[60px]"} placeholder="Task description..." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Task Owner / Assignee</label>
                    <select className={inputClass} value={formData.assignee_name} onChange={e => handleAssigneeChange(e.target.value)}>
                      <option value="">Select person</option>
                      {employeesList.filter(e => e.employment_status === "Active").map(e => <option key={e.id} value={e.employee_name}>{e.employee_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Priority</label>
                    <select className={inputClass} value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Organization</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Department</label>
                    <select className={inputClass} value={formData.department_id} onChange={e => setFormData(p => ({ ...p, department_id: e.target.value }))}>
                      <option value="">Select department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Sector</label>
                    <select className={inputClass} value={formData.sector_id} onChange={e => setFormData(p => ({ ...p, sector_id: e.target.value }))}>
                      <option value="">Select sector</option>
                      {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Company</label>
                    <select className={inputClass} value={formData.company_id} onChange={e => setFormData(p => ({ ...p, company_id: e.target.value }))}>
                      <option value="">Select company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location</label>
                    <select className={inputClass} value={formData.location_id} onChange={e => setFormData(p => ({ ...p, location_id: e.target.value }))}>
                      <option value="">Select location</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category & Type */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Category & Type</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select className={inputClass} value={formData.category_id} onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select className={inputClass} value={formData.type_id} onChange={e => setFormData(p => ({ ...p, type_id: e.target.value }))}>
                      <option value="">Select type</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>SLA / Frequency</label>
                    <select className={inputClass} value={formData.sla_frequency} onChange={e => setFormData(p => ({ ...p, sla_frequency: e.target.value }))}>
                      {SLA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates & KPI */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Dates & KPI</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Start Date</label>
                    <input type="date" className={inputClass} value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Due Date *</label>
                    <input type="date" className={inputClass} value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>KPI Target %</label>
                    <input type="number" min={0} max={100} className={inputClass} value={formData.kpi_target_percent} onChange={e => setFormData(p => ({ ...p, kpi_target_percent: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Sub-tasks Count</label>
                    <input type="number" min={0} max={50} className={inputClass} value={formData.sub_task_count} onChange={e => setFormData(p => ({ ...p, sub_task_count: Math.max(0, Number(e.target.value)) }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Related Module</label>
                    <input className={inputClass} placeholder="e.g. Recruitment, Payroll" value={formData.related_module} onChange={e => setFormData(p => ({ ...p, related_module: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={labelClass}>Remarks / Notes</label>
                <textarea className={inputClass + " min-h-[50px]"} value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))} />
              </div>

              {/* Recurrence */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary border-b pb-1">Recurring Task</h3>
                <div className="flex items-center gap-4">
                  {(["none", "daily", "weekly", "monthly"] as const).map(freq => (
                    <label key={freq} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="recurrence" className="accent-primary" checked={formData.recurrence === freq} onChange={() => setFormData(p => ({ ...p, recurrence: freq, recurrence_count: freq === "none" ? 0 : Math.max(1, p.recurrence_count) }))} />
                      {freq === "none" ? "None" : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </label>
                  ))}
                </div>
                {formData.recurrence !== "none" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Repeat Count</label>
                      <input type="number" min={1} max={52} className={inputClass} value={formData.recurrence_count} onChange={e => setFormData(p => ({ ...p, recurrence_count: Math.max(1, Number(e.target.value)) }))} />
                    </div>
                    <div>
                      <label className={labelClass}>Total tasks to create</label>
                      <input type="text" disabled className={inputClass + " opacity-60"} value={`${formData.recurrence_count + 1} (original + ${formData.recurrence_count})`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.value}
            onClick={() => setQuickFilter(qf.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              quickFilter === qf.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            <qf.icon size={12} />
            {qf.label}
            {qf.value === "overdue" && summary.overdue > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 leading-4">{summary.overdue}</span>
            )}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Status</option>
          {WORKFLOW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
        </select>
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
        </select>
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Sectors</option>
          {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring" title="Due from" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring" title="Due to" />
      </div>

      {/* Task Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-3 font-medium text-muted-foreground w-8"></th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Task ID</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground w-28">Progress</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">KPI Target</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">KPI Achievement</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground min-w-[140px]">Deadline</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => {
                const dl = getDeadlineInfo(task.due_date, task.status);
                const subTasks = task.sub_tasks || [];
                return (
                  <Fragment key={task.id}>
                    <tr className="border-b hover:bg-muted/30 transition-all cursor-pointer" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                      <td className="px-3 py-2.5">
                        {subTasks.length > 0 && (expandedTask === task.id ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{String(task.task_number).padStart(3, '0')}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={e => { e.stopPropagation(); openTaskDetail(task); }} className="text-left hover:text-primary transition-colors">
                          <span className="font-medium text-card-foreground max-w-[200px] truncate block">{task.title}</span>
                          {task.description && <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">{task.description}</span>}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{task.category?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{task.department?.department_name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{task.company?.company_name || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                      </td>
                      <td className="px-3 py-2.5"><ProgressBar value={Math.round(Number(task.progress))} size="sm" /></td>
                      <td className="px-3 py-2.5 text-center text-xs font-medium">{Math.round(Number(task.kpi_target_percent))}%</td>
                      <td className="px-3 py-2.5 text-center text-xs font-medium">{Math.round(Number(task.kpi_achievement))}%</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>{task.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{task.due_date || "—"}</td>
                      <td className="px-3 py-2.5">
                        {dl.showAlert && (
                          <span className={`text-xs font-semibold ${dl.isOverdue ? "text-red-600" : dl.remainingDays <= 3 ? "text-orange-500" : "text-amber-500"}`}>
                            {dl.label}
                          </span>
                        )}
                        {!dl.showAlert && task.status !== "Completed" && task.status !== "Closed" && task.status !== "Cancelled" && (
                          <span className="text-xs text-emerald-600">On track</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openTaskDetail(task); }}>
                            <MessageSquare size={14} />
                          </Button>
                          <Can module="tasks" action="edit">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditDialog(task); }}>
                              <Pencil size={14} />
                            </Button>
                          </Can>
                          {canDeleteTasks && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                                  <Trash2 size={14} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                  <AlertDialogDescription>Delete "<strong>{task.title}</strong>"? This cannot be undone.</AlertDialogDescription>
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
                    {/* Sub-tasks */}
                    {expandedTask === task.id && subTasks.length > 0 && (
                      <tr className="bg-muted/20">
                        <td colSpan={12} className="px-8 py-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b">
                              <span className="w-16">ID</span>
                              <span className="flex-1">Title</span>
                              <span className="w-20">Priority</span>
                              <span className="w-24">Status</span>
                              <span className="w-20">Progress</span>
                              <span className="w-16 text-right">Weight</span>
                              <span className="w-16 text-right">W.Score</span>
                              <span className="w-20">Due Date</span>
                              <span className="w-20 text-right">Actions</span>
                            </div>
                            {subTasks.map((st, idx) => {
                              const stDl = getDeadlineInfo(st.due_date, st.status);
                              return (
                                <div key={st.id} className="flex items-center gap-3 text-xs">
                                  <span className="font-mono text-muted-foreground w-16 truncate">{idx + 1}</span>
                                  <span className="flex-1 text-card-foreground truncate">{st.title}</span>
                                  <span className={`w-20 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border text-center ${getPriorityColor(st.priority)}`}>{st.priority}</span>
                                  <span className={`w-24 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border text-center ${getStatusColor(st.status)}`}>{st.status}</span>
                                  <div className="w-20"><ProgressBar value={Number(st.progress)} size="sm" /></div>
                                  <span className="text-[10px] w-16 text-right text-muted-foreground">{Number(st.task_weight).toFixed(1)}</span>
                                  <span className="text-[10px] w-16 text-right text-muted-foreground">{Number(st.weighted_score).toFixed(2)}</span>
                                  <span className="w-20 text-[10px] text-muted-foreground">{st.due_date || "—"}</span>
                                  <div className="flex items-center gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="View Details" onClick={e => { e.stopPropagation(); setDetailSubTask({ task, subTask: st }); setSubTaskDetailOpen(true); }}>
                                      <Eye size={12} />
                                    </Button>
                                    <Can module="tasks" action="edit">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={e => { e.stopPropagation(); openSubTaskEdit(task.id, st); }}>
                                        <Pencil size={12} />
                                      </Button>
                                    </Can>
                                    {canDeleteTasks && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" title="Delete" onClick={e => e.stopPropagation()}>
                                            <Trash2 size={12} />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Sub-task</AlertDialogTitle>
                                            <AlertDialogDescription>Delete "<strong>{st.title}</strong>"? This cannot be undone.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                                              deleteSubTask.mutateAsync({ id: st.id, taskId: task.id }).then(() => {
                                                toast({ title: "Sub-task Deleted", description: `"${st.title}" removed. Parent recalculated.` });
                                              }).catch((err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }));
                                            }}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    No tasks found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) { setEditingTask(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Task — #{editingTask?.task_number ? String(editingTask.task_number).padStart(3, '0') : ''}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Basic Information</h3>
              <div>
                <label className={labelClass}>Title *</label>
                <input className={inputClass} value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea className={inputClass + " min-h-[60px]"} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Task Owner / Assignee</label>
                  <select className={inputClass} value={formData.assignee_name} onChange={e => handleAssigneeChange(e.target.value)}>
                    <option value="">Select person</option>
                    {employeesList.filter(e => e.employment_status === "Active").map(e => <option key={e.id} value={e.employee_name}>{e.employee_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select className={inputClass} value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                {(editingTask?.sub_tasks && editingTask.sub_tasks.length > 0) ? (
                  <div className={inputClass + " bg-muted cursor-not-allowed opacity-70"}>
                    {editingTask?.status || "Created"}
                    <p className="text-[10px] text-muted-foreground mt-0.5">Auto-calculated from sub-tasks</p>
                  </div>
                ) : (
                  <select className={inputClass} value={editingTask?.status || "Created"} onChange={e => editingTask && handleStatusChange(editingTask, e.target.value as TaskWorkflowStatus)}>
                    {MAIN_TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Organization */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Organization</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <select className={inputClass} value={formData.department_id} onChange={e => setFormData(p => ({ ...p, department_id: e.target.value }))}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sector</label>
                  <select className={inputClass} value={formData.sector_id} onChange={e => setFormData(p => ({ ...p, sector_id: e.target.value }))}>
                    <option value="">Select sector</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Company</label>
                  <select className={inputClass} value={formData.company_id} onChange={e => setFormData(p => ({ ...p, company_id: e.target.value }))}>
                    <option value="">Select company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <select className={inputClass} value={formData.location_id} onChange={e => setFormData(p => ({ ...p, location_id: e.target.value }))}>
                    <option value="">Select location</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Category & Type */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Category & Type</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select className={inputClass} value={formData.category_id} onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select className={inputClass} value={formData.type_id} onChange={e => setFormData(p => ({ ...p, type_id: e.target.value }))}>
                    <option value="">Select type</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>SLA / Frequency</label>
                  <select className={inputClass} value={formData.sla_frequency} onChange={e => setFormData(p => ({ ...p, sla_frequency: e.target.value }))}>
                    {SLA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Dates & KPI */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Dates & KPI</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" className={inputClass} value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Due Date *</label>
                  <input type="date" className={inputClass} value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>KPI Target %</label>
                  <input type="number" min={0} max={100} className={inputClass} value={formData.kpi_target_percent} onChange={e => setFormData(p => ({ ...p, kpi_target_percent: Math.min(100, Math.max(0, Number(e.target.value))) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Related Module</label>
                  <input className={inputClass} placeholder="e.g. Recruitment, Payroll" value={formData.related_module} onChange={e => setFormData(p => ({ ...p, related_module: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className={labelClass}>Remarks / Notes</label>
              <textarea className={inputClass + " min-h-[50px]"} value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))} />
            </div>

            {/* Recurrence */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">Recurring Task</h3>
              <div className="flex items-center gap-4">
                {(["none", "daily", "weekly", "monthly"] as const).map(freq => (
                  <label key={freq} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="edit-recurrence" className="accent-primary" checked={formData.recurrence === freq} onChange={() => setFormData(p => ({ ...p, recurrence: freq, recurrence_count: freq === "none" ? 0 : Math.max(1, p.recurrence_count) }))} />
                    {freq === "none" ? "None" : freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </label>
                ))}
              </div>
              {formData.recurrence !== "none" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Repeat Count</label>
                    <input type="number" min={1} max={52} className={inputClass} value={formData.recurrence_count} onChange={e => setFormData(p => ({ ...p, recurrence_count: Math.max(1, Number(e.target.value)) }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Total tasks to create</label>
                    <input type="text" disabled className={inputClass + " opacity-60"} value={`${formData.recurrence_count + 1} (original + ${formData.recurrence_count})`} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateTask.isPending}>{updateTask.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-task Edit Dialog */}
      <Dialog open={subTaskEditOpen} onOpenChange={open => { setSubTaskEditOpen(open); if (!open) setEditingSubTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Sub-task</DialogTitle></DialogHeader>
          <form onSubmit={handleSubTaskEditSubmit} className="space-y-3 mt-2">
            <div>
              <label className={labelClass}>Title</label>
              <input className={inputClass} value={subTaskForm.title} onChange={e => setSubTaskForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={subTaskForm.status} onChange={e => setSubTaskForm(p => ({ ...p, status: e.target.value as TaskWorkflowStatus }))}>
                  {SUB_TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select className={inputClass} value={subTaskForm.priority} onChange={e => setSubTaskForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Owner / Assignee</label>
                <select className={inputClass} value={subTaskForm.assignee_name} onChange={e => setSubTaskForm(p => ({ ...p, assignee_name: e.target.value }))}>
                  <option value="">Select person</option>
                  {employeesList.filter(e => e.employment_status === "Active").map(e => <option key={e.id} value={e.employee_name}>{e.employee_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input type="date" className={inputClass} value={subTaskForm.due_date} onChange={e => setSubTaskForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Weight (Auto)</label>
                <input type="text" disabled className={inputClass + " opacity-60"} value={getWeightFromPriority(subTaskForm.priority)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Remarks</label>
              <textarea className={inputClass} value={subTaskForm.remarks} onChange={e => setSubTaskForm(p => ({ ...p, remarks: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSubTaskEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateSubTask.isPending}>{updateSubTask.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-task Detail Sheet */}
      <Sheet open={subTaskDetailOpen} onOpenChange={setSubTaskDetailOpen}>
        <SheetContent className="w-[440px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Sub-task Details</SheetTitle>
          </SheetHeader>
          {detailSubTask && (
            <div className="mt-4 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{detailSubTask.subTask.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">Parent: {detailSubTask.task.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Status</span><p className={`text-xs font-semibold px-2 py-0.5 rounded-full border inline-block mt-1 ${getStatusColor(detailSubTask.subTask.status)}`}>{detailSubTask.subTask.status}</p></div>
                <div><span className="text-muted-foreground text-xs">Priority</span><p className={`text-xs font-semibold px-2 py-0.5 rounded-full border inline-block mt-1 ${getPriorityColor(detailSubTask.subTask.priority)}`}>{detailSubTask.subTask.priority}</p></div>
                <div><span className="text-muted-foreground text-xs">Owner / Assignee</span><p className="font-medium">{(detailSubTask.subTask as any).assignee_name || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Due Date</span><p className="font-medium">{detailSubTask.subTask.due_date || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Progress</span><p className="font-medium">{Number(detailSubTask.subTask.progress).toFixed(1)}%</p></div>
                <div><span className="text-muted-foreground text-xs">Weight</span><p className="font-medium">{Number(detailSubTask.subTask.task_weight).toFixed(1)}</p></div>
                <div><span className="text-muted-foreground text-xs">Weighted Score</span><p className="font-medium">{Number(detailSubTask.subTask.weighted_score).toFixed(4)}</p></div>
                <div><span className="text-muted-foreground text-xs">Completed Date</span><p className="font-medium">{detailSubTask.subTask.completed_date || "—"}</p></div>
              </div>
              {detailSubTask.subTask.remarks && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Remarks</h3>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{detailSubTask.subTask.remarks}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setSubTaskDetailOpen(false); openSubTaskEdit(detailSubTask.task.id, detailSubTask.subTask); }}>
                  <Pencil size={14} className="mr-1" /> Edit
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <TaskDetailDrawer
        task={selectedTask}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onStatusChange={handleStatusChange}
        onEdit={openEditDialog}
        isAdmin={isAdmin}
      />
    </div>
  );
}

// Task Detail Side Drawer Component
function TaskDetailDrawer({ task, open, onOpenChange, onStatusChange, onEdit, isAdmin }: {
  task: DbTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (task: DbTask, status: TaskWorkflowStatus) => void;
  onEdit: (task: DbTask) => void;
  isAdmin: boolean;
}) {
  const { data: comments = [] } = useTaskComments(task?.id || null);
  const addComment = useAddComment();
  const [newComment, setNewComment] = useState("");

  if (!task) return null;

  const dl = getDeadlineInfo(task.due_date, task.status);
  const subTasks = task.sub_tasks || [];
  const completedSubs = subTasks.filter(s => s.status === "Completed" || s.status === "Closed").length;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync({ task_id: task.id, content: newComment.trim() });
      setNewComment("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-sm">#{String(task.task_number).padStart(3, '0')}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>{task.status}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
            {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { onEdit(task); onOpenChange(false); }}>
              <Pencil size={14} className="mr-1" /> Edit
            </Button>
            {subTasks.length > 0 ? (
              <span className="text-xs text-muted-foreground italic px-2 py-1">Status auto-calculated</span>
            ) : (
              <select className="text-xs border rounded-md px-2 py-1 bg-card" value={task.status}
                onChange={e => onStatusChange(task, e.target.value as TaskWorkflowStatus)}>
                {MAIN_TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          {/* Deadline Alert */}
          {dl.showAlert && (
            <div className={`flex items-center gap-2 p-2 rounded-md text-sm font-medium ${dl.isOverdue ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
              <AlertTriangle size={16} />
              {dl.label}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">Assignee</span><p className="font-medium">{(task as any).assignee_name || task.assignee_profile?.full_name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Assigned By</span><p className="font-medium">{task.assigned_by_profile?.full_name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Category</span><p className="font-medium">{task.category?.name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{task.type?.name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Department</span><p className="font-medium">{task.department?.department_name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Sector</span><p className="font-medium">{task.sector?.name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Company</span><p className="font-medium">{task.company?.company_name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Location</span><p className="font-medium">{task.location?.location_name || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Start Date</span><p className="font-medium">{task.start_date || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Due Date</span><p className="font-medium">{task.due_date || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Progress</span><p className="font-medium">{Number(task.progress).toFixed(1)}%</p></div>
            <div><span className="text-muted-foreground text-xs">KPI Achievement</span><p className="font-medium">{Number(task.kpi_achievement).toFixed(1)}%</p></div>
          </div>

          {/* Sub-tasks summary */}
          {subTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Sub-tasks ({completedSubs}/{subTasks.length})</h3>
              <div className="space-y-1">
                {subTasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.status === "Completed" ? "bg-emerald-500" : st.status === "In Progress" ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                    <span className="flex-1 truncate">{st.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getStatusColor(st.status)}`}>{st.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          {task.remarks && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Remarks</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{task.remarks}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Comments ({comments.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="bg-muted/50 p-2 rounded text-xs">
                  <p className="text-card-foreground">{c.content}</p>
                  <span className="text-muted-foreground text-[10px]">{new Date(c.created_at).toLocaleString()}</span>
                </div>
              ))}
              {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <input className="flex-1 px-2 py-1.5 text-xs rounded-md border bg-card" placeholder="Add a comment..."
                value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddComment()} />
              <Button size="sm" variant="outline" onClick={handleAddComment} disabled={addComment.isPending}>
                <Send size={12} />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
