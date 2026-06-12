/**
 * RBAC Configuration - International Standard (NIST Core RBAC)
 * 
 * Role hierarchy (highest to lowest privilege):
 *   super_admin > sector_hr_admin > responsible_person > viewer
 * 
 * Each role maps to:
 *   - Allowed modules (pages/routes)
 *   - Allowed actions per module (view, create, edit, delete, export)
 */

export type AppRole = "super_admin" | "sector_hr_admin" | "responsible_person" | "viewer";

export type Module = "tasks" | "analytics" | "employees" | "reports" | "admin";

export type Action = "view" | "create" | "edit" | "delete" | "export";

export interface ModulePermission {
  allowed: boolean;
  actions: Action[];
}

export type RolePermissions = Record<Module, ModulePermission>;

const FULL_ACTIONS: Action[] = ["view", "create", "edit", "delete", "export"];
const READ_WRITE: Action[] = ["view", "create", "edit"];
const READ_ONLY: Action[] = ["view"];

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  super_admin: {
    tasks:     { allowed: true, actions: FULL_ACTIONS },
    analytics: { allowed: true, actions: FULL_ACTIONS },
    employees: { allowed: true, actions: FULL_ACTIONS },
    reports:   { allowed: true, actions: FULL_ACTIONS },
    admin:     { allowed: true, actions: FULL_ACTIONS },
  },
  sector_hr_admin: {
    tasks:     { allowed: true, actions: FULL_ACTIONS },
    analytics: { allowed: true, actions: FULL_ACTIONS },
    employees: { allowed: true, actions: FULL_ACTIONS },
    reports:   { allowed: true, actions: ["view", "export"] },
    admin:     { allowed: false, actions: [] },
  },
  responsible_person: {
    tasks:     { allowed: true, actions: READ_WRITE },
    analytics: { allowed: true, actions: READ_ONLY },
    employees: { allowed: true, actions: READ_ONLY },
    reports:   { allowed: true, actions: ["view"] },
    admin:     { allowed: false, actions: [] },
  },
  viewer: {
    tasks:     { allowed: true, actions: READ_ONLY },
    analytics: { allowed: true, actions: READ_ONLY },
    employees: { allowed: false, actions: [] },
    reports:   { allowed: false, actions: [] },
    admin:     { allowed: false, actions: [] },
  },
};

/** Route path → module mapping */
export const ROUTE_MODULE_MAP: Record<string, Module> = {
  "/":          "analytics",
  "/tasks":     "tasks",
  "/analytics": "analytics",
  "/employees": "employees",
  "/reports":   "reports",
  "/admin":     "admin",
  "/admin/rbac":"admin",
};

/** Get the highest-privilege role from a list */
const ROLE_HIERARCHY: AppRole[] = ["super_admin", "sector_hr_admin", "responsible_person", "viewer"];

export function getEffectiveRole(roles: AppRole[]): AppRole {
  for (const r of ROLE_HIERARCHY) {
    if (roles.includes(r)) return r;
  }
  return "viewer";
}

export function canAccessModule(role: AppRole, module: Module): boolean {
  return ROLE_PERMISSIONS[role]?.[module]?.allowed ?? false;
}

export function canPerformAction(role: AppRole, module: Module, action: Action): boolean {
  const perm = ROLE_PERMISSIONS[role]?.[module];
  return perm?.allowed && perm.actions.includes(action) ? true : false;
}
