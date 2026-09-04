import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { friendlyError } from "./errorMessage";

/**
 * The point of this module is that a user never sees raw database text.
 * These tests exist mainly as a leak guard: if someone widens the pass-through
 * branch, the "never leaks" cases below should fail.
 */

beforeEach(() => {
  // The mapper console.errors the raw error on purpose; keep test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("friendlyError — Postgres error codes", () => {
  it("maps insufficient_privilege (RLS) to a permission message", () => {
    expect(friendlyError({ code: "42501", message: 'new row violates row-level security policy for table "tasks"' }))
      .toBe("You do not have permission to do that.");
  });

  it("maps unique_violation", () => {
    expect(friendlyError({ code: "23505", message: 'duplicate key value violates unique constraint "employees_email_key"' }))
      .toBe("That record already exists.");
  });

  it("maps foreign_key_violation", () => {
    expect(friendlyError({ code: "23503", message: "insert or update violates foreign key constraint" }))
      .toMatch(/no longer exists/i);
  });

  it("maps not_null_violation", () => {
    expect(friendlyError({ code: "23502", message: 'null value in column "title" violates not-null constraint' }))
      .toBe("A required field is missing.");
  });

  it("maps PGRST116 (zero rows from .single(), i.e. hidden by RLS)", () => {
    expect(friendlyError({ code: "PGRST116", message: "Cannot coerce the result to a single JSON object" }))
      .toBe("You do not have permission to view or change this record.");
  });

  it("maps an expired session", () => {
    expect(friendlyError({ code: "PGRST301", message: "JWT expired" }))
      .toMatch(/session has expired/i);
  });
});

describe("friendlyError — pattern fallbacks when there is no code", () => {
  it("recognises RLS text", () => {
    expect(friendlyError({ message: 'new row violates row-level security policy for table "sub_tasks"' }))
      .toBe("You do not have permission to do that.");
  });

  it("recognises the PostgREST coercion message", () => {
    expect(friendlyError({ message: "Cannot coerce the result to a single JSON object" }))
      .toMatch(/permission/i);
  });

  it("recognises a network failure", () => {
    expect(friendlyError(new TypeError("Failed to fetch")))
      .toMatch(/could not reach the server/i);
  });
});

describe("friendlyError — never leaks database internals", () => {
  const leaky = [
    'new row violates row-level security policy for table "tasks"',
    'duplicate key value violates unique constraint "employees_email_key"',
    'null value in column "department_name" violates not-null constraint',
    'insert or update on table "tasks" violates foreign key constraint "tasks_assignee_id_fkey"',
    "Cannot coerce the result to a single JSON object",
  ];

  it.each(leaky)("does not surface: %s", (raw) => {
    const out = friendlyError({ message: raw });
    expect(out).not.toContain("violates");
    expect(out).not.toContain("constraint");
    expect(out).not.toMatch(/table "/);
    expect(out).not.toContain("column");
    expect(out).not.toBe(raw);
  });
});

describe("friendlyError — human messages pass through", () => {
  it("keeps a message we wrote ourselves", () => {
    const ours = "You do not have permission to edit this sub-task.";
    expect(friendlyError(new Error(ours))).toBe(ours);
  });

  it("keeps a plain validation sentence", () => {
    expect(friendlyError(new Error("Sub-task title is required."))).toBe("Sub-task title is required.");
  });
});

describe("friendlyError — degenerate input", () => {
  it("returns the fallback for null", () => {
    expect(friendlyError(null)).toMatch(/something went wrong/i);
  });

  it("returns the fallback for undefined", () => {
    expect(friendlyError(undefined)).toMatch(/something went wrong/i);
  });

  it("returns the fallback for an object with no message", () => {
    expect(friendlyError({})).toMatch(/something went wrong/i);
  });

  it("honours a custom fallback", () => {
    expect(friendlyError({}, "Could not save the task.")).toBe("Could not save the task.");
  });

  it("does not throw on a non-Error throw value", () => {
    // catch blocks previously did err.message on whatever was thrown.
    expect(() => friendlyError("just a string")).not.toThrow();
    expect(() => friendlyError(42)).not.toThrow();
  });
});
