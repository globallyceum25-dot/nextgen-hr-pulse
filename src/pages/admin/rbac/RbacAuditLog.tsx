import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface LogRow {
  id: string; user_id: string | null; employee_id: string | null;
  action: string; module: string | null;
  record_id: string | null; old_value: unknown; new_value: unknown;
  ip_address: string | null; user_agent: string | null; created_at: string;
}

export default function RbacAuditLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("rbac_audit_log")
      .select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data as LogRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (!search || r.action.toLowerCase().includes(search.toLowerCase()) || (r.record_id?.toLowerCase().includes(search.toLowerCase()) ?? false))
    && (!moduleFilter || r.module === moduleFilter)
  );

  const modules = Array.from(new Set(rows.map(r => r.module).filter(Boolean))) as string[];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">RBAC Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Append-only trail of access-control actions and unauthorized attempts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search action / record…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded px-3 py-2 text-sm bg-background" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">All modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Employee</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead><TableHead>Record</TableHead><TableHead>IP</TableHead>
              <TableHead>Device</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No audit entries yet</TableCell></TableRow>
              : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                  <TableCell className="font-mono text-[10px]">{r.user_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[10px]">{r.employee_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{r.action}</Badge></TableCell>
                  <TableCell className="text-sm">{r.module ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{r.record_id ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.ip_address ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate" title={r.user_agent ?? undefined}>
                    {r.user_agent ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
