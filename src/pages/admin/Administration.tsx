import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Activity } from "lucide-react";
import AdminBackend from "./AdminBackend";
import SystemHealthMonitoring from "./SystemHealthMonitoring";
import { useSearchParams } from "react-router-dom";

export default function Administration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "backend";

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Administration</h1>
        <p className="text-sm text-muted-foreground">
          System configuration, backend services, and user role management
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v })}
        className="w-full"
      >
        <div className="border-b border-border px-6">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger
              value="backend"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-3"
            >
              <Server className="mr-2 h-4 w-4" />
              Backend
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-3"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              User Roles
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-3"
            >
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="health"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-3"
            >
              <Activity className="mr-2 h-4 w-4" />
              System Health
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="backend" className="mt-0">
          <AdminBackend />
        </TabsContent>
        <TabsContent value="roles" className="mt-0">
          <AdminRolesManager />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <AdminUsersManager />
        </TabsContent>
        <TabsContent value="health" className="mt-0">
          <SystemHealthMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
}
