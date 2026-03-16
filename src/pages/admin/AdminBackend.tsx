import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Server, Shield, HardDrive, RefreshCw } from "lucide-react";

export default function AdminBackend() {
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");

  const checkConnection = async () => {
    setStatus("checking");
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      setStatus(error ? "error" : "connected");
    } catch {
      setStatus("error");
    }
  };

  const services = [
    {
      name: "Database (PostgreSQL)",
      icon: Database,
      description: "Stores all HR tasks, KPIs, user profiles, and roles",
      status: "Active",
    },
    {
      name: "Authentication",
      icon: Shield,
      description: "Handles user sign-up, login, and session management",
      status: "Active",
    },
    {
      name: "Edge Functions",
      icon: Server,
      description: "Serverless functions for backend logic and integrations",
      status: "Active",
    },
    {
      name: "Storage",
      icon: HardDrive,
      description: "File storage for documents, avatars, and attachments",
      status: "Active",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backend Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and manage Lovable Cloud backend infrastructure
        </p>
      </div>

      {/* Connection Check */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connection Status</CardTitle>
          <CardDescription>Test connectivity to the backend</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button onClick={checkConnection} size="sm" variant="outline" disabled={status === "checking"}>
            <RefreshCw className={`mr-2 h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`} />
            Test Connection
          </Button>
          {status === "connected" && (
            <Badge className="bg-success text-success-foreground">Connected</Badge>
          )}
          {status === "error" && (
            <Badge variant="destructive">Connection Failed</Badge>
          )}
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <service.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm">{service.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-success border-success/30">
                  {service.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{service.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Database Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Database Tables</CardTitle>
          <CardDescription>Tables provisioned in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {["profiles", "user_roles"].map((table) => (
              <div key={table} className="flex items-center justify-between p-3 rounded-md bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{table}</span>
                </div>
                <Badge variant="secondary" className="text-xs">RLS Enabled</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
