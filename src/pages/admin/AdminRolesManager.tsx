import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  sector_hr_admin: "Sector HR Admin",
  responsible_person: "Responsible Person",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full system access. Can manage all settings, users, roles, and data across all sectors.",
  sector_hr_admin: "Manages HR operations within assigned sectors. Can create tasks and manage sector users.",
  responsible_person: "Assigned to specific tasks. Can view and update tasks they are responsible for.",
  viewer: "Read-only access. Can view dashboards, tasks, and reports but cannot modify data.",
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  sector_hr_admin: "bg-primary/10 text-primary border-primary/20",
  responsible_person: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  viewer: "bg-muted text-muted-foreground border-border",
};

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: ["All permissions", "Manage users & roles", "System configuration", "Delete tasks"],
  sector_hr_admin: ["Manage sector tasks", "View analytics", "Assign responsible persons", "Delete tasks"],
  responsible_person: ["View assigned tasks", "Update task status", "Add sub-tasks"],
  viewer: ["View dashboards", "View tasks", "View analytics"],
};

export default function AdminRolesManager() {
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCounts = async () => {
    setLoading(true);
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    roles?.forEach((r) => {
      counts[r.role] = (counts[r.role] || 0) + 1;
    });
    setUserCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Role Definitions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and understand the roles available in the system
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCounts}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
          <Card key={role}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{ROLE_LABELS[role]}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{userCounts[role] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">assigned users</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Roles</CardTitle>
          <CardDescription>System-defined roles and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                  <TableRow key={role}>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[role]}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px]">
                      {ROLE_DESCRIPTIONS[role]}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ROLE_PERMISSIONS[role].map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-[10px] font-normal">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {userCounts[role] || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4 px-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">About Roles</p>
            <p className="text-xs text-muted-foreground mt-1">
              Roles are system-defined and determine what actions a user can perform. To assign a role to a user, go to the <strong>Users</strong> tab.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
