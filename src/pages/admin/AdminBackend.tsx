import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Database, Server, Shield, HardDrive, RefreshCw, Clock, Activity, ChevronDown, Key, Lock, Link2, Table2 } from "lucide-react";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { format } from "date-fns";

export default function AdminBackend() {
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const { entries } = useActivityLog();

  const checkConnection = async () => {
    setStatus("checking");
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      setStatus(error ? "error" : "connected");
    } catch {
      setStatus("error");
    }
  };

  const services = [
    {
      name: "Database (PostgreSQL)",
      icon: Database,
      description: "Stores all HR tasks, KPIs, user profiles, and roles",
      status: "Active",
    },
    {
      name: "Authentication",
      icon: Shield,
      description: "Handles user sign-up, login, and session management",
      status: "Active",
    },
    {
      name: "Edge Functions",
      icon: Server,
      description: "Serverless functions for backend logic and integrations",
      status: "Active",
    },
    {
      name: "Storage",
      icon: HardDrive,
      description: "File storage for documents, avatars, and attachments",
      status: "Active",
    },
  ];

  const actionBadgeVariant = (action: string) => {
    switch (action) {
      case "created": return "default";
      case "updated":
      case "subtask_updated": return "secondary";
      case "completed":
      case "subtask_completed": return "outline";
      case "deleted": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backend Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and manage Lovable Cloud backend infrastructure
        </p>
      </div>

      {/* Connection Check */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connection Status</CardTitle>
          <CardDescription>Test connectivity to the backend</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button onClick={checkConnection} size="sm" variant="outline" disabled={status === "checking"}>
            <RefreshCw className={`mr-2 h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`} />
            Test Connection
          </Button>
          {status === "connected" && (
            <Badge className="bg-success text-success-foreground">Connected</Badge>
          )}
          {status === "error" && (
            <Badge variant="destructive">Connection Failed</Badge>
          )}
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <service.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm">{service.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-success border-success/30">
                  {service.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{service.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Database Schema & Connections */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Table2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Database Schema & Connections</CardTitle>
              <CardDescription>Tables, columns, relationships, and security policies</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Profiles Table */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md bg-muted/50 border border-border hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">profiles</span>
                <Badge variant="secondary" className="text-[10px]">7 columns</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                  <Lock className="h-3 w-3 mr-1" /> RLS Enabled
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Column</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Nullable</TableHead>
                    <TableHead className="text-xs">Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { col: "id", type: "uuid", nullable: "No", def: "gen_random_uuid()", isPk: true },
                    { col: "user_id", type: "uuid", nullable: "No", def: "—", isFk: false },
                    { col: "email", type: "text", nullable: "Yes", def: "—" },
                    { col: "full_name", type: "text", nullable: "Yes", def: "—" },
                    { col: "avatar_url", type: "text", nullable: "Yes", def: "—" },
                    { col: "sector_id", type: "integer", nullable: "Yes", def: "—" },
                    { col: "created_at", type: "timestamptz", nullable: "No", def: "now()" },
                    { col: "updated_at", type: "timestamptz", nullable: "No", def: "now()" },
                  ].map((c) => (
                    <TableRow key={c.col}>
                      <TableCell className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        {c.isPk && <Key className="h-3 w-3 text-amber-500" />}
                        {c.col}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{c.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.nullable}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{c.def}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 border-t border-border bg-muted/30 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary" /> RLS Policies (4)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { name: "Admins can view all profiles", cmd: "SELECT" },
                    { name: "Users can view their own profile", cmd: "SELECT" },
                    { name: "Users can insert their own profile", cmd: "INSERT" },
                    { name: "Users can update their own profile", cmd: "UPDATE" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-xs p-2 rounded bg-background border border-border">
                      <Badge variant="outline" className="text-[10px] shrink-0">{p.cmd}</Badge>
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-3">
                  <Activity className="h-3 w-3 text-primary" /> Triggers
                </p>
                <div className="text-xs p-2 rounded bg-background border border-border text-muted-foreground">
                  <span className="font-medium text-foreground">handle_new_user</span> — Auto-creates profile on user sign-up
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* User Roles Table */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md bg-muted/50 border border-border hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">user_roles</span>
                <Badge variant="secondary" className="text-[10px]">4 columns</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                  <Lock className="h-3 w-3 mr-1" /> RLS Enabled
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Column</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Nullable</TableHead>
                    <TableHead className="text-xs">Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { col: "id", type: "uuid", nullable: "No", def: "gen_random_uuid()", isPk: true },
                    { col: "user_id", type: "uuid", nullable: "No", def: "—" },
                    { col: "role", type: "app_role (enum)", nullable: "No", def: "—" },
                    { col: "created_at", type: "timestamptz", nullable: "No", def: "now()" },
                  ].map((c) => (
                    <TableRow key={c.col}>
                      <TableCell className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        {c.isPk && <Key className="h-3 w-3 text-amber-500" />}
                        {c.col}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{c.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.nullable}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{c.def}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 border-t border-border bg-muted/30 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary" /> RLS Policies (3)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { name: "Admins can manage roles", cmd: "ALL" },
                    { name: "Admins can view all roles", cmd: "SELECT" },
                    { name: "Users can view their own roles", cmd: "SELECT" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-xs p-2 rounded bg-background border border-border">
                      <Badge variant="outline" className="text-[10px] shrink-0">{p.cmd}</Badge>
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-3">
                  <Activity className="h-3 w-3 text-primary" /> Enums
                </p>
                <div className="text-xs p-2 rounded bg-background border border-border text-muted-foreground">
                  <span className="font-medium text-foreground">app_role:</span> super_admin, sector_hr_admin, responsible_person, viewer
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Relationships Diagram */}
          <div className="p-4 rounded-md border border-border bg-muted/30">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Link2 className="h-3.5 w-3.5 text-primary" /> Table Relationships
            </p>
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="flex flex-col items-center gap-1 p-3 rounded-md border border-primary/30 bg-primary/5">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">auth.users</span>
                <span className="text-[10px] text-muted-foreground">System Auth</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-16 h-px bg-primary/50" />
                <span className="text-[10px] text-primary font-medium">user_id</span>
                <div className="w-16 h-px bg-primary/50" />
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-md border border-primary/30 bg-primary/5">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">profiles</span>
                <span className="text-[10px] text-muted-foreground">User Data</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-16 h-px bg-primary/50" />
                <span className="text-[10px] text-primary font-medium">user_id</span>
                <div className="w-16 h-px bg-primary/50" />
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-md border border-primary/30 bg-primary/5">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">user_roles</span>
                <span className="text-[10px] text-muted-foreground">Access Control</span>
              </div>
            </div>
            <div className="mt-3 p-2 rounded bg-background border border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                <span className="font-medium text-foreground">auth.users</span> → triggers <span className="font-medium text-foreground">handle_new_user()</span> → creates <span className="font-medium text-foreground">profiles</span> row → admin assigns <span className="font-medium text-foreground">user_roles</span>
              </p>
            </div>
          </div>

          {/* Database Functions */}
          <div className="p-4 rounded-md border border-border bg-muted/30">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Server className="h-3.5 w-3.5 text-primary" /> Database Functions
            </p>
            <div className="space-y-2">
              {[
                { name: "has_role(_user_id, _role)", desc: "Checks if a user has a specific role (SECURITY DEFINER)" },
                { name: "handle_new_user()", desc: "Trigger function — creates profile on new sign-up" },
                { name: "update_updated_at_column()", desc: "Auto-updates the updated_at timestamp on row changes" },
              ].map((fn) => (
                <div key={fn.name} className="flex items-start gap-2 text-xs p-2 rounded bg-background border border-border">
                  <Badge variant="secondary" className="text-[10px] shrink-0 font-mono mt-0.5">fn</Badge>
                  <div>
                    <span className="font-medium text-foreground font-mono">{fn.name}</span>
                    <p className="text-muted-foreground mt-0.5">{fn.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">System Activity Log</CardTitle>
              <CardDescription>All actions performed in the system</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No activity recorded yet</p>
              <p className="text-xs mt-1">Actions like creating, editing, or deleting tasks will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(entry.timestamp, "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionBadgeVariant(entry.action)} className="text-xs capitalize">
                          {entry.action.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {entry.taskName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell>
                        {entry.changes && entry.changes.length > 0 ? (
                          <div className="space-y-1">
                            {entry.changes.map((change, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium text-foreground">{change.field}:</span>{" "}
                                <span className="text-destructive line-through">{change.oldValue}</span>{" "}
                                <span className="text-success">→ {change.newValue}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}