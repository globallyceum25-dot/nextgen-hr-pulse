import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";

interface Role { id: string; role_key: string; role_name: string; }
interface Mod { id: string; module_key: string; module_label: string; }
interface Perm { id: string; permission_key: string; permission_name: string; }
interface RP { role_id: string; module_id: string; permission_id: string; granted: boolean; }

export default function RbacModulePermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Mod[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({}); // matrix[module_id][permission_id]
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [r, m, p] = await Promise.all([
        supabase.from("rbac_roles").select("id,role_key,role_name").eq("status","active").order("role_name"),
        supabase.from("rbac_modules").select("id,module_key,module_label").eq("status","active").order("module_label"),
        supabase.from("rbac_permissions").select("id,permission_key,permission_name").eq("status","active").order("permission_name"),
      ]);
      setRoles((r.data as Role[]) ?? []);
      setModules((m.data as Mod[]) ?? []);
      setPerms((p.data as Perm[]) ?? []);
      if (r.data?.length) setSelectedRole(r.data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    (async () => {
      const { data } = await supabase.from("rbac_role_permissions")
        .select("module_id,permission_id,granted").eq("role_id", selectedRole);
      const next: Record<string, Record<string, boolean>> = {};
      (data as RP[] ?? []).forEach(rp => {
        next[rp.module_id] = next[rp.module_id] || {};
        next[rp.module_id][rp.permission_id] = rp.granted;
      });
      setMatrix(next);
    })();
  }, [selectedRole]);

  const toggle = (mid: string, pid: string) => {
    setMatrix(prev => ({ ...prev, [mid]: { ...(prev[mid] ?? {}), [pid]: !prev[mid]?.[pid] } }));
  };

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    // Build payload: for every module x permission, upsert with granted boolean.
    const payload = modules.flatMap(m => perms.map(p => ({
      role_id: selectedRole,
      module_id: m.id,
      permission_id: p.id,
      granted: !!matrix[m.id]?.[p.id],
    })));
    const { error } = await supabase.from("rbac_role_permissions")
      .upsert(payload, { onConflict: "role_id,module_id,permission_id" });
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Matrix saved" });
  };

  const selectedRoleObj = useMemo(() => roles.find(r => r.id === selectedRole), [roles, selectedRole]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Module Permission Mapping</h2>
          <p className="text-sm text-muted-foreground">Toggle which actions a role can perform per module.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={save} disabled={saving || !selectedRole}>
            <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Matrix"}
          </Button>
        </div>
      </div>

      {selectedRoleObj && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-card">Module</TableHead>
                  {perms.map(p => (
                    <TableHead key={p.id} className="text-center whitespace-nowrap">{p.permission_name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium sticky left-0 bg-card">{m.module_label}</TableCell>
                    {perms.map(p => (
                      <TableCell key={p.id} className="text-center">
                        <Switch checked={!!matrix[m.id]?.[p.id]} onCheckedChange={() => toggle(m.id, p.id)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
