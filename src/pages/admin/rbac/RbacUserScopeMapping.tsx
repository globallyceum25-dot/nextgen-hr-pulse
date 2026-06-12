import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Search } from "lucide-react";

interface Profile { user_id: string; full_name: string | null; email: string | null; }
interface Role { id: string; role_name: string; role_key: string; }
interface Company { id: string; company_name: string; }
interface Dept { id: string; department_name: string; company_id: string | null; }
interface Loc { id: string; location_name: string; company_id: string | null; }
interface Employee { id: string; employee_id: string; employee_name: string; }
interface Scope {
  id?: string; user_id: string; employee_id: string | null; role_id: string;
  company_ids: string[]; department_ids: string[]; location_ids: string[];
  all_companies: boolean; all_departments: boolean; all_locations: boolean;
  effective_from: string | null; effective_to: string | null; status: string;
}

const empty = (uid = ""): Scope => ({
  user_id: uid, employee_id: null, role_id: "",
  company_ids: [], department_ids: [], location_ids: [],
  all_companies: false, all_departments: false, all_locations: false,
  effective_from: null, effective_to: null, status: "active",
});

export default function RbacUserScopeMapping() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [scopes, setScopes] = useState<Record<string, Scope & { role_name?: string }>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ profile: Profile; scope: Scope } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [pr, sc, rl, co, dp, lo, em] = await Promise.all([
      supabase.from("profiles").select("user_id,full_name,email"),
      supabase.from("rbac_user_scopes").select("*"),
      supabase.from("rbac_roles").select("id,role_name,role_key").eq("status","active").order("role_name"),
      supabase.from("companies").select("id,company_name").eq("status","active").order("company_name"),
      supabase.from("departments").select("id,department_name,company_id").eq("status","active").order("department_name"),
      supabase.from("locations").select("id,location_name,company_id").eq("status","active").order("location_name"),
      supabase.from("employees").select("id,employee_id,employee_name").order("employee_name"),
    ]);
    setProfiles((pr.data as Profile[]) ?? []);
    setRoles((rl.data as Role[]) ?? []);
    setCompanies((co.data as Company[]) ?? []);
    setDepartments((dp.data as Dept[]) ?? []);
    setLocations((lo.data as Loc[]) ?? []);
    setEmployees((em.data as Employee[]) ?? []);
    const map: Record<string, Scope & { role_name?: string }> = {};
    ((sc.data as Scope[]) ?? []).forEach(s => {
      map[s.user_id] = { ...s, role_name: (rl.data as Role[] ?? []).find(r => r.id === s.role_id)?.role_name };
    });
    setScopes(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p: Profile) => {
    const existing = scopes[p.user_id];
    setEditing({ profile: p, scope: existing ? { ...existing } : empty(p.user_id) });
  };

  const save = async () => {
    if (!editing) return;
    const s = editing.scope;
    if (!s.role_id) return toast({ title: "Role required", variant: "destructive" });
    const payload = {
      user_id: s.user_id, employee_id: s.employee_id, role_id: s.role_id,
      company_ids: s.company_ids, department_ids: s.department_ids, location_ids: s.location_ids,
      all_companies: s.all_companies, all_departments: s.all_departments, all_locations: s.all_locations,
      effective_from: s.effective_from, effective_to: s.effective_to, status: s.status,
    };
    const { error } = await supabase.from("rbac_user_scopes")
      .upsert(payload, { onConflict: "user_id" });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Scope saved" });
    setEditing(null); load();
  };

  const filteredProfiles = profiles.filter(p =>
    !search || (p.full_name?.toLowerCase() ?? "").includes(search.toLowerCase()) || (p.email?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const filteredDepts = useMemo(() => {
    if (!editing) return [];
    const { all_companies, company_ids } = editing.scope;
    if (all_companies || company_ids.length === 0) return departments;
    return departments.filter(d => d.company_id && company_ids.includes(d.company_id));
  }, [editing, departments]);

  const filteredLocs = useMemo(() => {
    if (!editing) return [];
    const { all_companies, company_ids } = editing.scope;
    if (all_companies || company_ids.length === 0) return locations;
    return locations.filter(l => l.company_id && company_ids.includes(l.company_id));
  }, [editing, locations]);

  const toggleMulti = (key: "company_ids" | "department_ids" | "location_ids", id: string) => {
    if (!editing) return;
    const arr = editing.scope[key];
    setEditing({ ...editing, scope: { ...editing.scope, [key]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] } });
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">User Access Scope Mapping</h2>
        <p className="text-sm text-muted-foreground">Bind each user to a role and define their company / department / location scope.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
              <TableHead>Companies</TableHead><TableHead>Departments</TableHead><TableHead>Locations</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              : filteredProfiles.map(p => {
                const s = scopes[p.user_id];
                return (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell>{s ? <Badge>{s.role_name}</Badge> : <Badge variant="outline">No scope</Badge>}</TableCell>
                    <TableCell className="text-xs">{s?.all_companies ? "All" : `${s?.company_ids.length ?? 0} selected`}</TableCell>
                    <TableCell className="text-xs">{s?.all_departments ? "All" : `${s?.department_ids.length ?? 0} selected`}</TableCell>
                    <TableCell className="text-xs">{s?.all_locations ? "All" : `${s?.location_ids.length ?? 0} selected`}</TableCell>
                    <TableCell><Badge variant={s?.status === "active" ? "default" : "outline"}>{s?.status ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Access Scope — {editing?.profile.full_name ?? editing?.profile.email}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Role</Label>
                  <Select value={editing.scope.role_id} onValueChange={(v) => setEditing({ ...editing, scope: { ...editing.scope, role_id: v } })}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Linked Employee</Label>
                  <Select value={editing.scope.employee_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, scope: { ...editing.scope, employee_id: v === "none" ? null : v } })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_id} · {e.employee_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(["companies","departments","locations"] as const).map((kind) => {
                const allKey = `all_${kind}` as "all_companies"|"all_departments"|"all_locations";
                const idsKey = `${kind === "companies" ? "company" : kind === "departments" ? "department" : "location"}_ids` as "company_ids"|"department_ids"|"location_ids";
                const options =
                  kind === "companies" ? companies.map(c => ({ id: c.id, label: c.company_name })) :
                  kind === "departments" ? filteredDepts.map(d => ({ id: d.id, label: d.department_name })) :
                  filteredLocs.map(l => ({ id: l.id, label: l.location_name }));
                return (
                  <div key={kind} className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{kind} Access</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">All {kind}</span>
                        <Switch checked={editing.scope[allKey]} onCheckedChange={(v) => setEditing({ ...editing, scope: { ...editing.scope, [allKey]: v } })} />
                      </div>
                    </div>
                    {!editing.scope[allKey] && (
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                        {options.length === 0 ? <p className="text-xs text-muted-foreground col-span-2 py-2">No options</p>
                        : options.map(o => (
                          <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={editing.scope[idsKey].includes(o.id)} onCheckedChange={() => toggleMulti(idsKey, o.id)} />
                            <span className="truncate">{o.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                <div className="space-y-1"><Label>Effective From</Label>
                  <Input type="date" value={editing.scope.effective_from ?? ""} onChange={(e) => setEditing({ ...editing, scope: { ...editing.scope, effective_from: e.target.value || null } })} />
                </div>
                <div className="space-y-1"><Label>Effective To</Label>
                  <Input type="date" value={editing.scope.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, scope: { ...editing.scope, effective_to: e.target.value || null } })} />
                </div>
                <div className="space-y-1"><Label>Status</Label>
                  <Select value={editing.scope.status} onValueChange={(v) => setEditing({ ...editing, scope: { ...editing.scope, status: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save Scope</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
