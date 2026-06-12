# RBAC Module — Implementation Plan

A comprehensive Role-Based Access Control system layered on top of the existing platform. Existing modules (Tasks, Master Sheets, Analytics, Reports, Administration) stay intact; RBAC adds a new control layer on top.

Given the scope (8+ new DB tables, 6 new admin screens, enforcement across every existing module, approval workflow, audit logs, field-level masking), I'll deliver this in **5 sequential phases**. You approve each phase before I move to the next so we can verify behavior incrementally and avoid a single 50-file commit.

---

## Phase 1 — Database Foundation (Migration)

New tables in `public` schema, all with RLS + GRANTs:

1. **`rbac_roles`** — id, role_name, description, is_system (locked default roles), status, timestamps. Seeded with the 8 default roles.
2. **`rbac_permissions`** — id, permission_name (view, create, edit, delete, deactivate, approve, export, upload, assign_access), description, status. Seeded.
3. **`rbac_modules`** — id, module_key (dashboard, tasks, employees, companies, departments, locations, user_management, reports, documents, audit_logs), label, status. Seeded.
4. **`rbac_role_permissions`** — role_id, module_id, permission_id (matrix join). Seeded with the default permission matrix from your spec.
5. **`rbac_user_scopes`** — user_id, employee_id, role_id, company_ids[] (uuid[]), department_ids[], location_ids[], all_companies, all_departments, all_locations, effective_from, effective_to, status.
6. **`rbac_field_permissions`** — role_id, module_id, field_key, can_view, can_edit. Seeded with sensitive-field defaults.
7. **`rbac_access_requests`** — change_type, target_user_id, payload (jsonb), status (draft/submitted/pending/approved/rejected), requested_by, approved_by, timestamps.
8. **`rbac_audit_log`** — user_id, employee_id, action, module, record_id, old_value (jsonb), new_value (jsonb), ip_address, created_at.

**Security definer functions** (avoid RLS recursion):
- `rbac_has_permission(user_id, module_key, permission_key) → boolean`
- `rbac_user_company_scope(user_id) → uuid[]`
- `rbac_user_department_scope(user_id) → uuid[]`
- `rbac_user_location_scope(user_id) → uuid[]`
- `rbac_can_access_record(user_id, company_id, department_id, location_id) → boolean`

**Update RLS on existing tables** (`employees`, `companies`, `departments`, `locations`, `tasks`, `sub_tasks`) so reads/writes are filtered by the scope functions — keeps existing super_admin override.

---

## Phase 2 — RBAC Admin Screens

New section in the sidebar: **Access Control** (visible only with `admin` permission), containing:

- **Role Master** (`/admin/rbac/roles`) — table + create/edit dialog. System roles non-deletable; only Super Admin can hard delete.
- **Permission Master** (`/admin/rbac/permissions`) — table view, edit description/status.
- **Module Permission Mapping** (`/admin/rbac/matrix`) — pick a role → matrix of modules × permissions with toggle switches. Bulk save.
- **User Access Scope Mapping** (`/admin/rbac/user-scopes`) — list users, edit dialog with role select, multi-select dropdowns for companies/departments/locations, "All access" toggles, effective dates. Department dropdown filtered by selected companies.
- **Field-Level Access Mapping** (`/admin/rbac/fields`) — role + module → grid of fields with View/Edit toggles. Sensitive fields pre-grouped.
- **RBAC Audit Logs** (`/admin/rbac/audit`) — searchable timeline/table with filters (user, action, module, date range). Visible to Super/Group Admin only.

All screens use existing shadcn UI components, search bar, status badges, filters, confirmation modals.

---

## Phase 3 — Permission Enforcement Layer (Frontend)

- **Rewrite `src/config/rbac.ts` + `src/hooks/useUserRole.ts`** → new `usePermissions()` hook that loads from the new DB tables (role + module + permission + scopes + field perms), cached via React Query.
- New helper `<Can module="employees" action="create">` component to conditionally render buttons.
- New `<FieldGuard field="salary" mode="view|edit">` wrapper for sensitive fields (hide or show masked `••••`).
- Update `RouteGuard` to use new hook; expand `ROUTE_MODULE_MAP` to cover new admin sub-routes.
- Add **scope filters** to existing data hooks (`useEmployees`, `useTasks`, `useCompanies`, `useDepartments`, `useLocations`) so the client sends scope-aware queries.
- Update existing UI buttons (Add / Edit / Delete / Export / Upload across Master Sheets, Tasks, Admin) to wrap in `<Can>`.

---

## Phase 4 — Approval Workflow + Own Profile Rule

- **Access Requests UI** — when a non-Super-Admin edits a user scope/role/field perm, the change is saved as `pending_approval` instead of applied directly. New "Pending Approvals" tab in Audit Logs screen for approvers.
- **Own Profile rule** — when logged-in user's role is `employee_user`, all queries auto-restrict to `employee_id = current_user.employee_id`. Editable fields whitelisted (phone, email only).
- Trigger audit log entries on every RBAC action (role created/edited, scope changed, permission denied attempts).

---

## Phase 5 — Hardening + Backend Enforcement

- Update `create-user` edge function + add `rbac-apply-change` edge function that re-validates permissions server-side before approving requests (so URL/API tampering is blocked).
- Add `rbac_log_unauthorized_access()` DB function called from a global error boundary on 403s.
- Verify RLS: run linter, attempt cross-scope reads as test user, confirm denial.
- Final QA pass on every existing module with each default role.

---

## Technical Notes

- All RBAC tables use `service_role` GRANT + `authenticated` GRANT, RLS policies use `has_role()` + new `rbac_has_permission()` security-definer function.
- Audit log is **append-only** (no UPDATE/DELETE policy except for service_role).
- Field-level masking is enforced both in the UI (via `FieldGuard`) and at the DB view layer for sensitive columns (e.g. `employees_public` view excludes salary unless caller has permission).
- React Query cache invalidation on any RBAC change so permissions update without reload.

---

## What I need from you

1. **Approve the plan** to start Phase 1 (DB migration). I'll pause after each phase for your review.
2. **Confirm default permission matrix** — I'll seed exactly as specified in section 11 of your spec. Any deviation?
3. **Approval workflow** — should Super Admin changes also require approval (4-eyes), or apply immediately? Default: Super Admin applies immediately; all others require approval.

Reply "go" (or with answers) and I start Phase 1.