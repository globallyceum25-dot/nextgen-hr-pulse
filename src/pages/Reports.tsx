import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useCompanies } from "@/hooks/useCompanies";
import { useDepartments } from "@/hooks/useDepartments";
import { useSectors } from "@/hooks/useTaskMasterData";
import type { DbTask, TaskWorkflowStatus, TaskPriority } from "@/types/tasks";
import { WORKFLOW_STATUSES, PRIORITIES, getDeadlineInfo } from "@/types/tasks";
import { Download, FileSpreadsheet, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";

interface ReportsProps {
  selectedSector: number | null;
}

const inputClass = "text-sm border rounded-md px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function Reports({ selectedSector }: ReportsProps) {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();
  const { data: sectors = [] } = useSectors();

  const [statusFilter, setStatusFilter] = useState<TaskWorkflowStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (departmentFilter !== "All" && t.department_id !== departmentFilter) return false;
      if (companyFilter !== "All" && t.company_id !== companyFilter) return false;
      if (dateFrom && t.due_date && t.due_date < dateFrom) return false;
      if (dateTo && t.due_date && t.due_date > dateTo) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, departmentFilter, companyFilter, dateFrom, dateTo]);

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportTaskList = () => {
    const rows = filtered.map((t, i) => ({
      "#": i + 1,
      "Task #": t.task_number,
      "Title": t.title,
      "Description": t.description || "",
      "Category": t.category?.name || "",
      "Type": t.type?.name || "",
      "Department": t.department?.department_name || "",
      "Sector": t.sector?.name || "",
      "Company": t.company?.company_name || "",
      "Location": t.location?.location_name || "",
      "Priority": t.priority,
      "Status": t.status,
      "Start Date": t.start_date || "",
      "Due Date": t.due_date || "",
      "Completed Date": t.completed_date || "",
      "Progress %": Number(t.progress).toFixed(1),
      "KPI Target %": Number(t.kpi_target_percent),
      "KPI Achievement %": Number(t.kpi_achievement).toFixed(2),
      "Task Weight": Number(t.task_weight),
      "Weighted Score": Number(t.weighted_score).toFixed(4),
      "Remarks": t.remarks || "",
      "Sub-tasks": t.sub_tasks?.length || 0,
    }));
    exportToExcel(rows, `Task_Report_${new Date().toISOString().split("T")[0]}`);
  };

  const exportDepartmentSummary = () => {
    const map = new Map<string, { total: number; completed: number; overdue: number; avgProgress: number; progressSum: number }>();
    filtered.forEach(t => {
      const dept = t.department?.department_name || "Unassigned";
      const e = map.get(dept) || { total: 0, completed: 0, overdue: 0, avgProgress: 0, progressSum: 0 };
      e.total++;
      e.progressSum += Number(t.progress);
      if (t.status === "Completed" || t.status === "Closed") e.completed++;
      if (getDeadlineInfo(t.due_date, t.status).isOverdue) e.overdue++;
      map.set(dept, e);
    });
    const rows = Array.from(map.entries()).map(([dept, d], i) => ({
      "#": i + 1,
      "Department": dept,
      "Total Tasks": d.total,
      "Completed": d.completed,
      "Overdue": d.overdue,
      "Completion Rate %": d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      "Avg Progress %": d.total > 0 ? Math.round(d.progressSum / d.total) : 0,
    }));
    exportToExcel(rows, `Department_Summary_${new Date().toISOString().split("T")[0]}`);
  };

  const exportAssigneePerformance = () => {
    const map = new Map<string, { total: number; completed: number; overdue: number; kpiSum: number; progressSum: number; weightedScoreSum: number; weightSum: number }>();
    filtered.forEach(t => {
      const key = t.title; // grouped by task
      const e = map.get(key) || { total: 0, completed: 0, overdue: 0, kpiSum: 0, progressSum: 0, weightedScoreSum: 0, weightSum: 0 };
      e.total++;
      e.kpiSum += Number(t.kpi_achievement);
      e.progressSum += Number(t.progress);
      e.weightedScoreSum += Number(t.weighted_score);
      e.weightSum += Number(t.task_weight);
      if (t.status === "Completed" || t.status === "Closed") e.completed++;
      if (getDeadlineInfo(t.due_date, t.status).isOverdue) e.overdue++;
      map.set(key, e);
    });
    const rows = Array.from(map.entries()).map(([name, d], i) => ({
      "#": i + 1,
      "Task": name,
      "Total Tasks": d.total,
      "Completed": d.completed,
      "Overdue": d.overdue,
      "Avg Progress %": d.total > 0 ? Math.round(d.progressSum / d.total) : 0,
      "Avg KPI Achievement %": d.total > 0 ? Math.round(d.kpiSum / d.total) : 0,
      "Overall Weighted Perf %": d.weightSum > 0 ? Math.round((d.weightedScoreSum / d.weightSum) * 100 * 100) / 100 : 0,
    }));
    exportToExcel(rows, `Performance_Report_${new Date().toISOString().split("T")[0]}`);
  };

  const exportOverdueReport = () => {
    const overdue = filtered.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue);
    const rows = overdue.map((t, i) => {
      const dl = getDeadlineInfo(t.due_date, t.status);
      return {
        "#": i + 1,
        "Task #": t.task_number,
        "Title": t.title,
        "Department": t.department?.department_name || "",
        "Company": t.company?.company_name || "",
        "Priority": t.priority,
        "Due Date": t.due_date || "",
        "Overdue By": dl.label,
        "Progress %": Number(t.progress).toFixed(1),
        "Status": t.status,
      };
    });
    exportToExcel(rows, `Overdue_Report_${new Date().toISOString().split("T")[0]}`);
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(t => t.status === "Completed" || t.status === "Closed").length;
    const overdue = filtered.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).length;
    const inProgress = filtered.filter(t => t.status === "In Progress").length;
    return { total, completed, overdue, inProgress, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [filtered]);

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports & Export</h1>
          <p className="text-sm text-muted-foreground">Generate and export HR task reports</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-foreground" },
          { label: "Completed", value: stats.completed, color: "text-emerald-700" },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-700" },
          { label: "Overdue", value: stats.overdue, color: "text-red-700" },
          { label: "Completion Rate", value: `${stats.rate}%`, color: "text-primary" },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-lg border p-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
            <p className={`text-2xl font-bold ${c.color} mt-1`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Report Filters</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={inputClass}>
            <option value="All">All Status</option>
            {WORKFLOW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className={inputClass}>
            <option value="All">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className={inputClass}>
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
          </select>
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className={inputClass}>
            <option value="All">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} placeholder="To" />
        </div>
      </div>

      {/* Export Actions */}
      <Tabs defaultValue="task-list">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="task-list">Task List</TabsTrigger>
          <TabsTrigger value="department">Department Summary</TabsTrigger>
          <TabsTrigger value="performance">Performance Report</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Report</TabsTrigger>
        </TabsList>

        <TabsContent value="task-list" className="mt-4">
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Filtered Task List ({filtered.length} tasks)</h2>
              <Button onClick={exportTaskList} className="gap-2" size="sm">
                <Download size={14} /> Export to Excel
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Task ID</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Department</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground">Progress</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground">KPI %</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((t, i) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-2 py-2 text-muted-foreground">{t.task_number}</td>
                      <td className="px-2 py-2 text-card-foreground font-medium max-w-[200px] truncate">{t.title}</td>
                      <td className="px-2 py-2 text-muted-foreground">{t.department?.department_name || "—"}</td>
                      <td className="px-2 py-2"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${t.priority === "High" ? "bg-orange-50 text-orange-700 border-orange-200" : t.priority === "Medium" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{t.priority}</span></td>
                      <td className="px-2 py-2"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${t.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : t.status === "Overdue" ? "bg-red-100 text-red-700 border-red-300" : "bg-slate-100 text-slate-700 border-slate-200"}`}>{t.status}</span></td>
                      <td className="px-2 py-2 text-muted-foreground">{t.due_date || "—"}</td>
                      <td className="px-2 py-2 text-center">{Number(t.progress).toFixed(0)}%</td>
                      <td className="px-2 py-2 text-center">{Number(t.kpi_achievement).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="department" className="mt-4">
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Department-wise Summary</h2>
              <Button onClick={exportDepartmentSummary} className="gap-2" size="sm">
                <Download size={14} /> Export to Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Department</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completed</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Overdue</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completion %</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const map = new Map<string, { total: number; completed: number; overdue: number; progressSum: number }>();
                    filtered.forEach(t => {
                      const dept = t.department?.department_name || "Unassigned";
                      const e = map.get(dept) || { total: 0, completed: 0, overdue: 0, progressSum: 0 };
                      e.total++; e.progressSum += Number(t.progress);
                      if (t.status === "Completed" || t.status === "Closed") e.completed++;
                      if (getDeadlineInfo(t.due_date, t.status).isOverdue) e.overdue++;
                      map.set(dept, e);
                    });
                    return Array.from(map.entries()).map(([dept, d], i) => (
                      <tr key={dept} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 text-card-foreground font-medium">{dept}</td>
                        <td className="px-3 py-2 text-center">{d.total}</td>
                        <td className="px-3 py-2 text-center text-emerald-700">{d.completed}</td>
                        <td className="px-3 py-2 text-center text-red-600">{d.overdue}</td>
                        <td className="px-3 py-2 text-center font-semibold">{d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0}%</td>
                        <td className="px-3 py-2 text-center">{d.total > 0 ? Math.round(d.progressSum / d.total) : 0}%</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Performance Report</h2>
              <Button onClick={exportAssigneePerformance} className="gap-2" size="sm">
                <Download size={14} /> Export to Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Task</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Completed</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Overdue</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg Progress</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg KPI %</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Weighted Perf %</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const map = new Map<string, { total: number; completed: number; overdue: number; kpiSum: number; progressSum: number; wsSum: number; wSum: number }>();
                    filtered.forEach(t => {
                      const key = t.title;
                      const e = map.get(key) || { total: 0, completed: 0, overdue: 0, kpiSum: 0, progressSum: 0, wsSum: 0, wSum: 0 };
                      e.total++; e.kpiSum += Number(t.kpi_achievement); e.progressSum += Number(t.progress);
                      e.wsSum += Number(t.weighted_score); e.wSum += Number(t.task_weight);
                      if (t.status === "Completed" || t.status === "Closed") e.completed++;
                      if (getDeadlineInfo(t.due_date, t.status).isOverdue) e.overdue++;
                      map.set(key, e);
                    });
                    return Array.from(map.entries()).sort((a, b) => {
                      const aPerf = a[1].wSum > 0 ? (a[1].wsSum / a[1].wSum) * 100 : 0;
                      const bPerf = b[1].wSum > 0 ? (b[1].wsSum / b[1].wSum) * 100 : 0;
                      return bPerf - aPerf;
                    }).map(([name, d], i) => {
                      const perf = d.wSum > 0 ? Math.round((d.wsSum / d.wSum) * 100 * 100) / 100 : 0;
                      return (
                        <tr key={name} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 text-card-foreground font-medium max-w-[200px] truncate">{name}</td>
                          <td className="px-3 py-2 text-center">{d.total}</td>
                          <td className="px-3 py-2 text-center text-emerald-700">{d.completed}</td>
                          <td className="px-3 py-2 text-center text-red-600">{d.overdue}</td>
                          <td className="px-3 py-2 text-center">{d.total > 0 ? Math.round(d.progressSum / d.total) : 0}%</td>
                          <td className="px-3 py-2 text-center">{d.total > 0 ? Math.round(d.kpiSum / d.total) : 0}%</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-bold ${perf >= 70 ? "text-emerald-700" : perf >= 50 ? "text-blue-700" : perf >= 30 ? "text-amber-700" : "text-red-700"}`}>{perf}%</span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Overdue Tasks ({filtered.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).length})</h2>
              <Button onClick={exportOverdueReport} className="gap-2" size="sm">
                <Download size={14} /> Export to Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Task</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Department</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Company</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Overdue</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).map((t, i) => {
                    const dl = getDeadlineInfo(t.due_date, t.status);
                    return (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 bg-red-50/30">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 text-card-foreground font-medium max-w-[200px] truncate">{t.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.department?.department_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.company?.company_name || "—"}</td>
                        <td className="px-3 py-2 text-center"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${t.priority === "High" ? "bg-orange-50 text-orange-700 border-orange-200" : t.priority === "Medium" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{t.priority}</span></td>
                        <td className="px-3 py-2 text-muted-foreground">{t.due_date}</td>
                        <td className="px-3 py-2 text-red-600 font-semibold">{dl.label}</td>
                        <td className="px-3 py-2 text-center">{Number(t.progress).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                  {filtered.filter(t => getDeadlineInfo(t.due_date, t.status).isOverdue).length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-emerald-600">🎉 No overdue tasks!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
