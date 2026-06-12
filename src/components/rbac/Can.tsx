import { ReactNode } from "react";
import { usePermissions, RbacModuleKey, RbacActionKey } from "@/hooks/usePermissions";

interface CanProps {
  module: RbacModuleKey;
  action?: RbacActionKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditionally render children if the current user has the requested permission. */
export function Can({ module, action = "view", children, fallback = null }: CanProps) {
  const { can, loading } = usePermissions();
  if (loading) return null;
  return can(module, action) ? <>{children}</> : <>{fallback}</>;
}
