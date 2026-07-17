import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Shield, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  role_id: string;
  created_at: string;
}

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  super_admin: "Super Admin",
  sector_hr_admin: "Sector HR Admin",
  responsible_person: "Responsible Person",
  viewer: "Viewer",
};

const ROLE_COLORS: Partial<Record<AppRole, string>> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  sector_hr_admin: "bg-primary/10 text-primary border-primary/20",
  responsible_person: "bg-warning/10 text-warning border-warning/20",
  viewer: "bg-muted text-muted-foreground border-border",
};

export default function AdminUserRoles() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, created_at");

    if (rolesError) {
      toast({ title: "Error", description: rolesError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!roles || roles.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(roles.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

    const combined: UserWithRole[] = roles.map((r) => {
      const profile = profileMap.get(r.user_id);
      return {
        user_id: r.user_id,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        role: r.role,
        role_id: r.id,
        created_at: r.created_at,
      };
    });

    setUsers(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role removed" });
      fetchUsers();
    }
  };

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user access levels and permissions across sectors
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Role to User</DialogTitle>
                <DialogDescription>
                  The user must already have an account. Enter their email to assign a role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    // Look up user by email in profiles
                    const { data: profile } = await supabase
                      .from("profiles")
                      .select("user_id")
                      .eq("email", newEmail)
                      .maybeSingle();

                    if (!profile) {
                      toast({ title: "User not found", description: "No account with that email exists.", variant: "destructive" });
                      return;
                    }

                    const { error } = await supabase
                      .from("user_roles")
                      .insert({ user_id: profile.user_id, role: newRole });

                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Role assigned" });
                      setDialogOpen(false);
                      setNewEmail("");
                      setNewRole("viewer");
                      fetchUsers();
                    }
                  }}
                >
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
              <p className="text-2xl font-bold text-foreground">{roleCounts[role] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Roles</CardTitle>
          <CardDescription>All users with assigned roles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create user accounts first, then assign roles here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.role_id}>
                    <TableCell className="font-medium text-foreground">
                      {u.full_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[u.role]}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRole(u.role_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
