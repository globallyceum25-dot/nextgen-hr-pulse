import { ReactNode } from "react";
import { usePermissions, RbacModuleKey } from "@/hooks/usePermissions";

interface FieldGuardProps {
  module: RbacModuleKey;
  field: string;
  mode?: "view" | "edit";
  /** What to show when the user can't view: 'hide' removes it, 'mask' shows ••••. Default: hide. */
  whenDenied?: "hide" | "mask";
  children: ReactNode;
}

/** Conditionally render a field based on field-level permission for the current user. */
export function FieldGuard({ module, field, mode = "view", whenDenied = "hide", children }: FieldGuardProps) {
  const { canViewField, canEditField, loading } = usePermissions();
  if (loading) return null;
  const allowed = mode === "edit" ? canEditField(module, field) : canViewField(module, field);
  if (allowed) return <>{children}</>;
  if (whenDenied === "mask") return <span className="text-muted-foreground select-none">••••••</span>;
  return null;
}
