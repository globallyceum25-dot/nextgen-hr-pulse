import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { ROUTE_MODULE_MAP } from "@/config/rbac";
import { ShieldAlert } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { can, loading } = useUserRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Checking permissions...</p>
      </div>
    );
  }

  const module = ROUTE_MODULE_MAP[location.pathname];

  if (module && !can(module)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive/60" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
