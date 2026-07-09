import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, RefreshCw, Info, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  sector_hr_admin: "Sector HR Admin",
  responsible_person: "Responsible Person",
  viewer: "Viewer",
};

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

const DEFAULT_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full system access. Can manage all settings, users, roles, and data across all sectors.",
  sector_hr_admin: "Manages HR operations within assigned sectors. Can create tasks and manage sector users.",
  responsible_person: "Assigned to specific tasks. Can view and update tasks they are responsible for.",
  viewer: "Read-only access. Can view task analysis, tasks, and reports but cannot modify data.",
};

const DEFAULT_MODULES: Record<AppRole, string[]> = {
  super_admin: ["Tasks", "Task Analysis", "Master Sheets", "Reports", "Administration", "Access Control"],
  sector_hr_admin: ["Tasks", "Task Analysis", "Master Sheets", "Reports"],
  responsible_person: ["Tasks", "Task Analysis"],
  viewer: ["Tasks", "Task Analysis", "Reports"],
};

const DEFAULT_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: ["All permissions", "Manage users & roles", "System configuration", "Delete tasks"],
  sector_hr_admin: ["Manage sector tasks", "View reports", "Assign responsible persons", "Delete tasks"],
  responsible_person: ["View assigned tasks", "Update task status", "Add sub-tasks"],
  viewer: ["View task analysis", "View tasks", "View reports"],
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  sector_hr_admin: "bg-primary/10 text-primary border-primary/20",
  responsible_person: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  viewer: "bg-muted text-muted-foreground border-border",
};

interface RoleConfig {
  description: string;
  modules: string[];
  permissions: string[];
}

export default function AdminRolesManager() {
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [roleConfigs, setRoleConfigs] = useState<Record<AppRole, RoleConfig>>(() => {
    const STORAGE_KEY = "roleConfigs.v2";
    // Clear legacy cache with obsolete module names
    if (typeof window !== "undefined") localStorage.removeItem("roleConfigs");
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    const initial: Record<string, RoleConfig> = {};
    (Object.keys(ROLE_LABELS) as AppRole[]).forEach((role) => {
      initial[role] = {
        description: DEFAULT_DESCRIPTIONS[role],
        modules: [...DEFAULT_MODULES[role]],
        permissions: [...DEFAULT_PERMISSIONS[role]],
      };
    });
    return initial as Record<AppRole, RoleConfig>;
  });

  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [editForm, setEditForm] = useState<RoleConfig>({ description: "", modules: [], permissions: [] });

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

  useEffect(() => {
    localStorage.setItem("roleConfigs.v2", JSON.stringify(roleConfigs));
  }, [roleConfigs]);

  const openEdit = (role: AppRole) => {
    setEditForm({
      description: roleConfigs[role].description,
      modules: [...roleConfigs[role].modules],
      permissions: [...roleConfigs[role].permissions],
    });
    setEditingRole(role);
  };

  const toggleModule = (mod: string) => {
    setEditForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(mod)
        ? prev.modules.filter((m) => m !== mod)
        : [...prev.modules, mod],
    }));
  };

  const togglePermission = (perm: string) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const saveEdit = () => {
    if (!editingRole) return;
    setRoleConfigs((prev) => ({
      ...prev,
      [editingRole]: { ...editForm },
    }));
    toast({ title: "Role Updated", description: `${ROLE_LABELS[editingRole]} has been updated.` });
    setEditingRole(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Role Definitions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage the roles available in the system
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
                  <TableHead>Modules</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
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
                      {roleConfigs[role].description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roleConfigs[role].modules.map((mod) => (
                          <Badge key={mod} variant="outline" className="text-[10px] font-normal">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roleConfigs[role].permissions.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-[10px] font-normal">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {userCounts[role] || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Role –{" "}
              {editingRole && (
                <Badge variant="outline" className={ROLE_COLORS[editingRole]}>
                  {ROLE_LABELS[editingRole!]}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Update description, module access, and permissions for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Modules */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Module Access</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map((mod) => (
                  <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-accent/50 transition-colors">
                    <Checkbox
                      checked={editForm.modules.includes(mod)}
                      onCheckedChange={() => toggleModule(mod)}
                    />
                    {mod}
                  </label>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-accent/50 transition-colors">
                    <Checkbox
                      checked={editForm.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
