import { useState, useMemo, useCallback } from "react";
import type { DbTask } from "@/types/tasks";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, Search, Calendar, User, ArrowUpDown, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  tasks: DbTask[];
}

const PROGRESS_COLORS = {
  low: "hsl(0, 50%, 48%)",
  mid: "hsl(35, 65%, 50%)",
  high: "hsl(152, 45%, 40%)",
  bg: "hsl(220, 15%, 90%)",
};

function getProgressColor(pct: number) {
  if (pct >= 80) return PROGRESS_COLORS.high;
  if (pct >= 40) return PROGRESS_COLORS.mid;
  return PROGRESS_COLORS.low;
}

function getProgressColorClass(pct: number) {
  if (pct >= 80) return "bg-success";
  if (pct >= 40) return "bg-warning";
  return "bg-destructive";
}

const priorityColors: Record<string, string> = {
  High: "bg-destructive/15 text-destructive border-destructive/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  Low: "bg-success/15 text-success border-success/30",
};

// Mini donut for table rows
function MiniDonut({ value, size = 40 }: { value: number; size?: number }) {
  const color = getProgressColor(value);
  const data = [
    { value: Math.max(value, 0) },
    { value: Math.max(100 - value, 0) },
  ];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={size * 0.3} outerRadius={size * 0.48} startAngle={90} endAngle={-270} strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill={PROGRESS_COLORS.bg} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">{Math.round(value)}%</span>
    </div>
  );
}

// Large donut for detail drawer
function LargeDonut({ value }: { value: number }) {
  const color = getProgressColor(value);
  const data = [
    { value: Math.max(value, 0) },
    { value: Math.max(100 - value, 0) },
  ];
  return (
    <div className="relative w-[160px] h-[160px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={72} startAngle={90} endAngle={-270} strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill={PROGRESS_COLORS.bg} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(value)}%</span>
        <span className="text-[10px] text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

type SortKey = "progress-asc" | "progress-desc" | "priority" | "overdue" | "due-date" | "name";

export default function TaskProgressVisualization({ tasks }: Props) {
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("progress-asc");
  const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      const name = t.assignee_profile?.full_name || (t as any).assignee_name;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => set.add(t.status));
    return Array.from(set).sort();
  }, [tasks]);

  const processedTasks = useMemo(() => {
    let result = tasks.map(t => {
      const subs = t.sub_tasks || [];
      const completedSubs = subs.filter(s => s.status === "Completed" || s.status === "Closed").length;
      const progress = Number(t.progress ?? 0);
      const assignee = t.assignee_profile?.full_name || (t as any).assignee_name || "Unassigned";
      const isOverdue = t.due_date && t.status !== "Completed" && t.status !== "Closed" && new Date(t.due_date) < new Date();
      return { task: t, subs, completedSubs, progress, assignee, isOverdue };
    });

    // Filters
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => r.task.title.toLowerCase().includes(q));
    }
    if (filterAssignee !== "all") result = result.filter(r => r.assignee === filterAssignee);
    if (filterPriority !== "all") result = result.filter(r => r.task.priority === filterPriority);
    if (filterStatus !== "all") result = result.filter(r => r.task.status === filterStatus);

    // Sort
    switch (sortBy) {
      case "progress-asc": result.sort((a, b) => a.progress - b.progress); break;
      case "progress-desc": result.sort((a, b) => b.progress - a.progress); break;
      case "priority": {
        const order = { High: 0, Medium: 1, Low: 2 };
        result.sort((a, b) => (order[a.task.priority] ?? 1) - (order[b.task.priority] ?? 1));
        break;
      }
      case "overdue": result.sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0)); break;
      case "due-date": result.sort((a, b) => {
        if (!a.task.due_date) return 1;
        if (!b.task.due_date) return -1;
        return new Date(a.task.due_date).getTime() - new Date(b.task.due_date).getTime();
      }); break;
      case "name": result.sort((a, b) => a.task.title.localeCompare(b.task.title)); break;
    }

    return result;
  }, [tasks, search, filterAssignee, filterPriority, filterStatus, sortBy]);

  const paginatedTasks = useMemo(() => processedTasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [processedTasks, page]);
  const totalPages = Math.ceil(processedTasks.length / PAGE_SIZE);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterAssignee} onValueChange={v => { setFilterAssignee(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><User className="h-3 w-3 mr-1" /><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => { setSortBy(v as SortKey); setPage(0); }}>
          <SelectTrigger className="w-[170px] h-8 text-xs"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="progress-asc">Lowest Progress</SelectItem>
            <SelectItem value="progress-desc">Highest Progress</SelectItem>
            <SelectItem value="priority">Highest Priority</SelectItem>
            <SelectItem value="overdue">Overdue First</SelectItem>
            <SelectItem value="due-date">Due Date</SelectItem>
            <SelectItem value="name">Task Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground">
        Showing {paginatedTasks.length} of {processedTasks.length} tasks
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-2 text-left w-8"></th>
                <th className="p-2 text-left font-semibold text-muted-foreground">Task Title</th>
                <th className="p-2 text-left font-semibold text-muted-foreground">Assignee</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">Priority</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">Due Date</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">Subtasks</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">Progress</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">Status</th>
                <th className="p-2 text-center font-semibold text-muted-foreground">Details</th>
                <th className="p-2 text-center font-semibold text-muted-foreground w-10">✓</th>
            </thead>
            <tbody>
              {paginatedTasks.map(({ task, subs, completedSubs, progress, assignee, isOverdue }) => {
                const isExpanded = expandedRows.has(task.id);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    subs={subs}
                    completedSubs={completedSubs}
                    progress={progress}
                    assignee={assignee}
                    isOverdue={!!isOverdue}
                    isExpanded={isExpanded}
                    onToggle={() => toggleRow(task.id)}
                    onViewDetails={() => setSelectedTask(task)}
                  />
                );
              })}
              {paginatedTasks.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No tasks match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-xs px-3 py-1 rounded border bg-background disabled:opacity-40">Previous</button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="text-xs px-3 py-1 rounded border bg-background disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTask && <TaskDetailDrawer task={selectedTask} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Separated row component for performance
function TaskRow({ task, subs, completedSubs, progress, assignee, isOverdue, isExpanded, onToggle, onViewDetails }: {
  task: DbTask; subs: any[]; completedSubs: number; progress: number; assignee: string; isOverdue: boolean; isExpanded: boolean; onToggle: () => void; onViewDetails: () => void;
}) {
  return (
    <>
      <tr className={cn("border-b hover:bg-muted/30 transition-colors", isOverdue && "bg-destructive/5")}>
        <td className="p-2">
          {subs.length > 0 && (
            <button onClick={onToggle} className="p-0.5 rounded hover:bg-muted">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </td>
        <td className="p-2 font-medium text-foreground max-w-[200px] truncate" title={task.title}>{task.title}</td>
        <td className="p-2 text-muted-foreground">{assignee}</td>
        <td className="p-2 text-center">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}>{task.priority}</Badge>
        </td>
        <td className={cn("p-2 text-center whitespace-nowrap", isOverdue && "text-destructive font-semibold")}>
          {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "—"}
          {isOverdue && <span className="ml-1 text-[9px]">⚠</span>}
        </td>
        <td className="p-2 text-center">
          <span className="font-medium">{completedSubs}/{subs.length}</span>
        </td>
        <td className="p-2">
          <div className="flex justify-center">
            <MiniDonut value={progress} />
          </div>
        </td>
        <td className="p-2 text-center">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.status}</Badge>
        </td>
        <td className="p-2 text-center">
          <button onClick={onViewDetails} className="text-[10px] text-primary hover:underline font-medium">View</button>
        </td>
      </tr>
      {/* Expanded subtask rows */}
      {isExpanded && subs.map(st => {
        const stProgress = Number(st.progress ?? 0);
        return (
          <tr key={st.id} className="bg-muted/20 border-b">
            <td className="p-2"></td>
            <td className="p-2 pl-6 text-muted-foreground" colSpan={2}>
              <span className="text-[10px] font-medium">↳ {st.title}</span>
            </td>
            <td className="p-2 text-center">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColors[st.priority] || "")}>{st.priority}</Badge>
            </td>
            <td className="p-2 text-center text-[10px] text-muted-foreground">
              {st.due_date ? format(new Date(st.due_date), "dd MMM yyyy") : "—"}
            </td>
            <td className="p-2"></td>
            <td className="p-2" colSpan={2}>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", getProgressColorClass(stProgress))} style={{ width: `${stProgress}%` }} />
                </div>
                <span className="text-[10px] font-semibold w-8 text-right">{stProgress}%</span>
              </div>
            </td>
            <td className="p-2 text-center">
              <Badge variant="outline" className="text-[9px] px-1 py-0">{st.status}</Badge>
            </td>
            <td className="p-2 text-center">
              {stProgress >= 100
                ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                : <Circle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// Detail drawer content
function TaskDetailDrawer({ task }: { task: DbTask }) {
  const subs = task.sub_tasks || [];
  const progress = Number(task.progress ?? 0);
  const completedSubs = subs.filter(s => s.status === "Completed" || s.status === "Closed").length;
  const assignee = task.assignee_profile?.full_name || (task as any).assignee_name || "Unassigned";

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <SheetTitle className="text-base">{task.title}</SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-muted-foreground">Assignee:</span> <span className="font-medium">{assignee}</span></div>
        <div><span className="text-muted-foreground">Priority:</span> <Badge variant="outline" className={cn("text-[10px] ml-1", priorityColors[task.priority])}>{task.priority}</Badge></div>
        <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{task.status}</span></div>
        <div><span className="text-muted-foreground">Due:</span> <span className="font-medium">{task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "—"}</span></div>
        <div><span className="text-muted-foreground">KPI Target:</span> <span className="font-medium">{task.kpi_target_percent}%</span></div>
        <div><span className="text-muted-foreground">KPI Achievement:</span> <span className="font-medium">{Math.round(Number(task.kpi_achievement))}%</span></div>
      </div>

      {/* Large Donut */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground mb-2">Overall Progress</h3>
        <LargeDonut value={progress} />
        <p className="text-center text-xs text-muted-foreground mt-1">{completedSubs} of {subs.length} subtasks completed</p>
      </div>

      {/* Subtask Progress Bars */}
      {subs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Subtask Breakdown</h3>
          <div className="space-y-3">
            {subs.map(st => {
              const stProg = Number(st.progress ?? 0);
              const statusLabel = st.status === "Completed" || st.status === "Closed" ? "Completed"
                : stProg > 0 ? "In Progress" : "Pending";
              const statusColor = statusLabel === "Completed" ? "text-success" : statusLabel === "In Progress" ? "text-warning" : "text-muted-foreground";
              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]" title={st.title}>{st.title}</span>
                    <span className={cn("text-[10px] font-medium", statusColor)}>{statusLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", getProgressColorClass(stProg))} style={{ width: `${stProg}%` }} />
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right">{stProg}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No subtasks for this task.</p>
      )}

      {task.description && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Description</h3>
          <p className="text-xs text-foreground">{task.description}</p>
        </div>
      )}
    </div>
  );
}
