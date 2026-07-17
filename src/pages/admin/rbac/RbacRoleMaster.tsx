import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Power, Trash2, Search, Settings2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Role {
  id: string;
  role_key: string;
  role_name: string;
  description: string | null;
  is_system: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

const ALL_MODULES = [
  "Tasks",
  "Task Analysis",
  "Master Sheets",
  "Reports",
  "Administration",
  "Access Control",
] as const;

const MODULE_ROUTES: Record<string, string> = {
  "Tasks": "/tasks",
  "Task Analysis": "/",
  "Master Sheets": "/employees",
  "Reports": "/reports",
  "Administration": "/admin",
  "Access Control": "/admin/rbac",
};

const ALL_PERMISSIONS = [
  "All permissions",
  "Manage users & roles",
  "System configuration",
  "Delete tasks",
  "Manage sector tasks",
  "View reports",
  "Assign responsible persons",
  "View assigned tasks",
  "Update task status",
  "Add sub-tasks",
  "View task analysis",
  "View tasks",
];

interface RoleAccess {
  modules: string[];
  permissions: string[];
}

const STORAGE_KEY = "rbacRoleAccess.v1";

const DEFAULT_ACCESS: Record<string, RoleAccess> = {
  super_admin: { modules: [...ALL_MODULES], permissions: [...ALL_PERMISSIONS] },
  sector_hr_admin: {
    modules: ["Tasks", "Task Analysis", "Master Sheets", "Reports"],
    permissions: ["Manage sector tasks", "View reports", "Assign responsible persons", "Delete tasks"],
  },
  responsible_person: {
    modules: ["Tasks", "Task Analysis"],
    permissions: ["View assigned tasks", "Update task status", "Add sub-tasks"],
  },
  viewer: {
    modules: ["Tasks", "Task Analysis", "Reports"],
    permissions: ["View task analysis", "View tasks", "View reports"],
  },
};

function loadAccess(): Record<string, RoleAccess> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function RbacRoleMaster() {
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ role_key: "", role_name: "", description: "" });
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [access, setAccess] = useState<Record<string, RoleAccess>>(() => loadAccess());
  const [accessEditing, setAccessEditing] = useState<Role | null>(null);
  const [accessForm, setAccessForm] = useState<RoleAccess>({ modules: [], permissions: [] });
  const { toast } = useToast();
  const { role: currentRole } = useUserRole();
  const isSuper = currentRole === "super_admin";

  const getAccess = (roleKey: string): RoleAccess => {
    if (roleKey === "super_admin") return { modules: [...ALL_MODULES], permissions: [...ALL_PERMISSIONS] };
    return access[roleKey] ?? DEFAULT_ACCESS[roleKey] ?? { modules: [], permissions: [] };
  };

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: userRoles }] = await Promise.all([
      supabase.from("rbac_roles").select("*").order("is_system", { ascending: false }).order("role_name"),
      supabase.from("user_roles").select("role"),
    ]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setRows((data as Role[]) ?? []);
    const counts: Record<string, number> = {};
    userRoles?.forEach((r: any) => { counts[r.role] = (counts[r.role] || 0) + 1; });
    setUserCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(access)); }, [access]);

  const openNew = () => {
    setEditing({ id: "", role_key: "", role_name: "", description: "", is_system: false, status: "active", created_at: "", updated_at: "" });
    setForm({ role_key: "", role_name: "", description: "" });
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({ role_key: r.role_key, role_name: r.role_name, description: r.description ?? "" });
  };

  const openAccess = (r: Role) => {
    setAccessEditing(r);
    const a = getAccess(r.role_key);
    setAccessForm({ modules: [...a.modules], permissions: [...a.permissions] });
  };

  const toggleModule = (m: string) => setAccessForm(p => ({ ...p, modules: p.modules.includes(m) ? p.modules.filter(x => x !== m) : [...p.modules, m] }));
  const togglePermission = (perm: string) => setAccessForm(p => ({ ...p, permissions: p.permissions.includes(perm) ? p.permissions.filter(x => x !== perm) : [...p.permissions, perm] }));

  const saveAccess = () => {
    if (!accessEditing) return;
    if (accessEditing.role_key === "super_admin") {
      toast({ title: "Locked", description: "Super Admin always has full access.", variant: "destructive" });
      setAccessEditing(null); return;
    }
    setAccess(prev => ({ ...prev, [accessEditing.role_key]: { modules: [...accessForm.modules], permissions: [...accessForm.permissions] } }));
    toast({ title: "Access Updated", description: `${accessEditing.role_name} access saved.` });
    setAccessEditing(null);
  };

  const save = async () => {
    if (!editing) return;
    if (!form.role_key.trim() || !form.role_name.trim()) {
      toast({ title: "Missing fields", description: "Role key and name are required.", variant: "destructive" });
      return;
    }
    const payload = { role_key: form.role_key.trim(), role_name: form.role_name.trim(), description: form.description.trim() || null };
    const { error } = editing.id
      ? await supabase.from("rbac_roles").update(payload).eq("id", editing.id)
      : await supabase.from("rbac_roles").insert(payload);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Saved", description: `Role ${editing.id ? "updated" : "created"}.` });
    setEditing(null);
    load();
  };

  const toggleStatus = async (r: Role) => {
    const { error } = await supabase.from("rbac_roles").update({ status: r.status === "active" ? "inactive" : "active" }).eq("id", r.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (r: Role) => {
    if (!confirm(`Delete role "${r.role_name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("rbac_roles").delete().eq("id", r.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const filtered = useMemo(() => rows.filter(r =>
    !search || r.role_name.toLowerCase().includes(search.toLowerCase()) || r.role_key.toLowerCase().includes(search.toLowerCase())
  ), [rows, search]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Role Master</h2>
          <p className="text-sm text-muted-foreground">Manage system roles, their module access and permissions.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Role</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search roles…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No roles</TableCell></TableRow>
              ) : filtered.map(r => {
                const a = getAccess(r.role_key);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.role_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.role_key}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px]">{r.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {a.modules.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : a.modules.map(m => {
                          const to = MODULE_ROUTES[m];
                          const badge = <Badge variant="outline" className={`text-[10px] font-normal ${to ? "cursor-pointer hover:bg-accent" : ""}`}>{m}</Badge>;
                          return to ? <Link key={m} to={to} title={`Open ${m}`}>{badge}</Link> : <span key={m}>{badge}</span>;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {a.permissions.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : a.permissions.map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px] font-normal">{p}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{r.is_system ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}</TableCell>
                    <TableCell><Badge variant={r.status === "active" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{userCounts[r.role_key] || 0}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openAccess(r)} title="Edit access"><Settings2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit role"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(r)} title="Toggle status"><Power className="h-4 w-4" /></Button>
                      {isSuper && !r.is_system && (
                        <Button variant="ghost" size="icon" onClick={() => remove(r)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit role dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Role" : "New Role"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Role Key</Label>
              <Input value={form.role_key} disabled={!!editing?.is_system} onChange={(e) => setForm({ ...form, role_key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} />
            </div>
            <div className="space-y-1"><Label>Role Name</Label>
              <Input value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access edit dialog */}
      <Dialog open={!!accessEditing} onOpenChange={(o) => !o && setAccessEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access – {accessEditing?.role_name}</DialogTitle>
            <DialogDescription>
              {accessEditing?.role_key === "super_admin"
                ? "Super Admin always has access to all modules and permissions."
                : "Select which modules and permissions this role can access."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Module Access</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-accent/50">
                    <Checkbox
                      checked={accessForm.modules.includes(m)}
                      disabled={accessEditing?.role_key === "super_admin"}
                      onCheckedChange={() => toggleModule(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-accent/50">
                    <Checkbox
                      checked={accessForm.permissions.includes(p)}
                      disabled={accessEditing?.role_key === "super_admin"}
                      onCheckedChange={() => togglePermission(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessEditing(null)}>Cancel</Button>
            <Button onClick={saveAccess} disabled={accessEditing?.role_key === "super_admin"}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
