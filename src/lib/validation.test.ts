import { describe, it, expect } from "vitest";
import {
  requireText,
  requireDateOrder,
  isValidEmail,
  optionalEmail,
  findDuplicateName,
  firstError,
  MAX_TEXT_LENGTH,
} from "./validation";

/**
 * The create handlers validated; the edit handlers did not. Clearing a name and
 * saving wrote "", after which the record was a blank row that could not be
 * found by search and appeared as an empty <option> in dependent dropdowns.
 */

describe("requireText", () => {
  it("accepts a normal value", () => {
    expect(requireText("Prepare report", "Title")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(requireText("", "Title")).toBe("Title is required.");
  });

  it("rejects whitespace only — the blank-title case", () => {
    expect(requireText("   ", "Title")).toBe("Title is required.");
  });

  it("rejects null and undefined", () => {
    expect(requireText(null, "Title")).toBe("Title is required.");
    expect(requireText(undefined, "Title")).toBe("Title is required.");
  });

  it("names the field in the message", () => {
    expect(requireText("", "Company name")).toBe("Company name is required.");
  });

  it("rejects a value over the length limit", () => {
    const long = "x".repeat(MAX_TEXT_LENGTH + 1);
    expect(requireText(long, "Title")).toMatch(/200 characters or fewer/);
  });

  it("accepts a value exactly at the limit", () => {
    expect(requireText("x".repeat(MAX_TEXT_LENGTH), "Title")).toBeNull();
  });

  it("honours a custom limit", () => {
    expect(requireText("abcdef", "Code", 3)).toMatch(/3 characters or fewer/);
  });
});

describe("requireDateOrder", () => {
  it("accepts a due date after the start date", () => {
    expect(requireDateOrder("2026-09-01", "2026-09-10")).toBeNull();
  });

  it("accepts the same day", () => {
    expect(requireDateOrder("2026-09-01", "2026-09-01")).toBeNull();
  });

  it("rejects a due date before the start date", () => {
    // Saving this made the task instantly "overdue" and skewed the Analytics counts.
    expect(requireDateOrder("2026-09-10", "2026-09-01")).toMatch(/cannot be before/);
  });

  it("skips the check when either date is missing", () => {
    expect(requireDateOrder(null, "2026-09-01")).toBeNull();
    expect(requireDateOrder("2026-09-01", null)).toBeNull();
    expect(requireDateOrder(null, null)).toBeNull();
  });
});

describe("isValidEmail / optionalEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("imasha@corp.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.co.uk")).toBe(true);
  });

  it("rejects the junk that arrives in spreadsheet columns", () => {
    // These reached employees.email verbatim and broke identity resolution.
    for (const junk of ["n/a", "-", "0771234567", "none", "imasha", "@corp.com", "a@b"]) {
      expect(isValidEmail(junk)).toBe(false);
    }
  });

  it("rejects blank and whitespace", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it("optionalEmail allows blank but not malformed", () => {
    expect(optionalEmail("")).toBeNull();
    expect(optionalEmail(null)).toBeNull();
    expect(optionalEmail("n/a")).toMatch(/valid email/);
    expect(optionalEmail("imasha@corp.com")).toBeNull();
  });
});

describe("findDuplicateName", () => {
  const items = [
    { id: "1", name: "NextGen Human Capital Solutions" },
    { id: "2", name: "Lyceum Global Holdings" },
  ];

  it("finds an exact match", () => {
    expect(findDuplicateName(items, i => i.name, "Lyceum Global Holdings")?.id).toBe("2");
  });

  it("ignores case", () => {
    expect(findDuplicateName(items, i => i.name, "lyceum global holdings")?.id).toBe("2");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(findDuplicateName(items, i => i.name, "  Lyceum   Global Holdings ")?.id).toBe("2");
  });

  it("returns null when there is no match", () => {
    expect(findDuplicateName(items, i => i.name, "Heracle Holdings")).toBeNull();
  });

  it("does not flag the record being edited against itself", () => {
    // Renaming "Lyceum Global Holdings" while keeping the same name must be allowed.
    expect(findDuplicateName(items, i => i.name, "Lyceum Global Holdings", "2")).toBeNull();
  });

  it("still flags a clash with a different record while editing", () => {
    expect(findDuplicateName(items, i => i.name, "Lyceum Global Holdings", "1")?.id).toBe("2");
  });

  it("returns null for a blank candidate", () => {
    expect(findDuplicateName(items, i => i.name, "   ")).toBeNull();
  });
});

describe("firstError", () => {
  it("returns the first problem so one message is shown at a time", () => {
    expect(firstError(null, "Title is required.", "Due date is required."))
      .toBe("Title is required.");
  });

  it("returns null when everything passes", () => {
    expect(firstError(null, null)).toBeNull();
  });
});
