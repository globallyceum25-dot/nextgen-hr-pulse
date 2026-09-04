import { describe, it, expect } from "vitest";
import {
  resolveKpiTargets,
  deriveKpi,
  DEFAULT_KPI_TARGET,
  DEFAULT_TASK_WEIGHT,
} from "./taskKpi";

/**
 * These values are written back to public.tasks and then reported on the
 * dashboard and in exports, so a regression here silently misstates
 * performance data rather than throwing.
 */

describe("resolveKpiTargets — refuses to guess", () => {
  it("throws when the task row could not be read", () => {
    // The bug this replaces: the metadata read discarded its error, defaulted
    // to 100 / 0.6, and WROTE a derived score based on assumed targets.
    expect(() => resolveKpiTargets(null)).toThrow(/could not read/i);
    expect(() => resolveKpiTargets(undefined)).toThrow(/KPI settings/i);
  });

  it("reports that the score was not updated, so the user can retry", () => {
    expect(() => resolveKpiTargets(null)).toThrow(/not updated/i);
  });
});

describe("resolveKpiTargets — respects a stored zero", () => {
  it("keeps a 0% target instead of substituting 100", () => {
    // `|| 100` treated a deliberate 0 as missing and rewrote it as 100.
    const t = resolveKpiTargets({ kpi_target_percent: 0, task_weight: 0.6 });
    expect(t.kpiTarget).toBe(0);
  });

  it("keeps a 0 weight instead of substituting 0.6", () => {
    const t = resolveKpiTargets({ kpi_target_percent: 100, task_weight: 0 });
    expect(t.taskWeight).toBe(0);
  });

  it("falls back only when the value is genuinely null", () => {
    const t = resolveKpiTargets({ kpi_target_percent: null, task_weight: null });
    expect(t.kpiTarget).toBe(DEFAULT_KPI_TARGET);
    expect(t.taskWeight).toBe(DEFAULT_TASK_WEIGHT);
  });

  it("falls back when the field is absent", () => {
    const t = resolveKpiTargets({});
    expect(t.kpiTarget).toBe(DEFAULT_KPI_TARGET);
    expect(t.taskWeight).toBe(DEFAULT_TASK_WEIGHT);
  });

  it("coerces numeric strings, as Postgres numerics arrive over the wire", () => {
    const t = resolveKpiTargets({ kpi_target_percent: "80", task_weight: "1" });
    expect(t.kpiTarget).toBe(80);
    expect(t.taskWeight).toBe(1);
  });

  it("falls back rather than producing NaN from an unparseable value", () => {
    const t = resolveKpiTargets({ kpi_target_percent: "abc", task_weight: "xyz" });
    expect(t.kpiTarget).toBe(DEFAULT_KPI_TARGET);
    expect(t.taskWeight).toBe(DEFAULT_TASK_WEIGHT);
  });
});

describe("deriveKpi", () => {
  const standard = { kpiTarget: 100, taskWeight: 0.6 };

  it("reports achievement against the target", () => {
    expect(deriveKpi(50, standard).kpiAchievement).toBe(50);
    expect(deriveKpi(100, standard).kpiAchievement).toBe(100);
    expect(deriveKpi(0, standard).kpiAchievement).toBe(0);
  });

  it("scales achievement when the target is below 100", () => {
    // 40% progress against an 80% target is 50% achievement.
    expect(deriveKpi(40, { kpiTarget: 80, taskWeight: 0.6 }).kpiAchievement).toBe(50);
  });

  it("caps achievement at 100 when progress exceeds the target", () => {
    expect(deriveKpi(100, { kpiTarget: 50, taskWeight: 0.6 }).kpiAchievement).toBe(100);
  });

  it("returns 0 achievement for a 0 target instead of dividing by zero", () => {
    const r = deriveKpi(50, { kpiTarget: 0, taskWeight: 0.6 });
    expect(r.kpiAchievement).toBe(0);
    expect(Number.isFinite(r.kpiAchievement)).toBe(true);
  });

  it("weights the score by the task's priority weight", () => {
    expect(deriveKpi(100, { kpiTarget: 100, taskWeight: 1 }).weightedScore).toBe(1);
    expect(deriveKpi(100, { kpiTarget: 100, taskWeight: 0.6 }).weightedScore).toBe(0.6);
    expect(deriveKpi(50, { kpiTarget: 100, taskWeight: 0.6 }).weightedScore).toBe(0.3);
  });

  it("gives a zero weighted score for zero progress", () => {
    expect(deriveKpi(0, standard).weightedScore).toBe(0);
  });

  it("rounds to the precision the columns store", () => {
    // kpi_achievement is numeric(5,2); weighted_score is numeric(6,4).
    const r = deriveKpi(33.333, { kpiTarget: 100, taskWeight: 0.6 });
    expect(r.kpiAchievement).toBeCloseTo(33.33, 2);
    expect(r.weightedScore).toBeCloseTo(0.2, 4);
  });

  it("never returns NaN for any plausible input", () => {
    const cases = [
      [0, 0, 0], [100, 0, 0], [50, 100, 0.6], [0, 100, 1], [100, 100, 1],
    ] as const;
    for (const [progress, kpiTarget, taskWeight] of cases) {
      const r = deriveKpi(progress, { kpiTarget, taskWeight });
      expect(Number.isNaN(r.kpiAchievement)).toBe(false);
      expect(Number.isNaN(r.weightedScore)).toBe(false);
    }
  });
});
