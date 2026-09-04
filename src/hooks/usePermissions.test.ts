import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type TableFixtures, type MockAuthUser } from "@/test/supabaseMock";
import { renderHookWithQuery, waitFor } from "@/test/renderHook";

/**
 * usePermissions decides what every user may see and do, so a silent change
 * here is an access-control incident. These tests pin the behaviour that
 * actually went wrong in production:
 *   - a disabled query reporting loading:false, which made RouteGuard render
 *     "Access Denied" before auth had even answered;
 *   - deny-by-default when a user has no role.
 */

const USER: MockAuthUser = { id: "user-1", email: "imasha@corp.com" };

/** Reconfigure the mocked client for one test. */
let setMock: (o: { tables?: TableFixtures; user?: MockAuthUser | null }) => void;

vi.mock("@/integrations/supabase/client", () => {
  let current = createSupabaseMock({ user: null });
  setMock = (o) => { current = createSupabaseMock(o); };
  return {
    supabase: new Proxy({} as Record<string, unknown>, {
      get: (_t, prop: string) => (current.client as Record<string, unknown>)[prop],
    }),
  };
});

const { usePermissions } = await import("./usePermissions");

/** A user holding one rbac role with a tasks:view + tasks:edit grant. */
const dataEntryFixtures: TableFixtures = {
  rbac_user_scopes: {
    data: {
      role_id: "role-1", employee_id: null,
      company_ids: [], department_ids: [], location_ids: [],
      all_companies: true, all_departments: true, all_locations: true,
      status: "active", rbac_roles: { role_key: "data_entry_user" },
    },
  },
  user_roles: { data: [{ role: "data_entry_user" }] },
  rbac_roles: { data: [{ id: "role-1", role_key: "data_entry_user" }] },
  rbac_role_permissions: {
    data: [
      { granted: true, rbac_modules: { module_key: "tasks" }, rbac_permissions: { permission_key: "view" } },
      { granted: true, rbac_modules: { module_key: "tasks" }, rbac_permissions: { permission_key: "edit" } },
      { granted: true, rbac_modules: { module_key: "dashboard" }, rbac_permissions: { permission_key: "view" } },
    ],
  },
  rbac_field_permissions: { data: [] },
};

beforeEach(() => vi.clearAllMocks());

describe("usePermissions — loading state", () => {
  it("reports loading until auth has answered", async () => {
    // Regression guard: react-query reports isLoading === false for a DISABLED
    // query. Before the fix the hook returned loading:false on first render
    // with no permission state, so RouteGuard flashed a full-page
    // "Access Denied" before we knew who the user was.
    setMock({ user: USER, tables: dataEntryFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("stops loading for a signed-out visitor rather than hanging", async () => {
    setMock({ user: null, tables: {} });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

describe("usePermissions — can()", () => {
  it("grants what the role's matrix allows", async () => {
    setMock({ user: USER, tables: dataEntryFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.can("tasks", "view")).toBe(true);
    expect(result.current.can("tasks", "edit")).toBe(true);
  });

  it("denies an action the matrix does not grant", async () => {
    setMock({ user: USER, tables: dataEntryFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.can("tasks", "delete")).toBe(false);
    expect(result.current.can("employees", "view")).toBe(false);
  });

  it("aliases analytics to the dashboard module", async () => {
    // ROUTE_MODULE_MAP maps "/" to "analytics" while the matrix stores
    // "dashboard"; without the alias the landing page 403s.
    setMock({ user: USER, tables: dataEntryFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.can("analytics", "view")).toBe(true);
  });

  it("denies everything while state is still undefined", async () => {
    setMock({ user: USER, tables: dataEntryFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());
    // Before resolution: deny, but ALSO report loading so the UI waits rather
    // than rendering Access Denied.
    expect(result.current.can("tasks", "view")).toBe(false);
    expect(result.current.loading).toBe(true);
    // Let the query settle so the async auth update lands inside the test.
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("denies by default for a user with no role at all", async () => {
    setMock({
      user: USER,
      tables: {
        rbac_user_scopes: { data: null },
        user_roles: { data: [] },
        rbac_roles: { data: [] },
        rbac_role_permissions: { data: [] },
        rbac_field_permissions: { data: [] },
      },
    });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.can("tasks", "view")).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
  });
});

describe("usePermissions — super admin", () => {
  const superAdminFixtures: TableFixtures = {
    rbac_user_scopes: { data: null },
    user_roles: { data: [{ role: "super_admin" }] },
    rbac_roles: { data: [{ id: "role-super", role_key: "super_admin" }] },
    // Deliberately empty: a super admin must not depend on matrix rows.
    rbac_role_permissions: { data: [] },
    rbac_field_permissions: { data: [] },
  };

  it("grants everything via the legacy user_roles table even with an empty matrix", async () => {
    setMock({ user: USER, tables: superAdminFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.can("tasks", "delete")).toBe(true);
    expect(result.current.can("employees", "view")).toBe(true);
    expect(result.current.can("user_management", "edit")).toBe(true);
  });

  it("can view and edit any field", async () => {
    setMock({ user: USER, tables: superAdminFixtures });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canViewField("employees", "salary")).toBe(true);
    expect(result.current.canEditField("employees", "salary")).toBe(true);
  });
});

describe("usePermissions — effective role", () => {
  it("picks the highest-privilege role when a user holds several", async () => {
    setMock({
      user: USER,
      tables: {
        ...dataEntryFixtures,
        user_roles: { data: [{ role: "viewer" }, { role: "department_manager" }] },
        rbac_roles: {
          data: [
            { id: "r-viewer", role_key: "viewer" },
            { id: "r-dm", role_key: "department_manager" },
          ],
        },
      },
    });
    const { result } = renderHookWithQuery(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // department_manager outranks viewer in ROLE_PRIORITY.
    expect(result.current.roleKey).toBe("department_manager");
  });
});
