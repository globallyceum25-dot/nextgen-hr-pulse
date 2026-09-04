import { describe, it, expect } from "vitest";
import { buildRecurrenceSchedule } from "./recurrence";

/**
 * A wrong schedule creates real tasks on real deadlines, so an off-by-one here
 * is visible to staff as work that appears on the wrong day.
 */

describe("buildRecurrenceSchedule — when nothing should recur", () => {
  it("returns nothing for 'none'", () => {
    expect(buildRecurrenceSchedule("2026-09-01", "2026-09-05", "none", 5)).toEqual([]);
  });

  it("returns nothing for a zero or missing count", () => {
    expect(buildRecurrenceSchedule("2026-09-01", "2026-09-05", "weekly", 0)).toEqual([]);
    expect(buildRecurrenceSchedule("2026-09-01", "2026-09-05", "weekly", null)).toEqual([]);
  });

  it("returns nothing for a missing recurrence", () => {
    expect(buildRecurrenceSchedule("2026-09-01", "2026-09-05", null, 5)).toEqual([]);
  });

  it("ignores a negative count rather than throwing", () => {
    expect(buildRecurrenceSchedule("2026-09-01", "2026-09-05", "daily", -3)).toEqual([]);
  });
});

describe("buildRecurrenceSchedule — cadence", () => {
  it("steps one day at a time", () => {
    const s = buildRecurrenceSchedule("2026-09-01", "2026-09-03", "daily", 3);
    expect(s).toEqual([
      { start_date: "2026-09-02", due_date: "2026-09-04" },
      { start_date: "2026-09-03", due_date: "2026-09-05" },
      { start_date: "2026-09-04", due_date: "2026-09-06" },
    ]);
  });

  it("steps seven days at a time", () => {
    const s = buildRecurrenceSchedule("2026-09-01", "2026-09-05", "weekly", 2);
    expect(s).toEqual([
      { start_date: "2026-09-08", due_date: "2026-09-12" },
      { start_date: "2026-09-15", due_date: "2026-09-19" },
    ]);
  });

  it("steps one month at a time", () => {
    const s = buildRecurrenceSchedule("2026-01-15", "2026-01-20", "monthly", 3);
    expect(s.map(o => o.due_date)).toEqual(["2026-02-20", "2026-03-20", "2026-04-20"]);
  });

  it("produces exactly the requested number of occurrences", () => {
    expect(buildRecurrenceSchedule("2026-09-01", "2026-09-01", "weekly", 52)).toHaveLength(52);
  });

  it("excludes the original task — occurrence 1 is the first repeat", () => {
    const s = buildRecurrenceSchedule("2026-09-01", "2026-09-01", "daily", 1);
    expect(s[0].start_date).toBe("2026-09-02");
  });
});

describe("buildRecurrenceSchedule — month-end handling", () => {
  it("clamps 31 Jan to the last day of February rather than overflowing", () => {
    // Plain JS rolls 31 Jan + 1 month to 3 Mar. A monthly task due on the 31st
    // should land on the last day of a shorter month.
    const s = buildRecurrenceSchedule("2026-01-31", "2026-01-31", "monthly", 1);
    expect(s[0].due_date).toBe("2026-02-28");
  });

  it("uses 29 February in a leap year", () => {
    const s = buildRecurrenceSchedule("2028-01-31", "2028-01-31", "monthly", 1);
    expect(s[0].due_date).toBe("2028-02-29");
  });

  it("does not let a clamped month shorten every later occurrence", () => {
    // Each occurrence is derived from the original date, so March is still 31.
    const s = buildRecurrenceSchedule("2026-01-31", "2026-01-31", "monthly", 2);
    expect(s.map(o => o.due_date)).toEqual(["2026-02-28", "2026-03-31"]);
  });

  it("crosses a year boundary", () => {
    const s = buildRecurrenceSchedule("2026-12-15", "2026-12-15", "monthly", 2);
    expect(s.map(o => o.due_date)).toEqual(["2027-01-15", "2027-02-15"]);
  });
});

describe("buildRecurrenceSchedule — timezone safety", () => {
  it("never shifts a date by a day", () => {
    // The previous implementation parsed as UTC then mutated with local-time
    // setters before formatting via toISOString(), which could land a day early
    // for users behind UTC. Dates in must equal dates out.
    const s = buildRecurrenceSchedule("2026-09-01", "2026-09-01", "daily", 1);
    expect(s[0].start_date).toBe("2026-09-02");
    expect(s[0].due_date).toBe("2026-09-02");
  });

  it("returns bare YYYY-MM-DD strings with no time component", () => {
    const s = buildRecurrenceSchedule("2026-09-01", "2026-09-05", "weekly", 1);
    expect(s[0].start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s[0].due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildRecurrenceSchedule — missing dates", () => {
  it("falls back to the supplied 'today' when no dates are given", () => {
    const today = new Date("2026-09-10T12:00:00Z");
    const s = buildRecurrenceSchedule(null, null, "daily", 2, today);
    expect(s).toEqual([
      { start_date: "2026-09-11", due_date: "2026-09-11" },
      { start_date: "2026-09-12", due_date: "2026-09-12" },
    ]);
  });

  it("handles a due date with no start date", () => {
    const today = new Date("2026-09-10T12:00:00Z");
    const s = buildRecurrenceSchedule(null, "2026-09-20", "weekly", 1, today);
    expect(s[0].start_date).toBe("2026-09-17");
    expect(s[0].due_date).toBe("2026-09-27");
  });
});
