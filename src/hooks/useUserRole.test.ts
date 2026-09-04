import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type TableFixtures, type MockAuthUser } from "@/test/supabaseMock";
import { renderHookWithQuery, waitFor } from "@/test/renderHook";

/**
 * useUserRole produces the role shown in the header and consumed by the profile
 * page. It caused two production incidents:
 *   - it collapsed any role outside the four legacy values to "viewer", so a
 *     Department Manager was displayed to themselves as "Viewer";
 *   - it had no error handling, so a failed lookup left `loading` true forever
 *     and every consumer rendered its loading state indefinitely.
 */

const USER: MockAuthUser = { id: "user-1", email: "imasha@corp.com" };

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

const { useUserRole, useIsAdmin } = await import("./useUserRole");

const withRoles = (legacy: string[], scopeKey?: string): TableFixtures => ({
  user_roles: { data: legacy.map(role => ({ role })) },
  rbac_user_scopes: {
    data: scopeKey ? { status: "active", rbac_roles: { role_key: scopeKey } } : null,
  },
});

beforeEach(() => vi.clearAllMocks());

describe("useUserRole — role resolution", () => {
  it("reports a modern role instead of collapsing it to viewer", async () => {
    // The bug: department_manager is not one of the four legacy app roles, and
    // the old getEffectiveRole() returned "viewer" for anything it did not know,
    // so the header showed "Viewer" for a Department Manager.
    setMock({ user: USER, tables: withRoles(["department_manager"]) });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.role).toBe("department_manager");
  });

  it("reads the role from rbac_user_scopes when user_roles is empty", async () => {
    setMock({ user: USER, tables: withRoles([], "data_entry_user") });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.role).toBe("data_entry_user");
  });

  it("merges both sources and picks the highest privilege", async () => {
    setMock({ user: USER, tables: withRoles(["viewer"], "department_manager") });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.role).toBe("department_manager");
    expect(result.current.roles).toContain("viewer");
  });

  it("ignores an inactive scope row", async () => {
    setMock({
      user: USER,
      tables: {
        user_roles: { data: [{ role: "viewer" }] },
        rbac_user_scopes: { data: { status: "inactive", rbac_roles: { role_key: "super_admin" } } },
      },
    });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.role).toBe("viewer");
    expect(result.current.isAdmin).toBe(false);
  });

  it("falls back to viewer only when the user genuinely has no role", async () => {
    setMock({ user: USER, tables: withRoles([]) });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.role).toBe("viewer");
  });
});

describe("useUserRole — admin detection", () => {
  it("treats super_admin as an admin", async () => {
    setMock({ user: USER, tables: withRoles(["super_admin"]) });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
  });

  it("treats sector_hr_admin as an admin", async () => {
    setMock({ user: USER, tables: withRoles(["sector_hr_admin"]) });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
  });

  it("does not treat a department manager as an admin", async () => {
    setMock({ user: USER, tables: withRoles(["department_manager"]) });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });

  it("useIsAdmin agrees with useUserRole", async () => {
    setMock({ user: USER, tables: withRoles(["super_admin"]) });
    const { result } = renderHookWithQuery(() => useIsAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
  });
});

describe("useUserRole — loading never hangs", () => {
  it("resolves for a signed-out visitor", async () => {
    setMock({ user: null, tables: {} });
    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roles).toEqual([]);
  });

  it("resolves when the lookup rejects, rather than loading forever", async () => {
    // Regression guard: check() had no .catch(), so a rejection left `loading`
    // true permanently and consumers rendered a spinner with no way out.
    setMock({ user: USER, tables: {} });
    const { supabase } = await import("@/integrations/supabase/client");
    vi.spyOn(supabase.auth, "getUser").mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHookWithQuery(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roles).toEqual([]);
  });
});
