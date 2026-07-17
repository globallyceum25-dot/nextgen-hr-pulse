import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Shield, KeyRound, Grid3x3, UsersRound, EyeOff, History, Inbox, Users } from "lucide-react";
import RbacRoleMaster from "./RbacRoleMaster";
import RbacPermissionMaster from "./RbacPermissionMaster";
import RbacModulePermissionMatrix from "./RbacModulePermissionMatrix";
import RbacUserScopeMapping from "./RbacUserScopeMapping";
import RbacFieldPermissions from "./RbacFieldPermissions";
import RbacAccessRequests from "./RbacAccessRequests";
import RbacAuditLog from "./RbacAuditLog";
import AdminUsersManager from "../AdminUsersManager";

const tabs = [
  { value: "users", label: "Users", icon: Users, Comp: AdminUsersManager },
  { value: "roles", label: "Roles", icon: Shield, Comp: RbacRoleMaster },
  { value: "permissions", label: "Permissions", icon: KeyRound, Comp: RbacPermissionMaster },
  { value: "matrix", label: "Permission Matrix", icon: Grid3x3, Comp: RbacModulePermissionMatrix },
  { value: "scopes", label: "User Scopes", icon: UsersRound, Comp: RbacUserScopeMapping },
  { value: "fields", label: "Field Access", icon: EyeOff, Comp: RbacFieldPermissions },
  { value: "requests", label: "Access Requests", icon: Inbox, Comp: RbacAccessRequests },
  { value: "audit", label: "Audit Logs", icon: History, Comp: RbacAuditLog },
];

export default function AccessControl() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "users";

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Access Control</h1>
        <p className="text-sm text-muted-foreground">
          Roles, permissions, user scopes, field-level access, and audit trail.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="w-full">
        <div className="border-b border-border px-6 overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            {tabs.map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-3 whitespace-nowrap"
              >
                <t.icon className="mr-2 h-4 w-4" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-0">
            <t.Comp />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
