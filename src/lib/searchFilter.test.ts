import { describe, it, expect } from "vitest";
import { buildTaskSearchFilter, sanitizeSearchTerm } from "./searchFilter";

/**
 * Regression guard for the bug where typing a comma emptied the task list:
 * the raw term was interpolated into a PostgREST `.or()`, where `,` separates
 * terms, so "Colombo, HR" produced malformed syntax and a 400.
 */

describe("sanitizeSearchTerm — PostgREST syntax", () => {
  it("neutralises a comma", () => {
    expect(sanitizeSearchTerm("Colombo, HR")).toBe("Colombo HR");
  });

  it("neutralises parentheses", () => {
    expect(sanitizeSearchTerm("Report (Q1)")).toBe("Report Q1");
  });

  it("neutralises quotes, colons and periods", () => {
    expect(sanitizeSearchTerm('say "hi": now.')).toBe("say hi now");
  });

  it("replaces syntax with a space rather than deleting it", () => {
    // "Colombo,HR" must not collapse to "ColomboHR", which would match nothing.
    expect(sanitizeSearchTerm("Colombo,HR")).toBe("Colombo HR");
  });

  it("collapses the whitespace it introduces", () => {
    expect(sanitizeSearchTerm("a,,,b")).toBe("a b");
  });
});

describe("sanitizeSearchTerm — LIKE wildcards", () => {
  it("escapes a literal percent so it is not a wildcard", () => {
    expect(sanitizeSearchTerm("100%")).toBe("100\\%");
  });

  it("escapes a literal underscore", () => {
    expect(sanitizeSearchTerm("first_name")).toBe("first\\_name");
  });

  it("escapes a backslash", () => {
    expect(sanitizeSearchTerm("a\\b")).toBe("a\\\\b");
  });
});

describe("buildTaskSearchFilter", () => {
  it("searches both title and description", () => {
    expect(buildTaskSearchFilter("report"))
      .toBe("title.ilike.%report%,description.ilike.%report%");
  });

  it("produces exactly two terms separated by one comma", () => {
    const filter = buildTaskSearchFilter("Colombo, HR")!;
    // The only comma may be the separator PostgREST expects.
    expect(filter.split(",")).toHaveLength(2);
    expect(filter).toBe("title.ilike.%Colombo HR%,description.ilike.%Colombo HR%");
  });

  it("returns null for an empty term so the filter is skipped", () => {
    expect(buildTaskSearchFilter("")).toBeNull();
    expect(buildTaskSearchFilter(null)).toBeNull();
    expect(buildTaskSearchFilter(undefined)).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(buildTaskSearchFilter("   ")).toBeNull();
  });

  it("returns null when the term is entirely syntax characters", () => {
    // ",,," would otherwise become an empty pattern matching everything.
    expect(buildTaskSearchFilter(",,,")).toBeNull();
    expect(buildTaskSearchFilter("()")).toBeNull();
  });

  it("never emits an unescaped PostgREST grouping character", () => {
    const filter = buildTaskSearchFilter('Smith, John (HR): "lead"')!;
    expect(filter).not.toContain("(");
    expect(filter).not.toContain(")");
    expect(filter).not.toContain('"');
    expect(filter.split(",")).toHaveLength(2);
  });
});
