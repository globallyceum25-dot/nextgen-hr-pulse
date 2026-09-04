import { vi } from "vitest";

/**
 * Minimal stand-in for the Supabase client.
 *
 * The real client exposes a chainable builder — .from().select().eq().in()
 * .order().limit().maybeSingle()/.single() — that is thenable at any point.
 * This reproduces that shape so hooks can be tested without a network or a
 * database, and lets a test declare a canned result per table.
 */

export interface TableResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

/** Canned results keyed by table name, e.g. { user_roles: { data: [...] } }. */
export type TableFixtures = Record<string, TableResult>;

export interface MockAuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export function createSupabaseMock(opts: {
  tables?: TableFixtures;
  user?: MockAuthUser | null;
} = {}) {
  const tables = opts.tables ?? {};
  const user = opts.user === undefined ? null : opts.user;

  /** Every call the tests care about, for asserting on query shape. */
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const builderFor = (table: string) => {
    const result: TableResult = tables[table] ?? { data: [], error: null };
    const settled = { data: result.data ?? null, error: result.error ?? null };

    const builder: Record<string, unknown> = {};
    // Chainable no-ops that record the call and return the builder.
    for (const m of ["select", "eq", "neq", "in", "or", "ilike", "gte", "lte", "order", "limit", "range", "insert", "update", "delete", "upsert"]) {
      builder[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return builder;
      };
    }
    // Terminators resolve to the canned result.
    builder.single = () => Promise.resolve(settled);
    builder.maybeSingle = () => Promise.resolve(settled);
    // The builder itself is awaitable, like PostgREST's.
    builder.then = (resolve: (v: TableResult) => unknown) => Promise.resolve(settled).then(resolve);
    return builder;
  };

  const client = {
    from: vi.fn((table: string) => builderFor(table)),
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
      getSession: vi.fn(async () => ({
        data: { session: user ? { access_token: "test-token", user } : null },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(async () => ({ data: { user }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  };

  return { client, calls };
}
