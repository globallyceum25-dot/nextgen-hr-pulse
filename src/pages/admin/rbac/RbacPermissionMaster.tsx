import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Power, Search } from "lucide-react";

interface Perm {
  id: string;
  permission_key: string;
  permission_name: string;
  description: string | null;
  status: string;
}

export default function RbacPermissionMaster() {
  const [rows, setRows] = useState<Perm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Perm | null>(null);
  const [form, setForm] = useState({ permission_name: "", description: "" });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("rbac_permissions").select("*").order("permission_name");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setRows((data as Perm[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p: Perm) => { setEditing(p); setForm({ permission_name: p.permission_name, description: p.description ?? "" }); };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("rbac_permissions")
      .update({ permission_name: form.permission_name, description: form.description || null })
      .eq("id", editing.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    setEditing(null); load();
  };

  const toggle = async (p: Perm) => {
    await supabase.from("rbac_permissions").update({ status: p.status === "active" ? "inactive" : "active" }).eq("id", p.id);
    load();
  };

  const filtered = rows.filter(r => !search || r.permission_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Permission Master</h2>
        <p className="text-sm text-muted-foreground">System-wide permission actions used across the matrix.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search permissions…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Key</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.permission_key}</TableCell>
                  <TableCell className="font-medium">{p.permission_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.description}</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggle(p)}><Power className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Permission</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Name</Label>
              <Input value={form.permission_name} onChange={(e) => setForm({ ...form, permission_name: e.target.value })} />
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
