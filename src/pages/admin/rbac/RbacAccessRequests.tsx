import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye, Send, Search, Inbox } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { friendlyError } from "@/lib/errorMessage";

interface RequestRow {
  id: string;
  change_type: string;
  target_user_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  requested_by: string;
  approved_by: string | null;
  approver_note: string | null;
  created_at: string;
  updated_at: string;
}
interface Profile { user_id: string; full_name: string | null; email: string | null; }

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-300",
};

export default function RbacAccessRequests() {
  const { toast } = useToast();
  const { isSuperAdmin, roleKey } = usePermissions();
  const canApprove = isSuperAdmin || roleKey === "sector_hr_admin";

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<RequestRow | null>(null);
  const [confirm, setConfirm] = useState<{ row: RequestRow; action: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    const [reqs, profs] = await Promise.all([
      supabase.from("rbac_access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id,full_name,email"),
    ]);
    setRows((reqs.data as RequestRow[]) ?? []);
    const map: Record<string, Profile> = {};
    ((profs.data as Profile[]) ?? []).forEach(p => { map[p.user_id] = p; });
    setProfiles(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && r.change_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const target = r.target_user_id ? profiles[r.target_user_id] : null;
      const requester = profiles[r.requested_by];
      const hay = `${target?.full_name ?? ""} ${target?.email ?? ""} ${requester?.full_name ?? ""} ${requester?.email ?? ""} ${r.change_type}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, statusFilter, typeFilter, search, profiles]);

  const submit = async (r: RequestRow) => {
    const { error } = await supabase.from("rbac_access_requests")
      .update({ status: "submitted" }).eq("id", r.id);
    if (error) return toast({ title: "Error", description: friendlyError(error), variant: "destructive" });
    toast({ title: "Submitted", description: "Request sent for approval." });
    load();
  };

  const applyApproved = async (r: RequestRow): Promise<string | null> => {
    // Apply approved payload depending on change_type
    try {
      if (!r.target_user_id) return "Missing target user.";
      const p = r.payload as any;
      if (r.change_type === "role_assignment" || r.change_type.endsWith("_scope") || r.change_type === "permission_change") {
        // Upsert into rbac_user_scopes with sanitized fields
        const allowed: Record<string, unknown> = {};
        const fields = [
          "role_id", "employee_id", "company_ids", "department_ids", "location_ids",
          "all_companies", "all_departments", "all_locations",
          "effective_from", "effective_to", "status",
        ];
        for (const k of fields) if (p[k] !== undefined) allowed[k] = p[k];
        allowed["user_id"] = r.target_user_id;
        const { error } = await supabase
          .from("rbac_user_scopes")
          .upsert(allowed as any, { onConflict: "user_id" });
        if (error) return error.message;
      } else if (r.change_type === "field_access") {
        // Expect payload.rows: [{ role_id, module_id, field_key, can_view, can_edit }]
        const items = Array.isArray(p.rows) ? p.rows : [];
        if (items.length) {
          const { error } = await supabase
            .from("rbac_field_permissions")
            .upsert(items as any, { onConflict: "role_id,module_id,field_key" });
          if (error) return error.message;
        }
      }
      return null;
    } catch (e: any) {
      return e?.message ?? "Unknown error";
    }
  };

  const decide = async () => {
    if (!confirm) return;
    const { row, action } = confirm;
    const newStatus = action === "approve" ? "approved" : "rejected";
    const { data: userRes } = await supabase.auth.getUser();
    if (action === "approve") {
      const err = await applyApproved(row);
      if (err) {
        toast({ title: "Apply failed", description: err, variant: "destructive" });
        setConfirm(null);
        return;
      }
    }
    const { error } = await supabase.from("rbac_access_requests")
      .update({
        status: newStatus,
        approved_by: userRes.user?.id ?? null,
        approver_note: note || null,
      })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Error", description: friendlyError(error), variant: "destructive" });
    } else {
      toast({ title: action === "approve" ? "Approved" : "Rejected" });
    }
    setConfirm(null); setNote(""); load();
  };

  const label = (uid: string | null) => {
    if (!uid) return "—";
    const p = profiles[uid];
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, requester, type…" className="pl-8" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All change types</SelectItem>
              <SelectItem value="role_assignment">Role assignment</SelectItem>
              <SelectItem value="permission_change">Permission change</SelectItem>
              <SelectItem value="company_scope">Company scope</SelectItem>
              <SelectItem value="department_scope">Department scope</SelectItem>
              <SelectItem value="location_scope">Location scope</SelectItem>
              <SelectItem value="field_access">Field access</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Inbox className="h-8 w-8" />
              No access requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target User</TableHead>
                  <TableHead>Change Type</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{label(r.target_user_id)}</TableCell>
                    <TableCell className="capitalize">{r.change_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{label(r.requested_by)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => submit(r)}>
                          <Send className="h-4 w-4 mr-1" /> Submit
                        </Button>
                      )}
                      {canApprove && (r.status === "submitted" || r.status === "pending") && (
                        <>
                          <Button size="sm" variant="default" onClick={() => { setConfirm({ row: r, action: "approve" }); setNote(""); }}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setConfirm({ row: r, action: "reject" }); setNote(""); }}>
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Access Request Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Target user</Label><div>{label(viewing.target_user_id)}</div></div>
                <div><Label className="text-xs text-muted-foreground">Requested by</Label><div>{label(viewing.requested_by)}</div></div>
                <div><Label className="text-xs text-muted-foreground">Change type</Label><div className="capitalize">{viewing.change_type.replace(/_/g, " ")}</div></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><div><Badge className={STATUS_COLORS[viewing.status]}>{viewing.status}</Badge></div></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payload</Label>
                <pre className="mt-1 max-h-72 overflow-auto rounded border border-border bg-muted/40 p-3 text-xs">
{JSON.stringify(viewing.payload, null, 2)}
                </pre>
              </div>
              {viewing.approver_note && (
                <div>
                  <Label className="text-xs text-muted-foreground">Approver note</Label>
                  <div className="text-foreground">{viewing.approver_note}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "approve" ? "Approve this request?" : "Reject this request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "approve"
                ? "The requested changes will be applied immediately to the user's access."
                : "The request will be marked rejected and no changes will be applied."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Approver note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or context…" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={decide}>
              {confirm?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
