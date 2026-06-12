import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save } from "lucide-react";

interface Role { id: string; role_name: string; }
interface Mod { id: string; module_key: string; module_label: string; }
interface FP { id: string; role_id: string; module_id: string; field_key: string; field_label: string | null; category: string; can_view: boolean; can_edit: boolean; }

export default function RbacFieldPermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [rows, setRows] = useState<FP[]>([]);
  const [roleId, setRoleId] = useState("");
  const [modId, setModId] = useState("");
  const [newField, setNewField] = useState({ field_key: "", field_label: "", category: "basic" });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [r, m] = await Promise.all([
        supabase.from("rbac_roles").select("id,role_name").eq("status","active").order("role_name"),
        supabase.from("rbac_modules").select("id,module_key,module_label").eq("status","active").order("module_label"),
      ]);
      setRoles((r.data as Role[]) ?? []);
      setMods((m.data as Mod[]) ?? []);
      if (r.data?.length) setRoleId(r.data[0].id);
      if (m.data?.length) setModId(m.data.find(x => x.module_key === "employees")?.id ?? m.data[0].id);
    })();
  }, []);

  const load = async () => {
    if (!roleId || !modId) return;
    const { data } = await supabase.from("rbac_field_permissions")
      .select("*").eq("role_id", roleId).eq("module_id", modId);
    setRows((data as FP[]) ?? []);
  };
  useEffect(() => { load(); }, [roleId, modId]);

  const toggle = (id: string, key: "can_view" | "can_edit") => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [key]: !r[key] } : r));
  };

  const save = async () => {
    const payload = rows.map(({ id, ...rest }) => ({ id, ...rest }));
    const { error } = await supabase.from("rbac_field_permissions").upsert(payload);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Field permissions saved" });
    load();
  };

  const addField = async () => {
    if (!newField.field_key.trim() || !roleId || !modId) return;
    const { error } = await supabase.from("rbac_field_permissions").insert({
      role_id: roleId, module_id: modId,
      field_key: newField.field_key.trim().toLowerCase().replace(/\s+/g,"_"),
      field_label: newField.field_label || newField.field_key,
      category: newField.category, can_view: true, can_edit: false,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setNewField({ field_key: "", field_label: "", category: "basic" });
    load();
  };

  const grouped = useMemo(() => {
    const g: Record<string, FP[]> = {};
    rows.forEach(r => { (g[r.category] ||= []).push(r); });
    return g;
  }, [rows]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Field-Level Access Mapping</h2>
          <p className="text-sm text-muted-foreground">Control View and Edit access for sensitive fields per role and module.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={modId} onValueChange={setModId}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{mods.map(m => <SelectItem key={m.id} value={m.id}>{m.module_label}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={save}><Save className="mr-2 h-4 w-4" />Save</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Field</TableHead><TableHead>Category</TableHead>
              <TableHead className="text-center">Can View</TableHead><TableHead className="text-center">Can Edit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([cat, items]) => (
                <>
                  <TableRow key={`h-${cat}`}><TableCell colSpan={4} className="bg-muted/50 text-xs uppercase font-semibold">{cat}</TableCell></TableRow>
                  {items.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.field_label ?? r.field_key}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.field_key}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
                      <TableCell className="text-center"><Switch checked={r.can_view} onCheckedChange={() => toggle(r.id, "can_view")} /></TableCell>
                      <TableCell className="text-center"><Switch checked={r.can_edit} onCheckedChange={() => toggle(r.id, "can_edit")} /></TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No field rules for this role + module yet. Add one below.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Add Field Rule</Label>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="field_key (e.g. salary)" value={newField.field_key} onChange={(e) => setNewField({ ...newField, field_key: e.target.value })} />
            <Input placeholder="Display label" value={newField.field_label} onChange={(e) => setNewField({ ...newField, field_label: e.target.value })} />
            <Select value={newField.category} onValueChange={(v) => setNewField({ ...newField, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="sensitive">Sensitive</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addField}><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
