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
import { UserPlus, Trash2, RefreshCw, Users, Shield } from "lucide-react";
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

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  sector_hr_admin: "Sector HR Admin",
  responsible_person: "Responsible Person",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  sector_hr_admin: "bg-primary/10 text-primary border-primary/20",
  responsible_person: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  viewer: "bg-muted text-muted-foreground border-border",
};

export default function AdminUsersManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [assigning, setAssigning] = useState(false);
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
      toast({ title: "User role removed" });
      fetchUsers();
    }
  };

  const handleAssignRole = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      toast({ title: "Validation Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setAssigning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        toast({ title: "Error", description: "No active session. Please sign in again.", variant: "destructive" });
        setAssigning(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: newEmail.trim(),
            password: newPassword,
            full_name: newFullName.trim() || newEmail.trim(),
            role: newRole,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        const msg = data?.error || data?.message || "Failed to create user";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } else {
        toast({
          title: data?.role_assigned === false ? "Notice" : "Success",
          description: data?.message || "User created & role assigned successfully",
        });
        setDialogOpen(false);
        setNewEmail("");
        setNewPassword("");
        setNewFullName("");
        setNewRole("viewer");
        fetchUsers();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const uniqueUsers = new Set(users.map((u) => u.user_id)).size;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Users Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assign users to roles and manage their access levels
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
                Assign User to Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User & Assign Role</DialogTitle>
                <DialogDescription>
                  Create a new user account with email and password, then assign a role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role <span className="text-destructive">*</span></Label>
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
                <Button onClick={handleAssignRole} disabled={!newEmail.trim() || !newPassword.trim() || assigning}>
                  {assigning ? "Creating..." : "Create & Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{uniqueUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Total Assignments</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Users</CardTitle>
          <CardDescription>All users with assigned roles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No users assigned to roles yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Assign User to Role" to add users.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Date</TableHead>
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
