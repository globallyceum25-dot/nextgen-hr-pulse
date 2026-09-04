import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getWeightFromPriority,
  getStatusFromProgress,
  getProgressFromStatus,
  getDeadlineInfo,
  PRIORITIES,
  type TaskWorkflowStatus,
} from "./tasks";

/**
 * These helpers feed the KPI figures shown on the dashboard and exported in
 * reports, so a silent change here misstates performance data.
 */

afterEach(() => vi.useRealTimers());

describe("getWeightFromPriority", () => {
  it("maps each priority to its weight", () => {
    expect(getWeightFromPriority("High")).toBe(1);
    expect(getWeightFromPriority("Medium")).toBe(0.6);
    expect(getWeightFromPriority("Low")).toBe(0.2);
  });

  it("returns a weight for every priority the UI can offer", () => {
    for (const p of PRIORITIES) {
      expect(getWeightFromPriority(p)).toBeGreaterThan(0);
    }
  });

  it("falls back to the Medium weight for an unknown value", () => {
    expect(getWeightFromPriority("Critical" as never)).toBe(0.6);
  });
});

describe("getProgressFromStatus", () => {
  it("maps the main workflow statuses", () => {
    expect(getProgressFromStatus("Created")).toBe(0);
    expect(getProgressFromStatus("In Progress")).toBe(50);
    expect(getProgressFromStatus("Under Review")).toBe(80);
    expect(getProgressFromStatus("Completed")).toBe(100);
    expect(getProgressFromStatus("Closed")).toBe(100);
  });

  it("treats paused and cancelled work as no progress", () => {
    expect(getProgressFromStatus("On Hold")).toBe(0);
    expect(getProgressFromStatus("Cancelled")).toBe(0);
  });

  it("never returns a value outside 0–100", () => {
    const statuses: TaskWorkflowStatus[] = [
      "Created", "Assigned", "Pending", "In Progress", "Under Review",
      "On Hold", "Cancelled", "Completed", "Closed", "Overdue",
    ];
    for (const s of statuses) {
      const p = getProgressFromStatus(s);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("getStatusFromProgress", () => {
  it("maps progress back to a status", () => {
    expect(getStatusFromProgress(100)).toBe("Completed");
    expect(getStatusFromProgress(80)).toBe("Under Review");
    expect(getStatusFromProgress(50)).toBe("In Progress");
    expect(getStatusFromProgress(10)).toBe("Assigned");
    expect(getStatusFromProgress(0)).toBe("Created");
  });

  it("handles the boundaries consistently", () => {
    expect(getStatusFromProgress(99)).toBe("Under Review");
    expect(getStatusFromProgress(79)).toBe("In Progress");
    expect(getStatusFromProgress(101)).toBe("Completed");
  });
});

describe("getDeadlineInfo", () => {
  /** Freeze "now" so these assertions do not drift with the calendar. */
  const freeze = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  it("reports a task due today as due today, not overdue", () => {
    // Regression guard: comparing a bare YYYY-MM-DD (parsed as UTC midnight)
    // against a local `now` made same-day tasks look overdue west of UTC.
    freeze("2026-09-10T14:00:00");
    const info = getDeadlineInfo("2026-09-10", "In Progress");
    expect(info.isOverdue).toBe(false);
    expect(info.remainingDays).toBe(0);
    expect(info.label).toBe("Due today");
  });

  it("counts a past due date as overdue", () => {
    freeze("2026-09-10T09:00:00");
    const info = getDeadlineInfo("2026-09-08", "In Progress");
    expect(info.isOverdue).toBe(true);
    expect(info.remainingDays).toBe(-2);
    expect(info.label).toBe("Overdue by 2 days");
  });

  it("uses the singular for one day overdue", () => {
    freeze("2026-09-10T09:00:00");
    expect(getDeadlineInfo("2026-09-09", "In Progress").label).toBe("Overdue by 1 day");
  });

  it("flags work due within a week", () => {
    freeze("2026-09-10T09:00:00");
    const info = getDeadlineInfo("2026-09-13", "In Progress");
    expect(info.isDueSoon).toBe(true);
    expect(info.showAlert).toBe(true);
    expect(info.remainingDays).toBe(3);
  });

  it("does not alert for work far in the future", () => {
    freeze("2026-09-10T09:00:00");
    const info = getDeadlineInfo("2026-12-01", "In Progress");
    expect(info.isDueSoon).toBe(false);
    expect(info.showAlert).toBe(false);
  });

  it("never flags finished work, even when the date has passed", () => {
    freeze("2026-09-10T09:00:00");
    for (const status of ["Completed", "Closed", "Cancelled"] as TaskWorkflowStatus[]) {
      const info = getDeadlineInfo("2026-01-01", status);
      expect(info.isOverdue).toBe(false);
      expect(info.showAlert).toBe(false);
    }
  });

  it("handles a missing due date without throwing", () => {
    expect(() => getDeadlineInfo(null, "In Progress")).not.toThrow();
    expect(getDeadlineInfo(null, "In Progress").showAlert).toBe(false);
  });
});
