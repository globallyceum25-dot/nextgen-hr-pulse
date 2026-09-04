/**
 * KPI derivation for tasks.
 *
 * These figures are written back to the database and then reported on the
 * dashboard and in exports, so getting them wrong silently misstates
 * performance data. Two bugs lived in the four inline copies this replaces:
 *
 *  1. The metadata read discarded its `error`. If the row could not be read —
 *     RLS, a deleted task, a dropped connection — the code substituted
 *     defaults and *wrote the derived values anyway*, permanently recording a
 *     wrong KPI with no error shown anywhere.
 *
 *  2. `kpi_target_percent || 100` and `task_weight || 0.6` also fire on a
 *     legitimate stored 0, so a task deliberately set to a 0% target was
 *     rewritten as though its target were 100%.
 */

export interface TaskKpiTargets {
  kpiTarget: number;
  taskWeight: number;
}

/** Shape of the metadata row, as selected from public.tasks. */
export interface TaskKpiRow {
  kpi_target_percent?: number | string | null;
  task_weight?: number | string | null;
}

export const DEFAULT_KPI_TARGET = 100;
export const DEFAULT_TASK_WEIGHT = 0.6;

/**
 * Resolve a task's KPI targets, refusing to guess when the row is missing.
 *
 * @throws when the row could not be read — the caller must abort rather than
 *         write a derived value based on assumed targets.
 */
export function resolveKpiTargets(row: TaskKpiRow | null | undefined): TaskKpiTargets {
  if (!row) {
    throw new Error(
      "Could not read this task's KPI settings, so its score was not updated. Please refresh and try again.",
    );
  }
  // `??` not `||`: a stored 0 is a real value, not a missing one.
  const kpiTarget = Number(row.kpi_target_percent ?? DEFAULT_KPI_TARGET);
  const taskWeight = Number(row.task_weight ?? DEFAULT_TASK_WEIGHT);

  return {
    kpiTarget: Number.isFinite(kpiTarget) ? kpiTarget : DEFAULT_KPI_TARGET,
    taskWeight: Number.isFinite(taskWeight) ? taskWeight : DEFAULT_TASK_WEIGHT,
  };
}

/** Derive the stored KPI figures from progress and the task's targets. */
export function deriveKpi(progress: number, targets: TaskKpiTargets) {
  const { kpiTarget, taskWeight } = targets;

  const kpiAchievement = kpiTarget > 0
    ? Math.min(100, Math.round((progress / kpiTarget) * 10000) / 100)
    : 0;

  const weightedScore = Math.round(taskWeight * (progress / 100) * 10000) / 10000;

  return { kpiAchievement, weightedScore };
}
