import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Power, Trash2, Search } from "lucide-react";
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

interface MatrixCounts {
  modules: string[];
  permissions: string[];
}

export default function RbacRoleMaster() {
  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ role_key: "", role_name: "", description: "" });
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [matrix, setMatrix] = useState<Record<string, MatrixCounts>>({});
  const { toast } = useToast();
  const { role: currentRole } = useUserRole();
  const isSuper = currentRole === "super_admin";

  const load = async () => {
    setLoading(true);
    const [rolesRes, userRolesRes, rpRes] = await Promise.all([
      supabase.from("rbac_roles").select("*").order("is_system", { ascending: false }).order("role_name"),
      supabase.from("user_roles").select("role"),
      // Only surface modules that are still active. Retired modules keep their
      // grant rows (so they can be re-activated) but must not show in Role Master,
      // which is how stale modules lingered here after being retired.
      supabase.from("rbac_role_permissions")
        .select("granted, rbac_roles(role_key), rbac_modules!inner(module_label,status), rbac_permissions(permission_name)")
        .eq("granted", true)
        .eq("rbac_modules.status", "active"),
    ]);
    if (rolesRes.error) toast({ title: "Error", description: rolesRes.error.message, variant: "destructive" });
    else setRows((rolesRes.data as Role[]) ?? []);

    const counts: Record<string, number> = {};
    userRolesRes.data?.forEach((r: any) => { counts[r.role] = (counts[r.role] || 0) + 1; });
    setUserCounts(counts);

    const m: Record<string, MatrixCounts> = {};
    ((rpRes.data ?? []) as unknown as Array<{
      granted: boolean;
      rbac_roles: { role_key: string } | null;
      rbac_modules: { module_label: string; status: string } | null;
      rbac_permissions: { permission_name: string } | null;
    }>).forEach(r => {
      const rk = r.rbac_roles?.role_key; if (!rk) return;
      // Belt-and-braces: also drop retired modules here, so the list is correct even
      // if the embedded status filter on the query is not applied.
      if (r.rbac_modules && r.rbac_modules.status !== "active") return;
      if (!m[rk]) m[rk] = { modules: [], permissions: [] };
      const mod = r.rbac_modules?.module_label; const perm = r.rbac_permissions?.permission_name;
      if (mod && !m[rk].modules.includes(mod)) m[rk].modules.push(mod);
      if (perm && !m[rk].permissions.includes(perm)) m[rk].permissions.push(perm);
    });
    setMatrix(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ id: "", role_key: "", role_name: "", description: "", is_system: false, status: "active", created_at: "", updated_at: "" });
    setForm({ role_key: "", role_name: "", description: "" });
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({ role_key: r.role_key, role_name: r.role_name, description: r.description ?? "" });
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

  const getCounts = (roleKey: string): MatrixCounts => matrix[roleKey] ?? { modules: [], permissions: [] };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Role Master</h2>
          <p className="text-sm text-muted-foreground">
            Manage system roles. Module &amp; permission access is configured in the{" "}
            <span className="font-medium text-foreground">Permission Matrix</span> tab.
          </p>
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
                const a = r.role_key === "super_admin"
                  ? { modules: ["All modules"], permissions: ["All permissions"] }
                  : getCounts(r.role_key);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.role_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.role_key}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px]">{r.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {a.modules.length === 0
                          ? <span className="text-xs text-muted-foreground">—</span>
                          : a.modules.map(m => <Badge key={m} variant="outline" className="text-[10px] font-normal">{m}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {a.permissions.length === 0
                          ? <span className="text-xs text-muted-foreground">—</span>
                          : a.permissions.map(p => <Badge key={p} variant="secondary" className="text-[10px] font-normal">{p}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>{r.is_system ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>}</TableCell>
                    <TableCell><Badge variant={r.status === "active" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{userCounts[r.role_key] || 0}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
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
    </div>
  );
}
