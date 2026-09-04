import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type TableFixtures, type MockAuthUser } from "@/test/supabaseMock";
import { renderHookWithQuery, waitFor } from "@/test/renderHook";

/**
 * useCurrentUser resolves who the signed-in person is. It exists because the
 * previous implementation read the name from public.employees, which is
 * RLS-restricted, so non-admins resolved to null and "My Tasks" silently
 * matched nothing while "Assigned By" rendered "Unmapped User".
 */

const USER: MockAuthUser = {
  id: "user-1",
  email: "Imasha@Corp.com",
  user_metadata: { full_name: "Imasha Manamperi" },
};

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

const { useCurrentUser, useProfiles } = await import("./useProfiles");

beforeEach(() => vi.clearAllMocks());

describe("useCurrentUser", () => {
  it("prefers the profile's full name", async () => {
    setMock({
      user: USER,
      tables: { profiles: { data: { full_name: "Imasha Manamperi", email: "imasha@corp.com" } } },
    });
    const { result } = renderHookWithQuery(() => useCurrentUser());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.fullName).toBe("Imasha Manamperi");
    expect(result.current.data?.userId).toBe("user-1");
  });

  it("lowercases the email so name/email matching is case-insensitive", async () => {
    setMock({
      user: USER,
      tables: { profiles: { data: { full_name: "Imasha Manamperi", email: "Imasha@Corp.com" } } },
    });
    const { result } = renderHookWithQuery(() => useCurrentUser());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.email).toBe("imasha@corp.com");
  });

  it("falls back to auth metadata when the profile has no name", async () => {
    setMock({
      user: USER,
      tables: { profiles: { data: { full_name: null, email: "imasha@corp.com" } } },
    });
    const { result } = renderHookWithQuery(() => useCurrentUser());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.fullName).toBe("Imasha Manamperi");
  });

  it("never returns an email as the name", async () => {
    // handle_new_user() seeds profiles.full_name with the email address, so a
    // "name" that is really an email is a real case, not a hypothetical.
    setMock({
      user: { id: "user-2", email: "ghost@corp.com", user_metadata: {} },
      tables: { profiles: { data: { full_name: "ghost@corp.com", email: "ghost@corp.com" } } },
    });
    const { result } = renderHookWithQuery(() => useCurrentUser());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.fullName).toBeNull();
  });

  it("returns a null name rather than guessing when nothing is available", async () => {
    setMock({
      user: { id: "user-3", email: "nobody@corp.com", user_metadata: {} },
      tables: { profiles: { data: null } },
    });
    const { result } = renderHookWithQuery(() => useCurrentUser());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.fullName).toBeNull();
    expect(result.current.data?.email).toBe("nobody@corp.com");
  });

  it("does not query while signed out", async () => {
    setMock({ user: null, tables: {} });
    const { result } = renderHookWithQuery(() => useCurrentUser());
    // enabled:!!userId keeps the query disabled, so no data is ever produced.
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe("useProfiles", () => {
  it("returns the directory", async () => {
    setMock({
      user: USER,
      tables: {
        profiles: {
          data: [
            { id: "p1", user_id: "user-1", full_name: "Imasha Manamperi", email: "imasha@corp.com" },
            { id: "p2", user_id: "user-2", full_name: "Kushan Gunasekara", email: "kushan@corp.com" },
          ],
        },
      },
    });
    const { result } = renderHookWithQuery(() => useProfiles());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[1].full_name).toBe("Kushan Gunasekara");
  });

  it("yields an empty list, not undefined, when RLS hides every row", async () => {
    setMock({ user: USER, tables: { profiles: { data: [] } } });
    const { result } = renderHookWithQuery(() => useProfiles());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual([]);
  });

  it("surfaces an error instead of pretending the directory is empty", async () => {
    setMock({
      user: USER,
      tables: { profiles: { data: null, error: { message: "permission denied", code: "42501" } } },
    });
    const { result } = renderHookWithQuery(() => useProfiles());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});
