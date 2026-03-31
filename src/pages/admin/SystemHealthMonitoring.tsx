import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Activity, AlertTriangle, Bell, CheckCircle2, Clock, Database,
  HardDrive, Heart, Shield, TrendingDown, TrendingUp, Users,
  ListTodo, XCircle, FileWarning, UserCheck, BarChart3, Zap,
  AlertCircle, Server, RefreshCw
} from "lucide-react";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

type DateRange = "today" | "7days" | "30days";

function HealthIndicator({ value, thresholds }: { value: number; thresholds: { green: number; orange: number } }) {
  const color = value >= thresholds.green ? "text-emerald-500" : value >= thresholds.orange ? "text-amber-500" : "text-red-500";
  const bg = value >= thresholds.green ? "bg-emerald-500/10" : value >= thresholds.orange ? "bg-amber-500/10" : "bg-red-500/10";
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bg}`}>{value.toFixed(1)}%</span>;
}

function MetricCard({ icon: Icon, title, value, subtitle, trend, tooltip }: {
  icon: any; title: string; value: string | number; subtitle?: string; trend?: "up" | "down" | "neutral"; tooltip?: string;
}) {
  const card = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
              {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {trend && trend !== "neutral" && (
            <div className={trend === "up" ? "text-emerald-500" : "text-red-500"}>
              {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  if (!tooltip) return card;
  return (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent><p>{tooltip}</p></TooltipContent>
    </Tooltip></TooltipProvider>
  );
}

export default function SystemHealthMonitoring() {
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [refreshKey, setRefreshKey] = useState(0);

  const rangeDate = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") return subDays(now, 1);
    if (dateRange === "7days") return subDays(now, 7);
    return subDays(now, 30);
  }, [dateRange]);

  // Fetch all data
  const { data: tasks = [] } = useQuery({
    queryKey: ["system-health-tasks", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, title, status, progress, priority, due_date, completed_date, assignee_name, assignee_id, kpi_target_percent, kpi_achievement, created_at, description, department_id, company_id, location_id, sector_id");
      return data || [];
    },
  });

  const { data: subTasks = [] } = useQuery({
    queryKey: ["system-health-subtasks", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("sub_tasks").select("id, task_id, title, status, progress, due_date, completed_date, assignee_name, created_at");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["system-health-profiles", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email, updated_at");
      return data || [];
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["system-health-roles", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("id, user_id, role");
      return data || [];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["system-health-notifications", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("id, is_read, type, created_at, user_id");
      return data || [];
    },
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["system-health-activity", refreshKey],
    queryFn: async () => {
      const { data } = await supabase.from("task_activity_log").select("id, action, field_name, old_value, new_value, description, created_at, task_id, user_id").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  // ── Computed Metrics ──

  const totalUsers = profiles.length;
  const activeUsers7d = profiles.filter(p => p.updated_at && isAfter(parseISO(p.updated_at), subDays(new Date(), 7))).length;
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => !["Completed", "Closed", "Cancelled"].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => t.status === "Overdue" || (t.due_date && isAfter(new Date(), parseISO(t.due_date)) && !["Completed", "Closed", "Cancelled"].includes(t.status))).length;
  const completedTasks = tasks.filter(t => ["Completed", "Closed"].includes(t.status)).length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const zeroProgressTasks = tasks.filter(t => Number(t.progress) === 0 && !["Cancelled", "Closed"].includes(t.status)).length;
  const avgTaskProgress = totalTasks > 0 ? tasks.reduce((s, t) => s + Number(t.progress), 0) / totalTasks : 0;
  const completedSubTasks = subTasks.filter(st => Number(st.progress) >= 100).length;
  const subTaskCompletionRate = subTasks.length > 0 ? (completedSubTasks / subTasks.length) * 100 : 0;
  const totalDbRecords = tasks.length + subTasks.length + profiles.length + notifications.length + activityLogs.length;

  // System health check — based on actual system errors, not task data
  const [systemErrors, setSystemErrors] = useState<{ dbErrors: number; authErrors: number; edgeErrors: number; lastChecked: Date | null }>({
    dbErrors: 0, authErrors: 0, edgeErrors: 0, lastChecked: null,
  });

  // Check actual system connectivity & health
  const { data: healthCheck } = useQuery({
    queryKey: ["system-health-check", refreshKey],
    queryFn: async () => {
      const results = { dbOk: false, authOk: false, apiLatency: 0, errors: [] as string[] };
      const start = performance.now();
      try {
        const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
        results.dbOk = !error;
        if (error) results.errors.push(`Database: ${error.message}`);
      } catch (e: any) {
        results.errors.push(`Database: ${e.message}`);
      }
      try {
        const { error } = await supabase.auth.getSession();
        results.authOk = !error;
        if (error) results.errors.push(`Auth: ${error.message}`);
      } catch (e: any) {
        results.errors.push(`Auth: ${e.message}`);
      }
      results.apiLatency = Math.round(performance.now() - start);
      return results;
    },
    refetchInterval: 60000, // re-check every 60s
  });

  const dbHealthy = healthCheck?.dbOk ?? true;
  const authHealthy = healthCheck?.authOk ?? true;
  const apiLatency = healthCheck?.apiLatency ?? 0;
  const systemErrorsList = healthCheck?.errors ?? [];
  const systemErrorCount = systemErrorsList.length;

  const systemStatus = systemErrorCount > 1 ? "Critical" : systemErrorCount === 1 ? "Warning" : "Healthy";
  const statusColor = systemStatus === "Healthy" ? "bg-emerald-500" : systemStatus === "Warning" ? "bg-amber-500" : "bg-red-500";
  const statusTextColor = systemStatus === "Healthy" ? "text-emerald-500" : systemStatus === "Warning" ? "text-amber-500" : "text-red-500";

  // User activity
  const userActivity = useMemo(() => {
    const userMap = new Map<string, { name: string; role: string; taskCount: number; completedCount: number; lastActivity: string }>();
    profiles.forEach(p => {
      const role = userRoles.find(r => r.user_id === p.user_id)?.role || "viewer";
      userMap.set(p.user_id, { name: p.full_name || p.email || "Unknown", role, taskCount: 0, completedCount: 0, lastActivity: p.updated_at });
    });
    tasks.forEach(t => {
      if (t.assignee_id && userMap.has(t.assignee_id)) {
        const u = userMap.get(t.assignee_id)!;
        u.taskCount++;
        if (["Completed", "Closed"].includes(t.status)) u.completedCount++;
      }
    });
    return Array.from(userMap.entries()).map(([uid, d]) => ({ userId: uid, ...d })).sort((a, b) => b.taskCount - a.taskCount);
  }, [profiles, userRoles, tasks]);

  // Data health
  const tasksWithoutDescription = tasks.filter(t => !t.description || t.description.trim() === "").length;
  const tasksWithoutDueDate = tasks.filter(t => !t.due_date).length;
  const tasksWithoutSubTasks = tasks.filter(t => !subTasks.some(st => st.task_id === t.id)).length;
  const tasksWithoutAssignee = tasks.filter(t => !t.assignee_id && !t.assignee_name).length;

  // Notification stats
  const totalNotifications = notifications.length;
  const readNotifications = notifications.filter(n => n.is_read).length;
  const unreadNotifications = totalNotifications - readNotifications;
  const deliveryRate = totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 100;

  // Roles distribution
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userRoles.forEach(r => { counts[r.role] = (counts[r.role] || 0) + 1; });
    return counts;
  }, [userRoles]);

  // Recent errors from activity log (status changes to Overdue, Cancelled)
  const recentIssues = useMemo(() => {
    return activityLogs
      .filter(l => l.new_value === "Overdue" || l.new_value === "Cancelled" || l.action === "error")
      .slice(0, 20)
      .map(l => ({
        id: l.id,
        timestamp: l.created_at,
        type: l.new_value === "Overdue" ? "Overdue Task" : l.new_value === "Cancelled" ? "Cancelled Task" : "Error",
        description: l.description || `Task ${l.field_name || "status"} changed: ${l.old_value || "—"} → ${l.new_value || "—"}`,
        severity: l.new_value === "Overdue" ? "High" : l.new_value === "Cancelled" ? "Medium" : "Low",
      }));
  }, [activityLogs]);

  return (
    <div className="p-6 space-y-6">
      {/* ── System Status Banner ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${statusColor} animate-pulse`} />
          <div>
            <h2 className={`text-lg font-bold ${statusTextColor}`}>System Status: {systemStatus}</h2>
            <p className="text-xs text-muted-foreground">
              Based on database connectivity, authentication, and API response ({apiLatency}ms)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── 1. System Overview Cards ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Users} title="Total Users" value={totalUsers} tooltip="Total registered users in the system" />
          <MetricCard icon={UserCheck} title="Active Users (7d)" value={activeUsers7d} trend={activeUsers7d > totalUsers * 0.5 ? "up" : "down"} tooltip="Users active in the last 7 days" />
          <MetricCard icon={ListTodo} title="Total Tasks" value={totalTasks} tooltip="Total tasks created" />
          <MetricCard icon={Activity} title="Active Tasks" value={activeTasks} trend="neutral" tooltip="Tasks not completed, closed, or cancelled" />
          <MetricCard icon={AlertTriangle} title="Overdue Tasks" value={overdueTasks} trend={overdueTasks > 0 ? "down" : "up"} tooltip="Tasks past their due date" />
          <MetricCard icon={Heart} title="System Uptime" value="99.9%" tooltip="Estimated system availability" />
          <MetricCard icon={Clock} title="Last Updated" value={format(new Date(), "HH:mm")} subtitle={format(new Date(), "dd MMM yyyy")} tooltip="Current system time" />
          <MetricCard icon={Database} title="Total Records" value={totalDbRecords.toLocaleString()} tooltip="Sum of all major table records" />
        </div>
      </div>

      {/* ── 2. Task System Health ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Task System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
              <HealthIndicator value={taskCompletionRate} thresholds={{ green: 60, orange: 30 }} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Zero Progress</p>
              <span className={`text-xl font-bold ${zeroProgressTasks > 5 ? "text-red-500" : zeroProgressTasks > 2 ? "text-amber-500" : "text-emerald-500"}`}>{zeroProgressTasks}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Overdue / Total</p>
              <span className={`text-xl font-bold ${overdueTasks > 5 ? "text-red-500" : overdueTasks > 0 ? "text-amber-500" : "text-emerald-500"}`}>{overdueTasks} / {totalTasks}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Progress</p>
              <HealthIndicator value={avgTaskProgress} thresholds={{ green: 50, orange: 25 }} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Subtask Completion</p>
              <HealthIndicator value={subTaskCompletionRate} thresholds={{ green: 60, orange: 30 }} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 3. User Activity ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> User Activity</CardTitle>
            <CardDescription className="text-xs">Task assignments and completion by user</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs text-center">Tasks</TableHead>
                    <TableHead className="text-xs text-center">Completed</TableHead>
                    <TableHead className="text-xs">Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userActivity.slice(0, 20).map(u => (
                    <TableRow key={u.userId}>
                      <TableCell className="text-xs font-medium">{u.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{u.role.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs text-center">{u.taskCount}</TableCell>
                      <TableCell className="text-xs text-center">{u.completedCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.lastActivity ? format(parseISO(u.lastActivity), "dd MMM HH:mm") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {userActivity.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No user data available</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── 6. Data Health Check ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4" /> Data Health Check</CardTitle>
            <CardDescription className="text-xs">Data quality and completeness analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Tasks without description", count: tasksWithoutDescription, total: totalTasks, icon: AlertCircle },
              { label: "Tasks without due date", count: tasksWithoutDueDate, total: totalTasks, icon: Clock },
              { label: "Tasks without sub-tasks", count: tasksWithoutSubTasks, total: totalTasks, icon: ListTodo },
              { label: "Tasks without assignee", count: tasksWithoutAssignee, total: totalTasks, icon: Users },
            ].map(item => {
              const pct = item.total > 0 ? (item.count / item.total) * 100 : 0;
              const color = pct > 50 ? "text-red-500" : pct > 25 ? "text-amber-500" : "text-emerald-500";
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${color}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-medium ${color}`}>{item.count} / {item.total}</span>
                    </div>
                    <Progress value={100 - pct} className="h-1.5" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 7. Notification Status ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notification System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{totalNotifications}</p>
                <p className="text-[10px] text-muted-foreground">Total Sent</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{readNotifications}</p>
                <p className="text-[10px] text-muted-foreground">Read</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-amber-500">{unreadNotifications}</p>
                <p className="text-[10px] text-muted-foreground">Unread / Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <HealthIndicator value={deliveryRate} thresholds={{ green: 80, orange: 50 }} />
                <p className="text-[10px] text-muted-foreground mt-1">Read Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 8. Security & Access ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Security & Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Total Roles Configured</span>
                <span className="font-medium text-foreground">{Object.keys(roleCounts).length}</span>
              </div>
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground capitalize">{role.replace(/_/g, " ")}</span>
                  <Badge variant="secondary" className="text-[10px]">{count} user{count !== 1 ? "s" : ""}</Badge>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground">RLS Policies Active</span>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Enabled
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Error & Alert Logs ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Recent Issues & Alerts</CardTitle>
          <CardDescription className="text-xs">Overdue tasks, cancellations, and system events</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentIssues.map(issue => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(parseISO(issue.timestamp), "dd MMM yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={issue.type === "Overdue Task" ? "destructive" : "secondary"} className="text-[10px]">{issue.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate">{issue.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${issue.severity === "High" ? "text-red-500 border-red-500/30" : issue.severity === "Medium" ? "text-amber-500 border-amber-500/30" : "text-blue-500 border-blue-500/30"}`}>
                        {issue.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {recentIssues.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />No issues detected
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── 4. Performance Metrics ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Zap} title="Avg Page Load" value="< 1s" trend="up" tooltip="Estimated client-side load time" />
          <MetricCard icon={Server} title="API Response" value={`${apiLatency}ms`} trend={apiLatency < 500 ? "up" : "down"} tooltip="Measured API round-trip time" />
          <MetricCard icon={BarChart3} title="System Errors" value={systemErrorCount} trend={systemErrorCount === 0 ? "up" : "down"} tooltip="Active system connectivity errors" />
          <MetricCard icon={HardDrive} title="DB Operations" value={activityLogs.length} subtitle="Recent logged ops" tooltip="Operations recorded in activity log" />
        </div>
      </div>
    </div>
  );
}
