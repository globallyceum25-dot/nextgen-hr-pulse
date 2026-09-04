import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock, type TableFixtures, type MockAuthUser } from "@/test/supabaseMock";
import { renderHookWithQuery, waitFor } from "@/test/renderHook";

/**
 * useTasks feeds the task list, the dashboard KPIs and the exports, so its
 * derived values are reported numbers, not cosmetics.
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

const { useTasks } = await import("./useTasks");

const task = (over: Record<string, unknown> = {}) => ({
  id: "t1", task_number: 1, title: "Prepare report",
  status: "In Progress", priority: "High",
  due_date: null, progress: 0, sub_tasks: [],
  assignee_id: null, assignee_name: "Imasha Manamperi",
  assigned_by: "user-2", created_by: "user-2",
  created_at: "2026-09-01T00:00:00Z",
  ...over,
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

const freeze = (iso: string) => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(iso));
};

describe("useTasks — overdue derivation", () => {
  it("marks a past-due unfinished task as Overdue", async () => {
    freeze("2026-09-10T09:00:00");
    setMock({ user: USER, tables: { tasks: { data: [task({ due_date: "2026-09-01" })] } } });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0].status).toBe("Overdue");
  });

  it("does NOT mark completed work as overdue", async () => {
    freeze("2026-09-10T09:00:00");
    setMock({
      user: USER,
      tables: { tasks: { data: [task({ due_date: "2026-09-01", status: "Completed" })] } },
    });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0].status).toBe("Completed");
  });

  it("leaves closed and cancelled work alone", async () => {
    freeze("2026-09-10T09:00:00");
    setMock({
      user: USER,
      tables: {
        tasks: {
          data: [
            task({ id: "a", due_date: "2026-08-01", status: "Closed" }),
            task({ id: "b", due_date: "2026-08-01", status: "Cancelled" }),
          ],
        },
      },
    });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    expect(result.current.data?.map(t => t.status)).toEqual(["Closed", "Cancelled"]);
  });

  it("does not mark a future task overdue", async () => {
    freeze("2026-09-10T09:00:00");
    setMock({ user: USER, tables: { tasks: { data: [task({ due_date: "2026-12-01" })] } } });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0].status).toBe("In Progress");
  });

  it("leaves a task with no due date untouched", async () => {
    freeze("2026-09-10T09:00:00");
    setMock({ user: USER, tables: { tasks: { data: [task({ due_date: null })] } } });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0].status).toBe("In Progress");
  });
});

describe("useTasks — returns every task", () => {
  it("does not filter by assignee: the list is shared, My Tasks narrows it", async () => {
    // Regression guard: this hook once filtered to the current user's own
    // tasks for some roles, which made the main list look empty.
    setMock({
      user: USER,
      tables: {
        tasks: {
          data: [
            task({ id: "mine", assignee_name: "Imasha Manamperi" }),
            task({ id: "theirs", assignee_name: "Someone Else" }),
          ],
        },
      },
    });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    expect(result.current.data?.map(t => t.id)).toEqual(["mine", "theirs"]);
  });
});

describe("useTasks — failure is visible", () => {
  it("reports isError rather than an empty list", async () => {
    // The whole point of the isError work: a failed load must not render as
    // "No tasks found", which reads as "you have no work".
    setMock({
      user: USER,
      tables: { tasks: { data: null, error: { message: "permission denied", code: "42501" } } },
    });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });

  it("returns an empty array when there genuinely are no tasks", async () => {
    setMock({ user: USER, tables: { tasks: { data: [] } } });

    const { result } = renderHookWithQuery(() => useTasks());
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});
