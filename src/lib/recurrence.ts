import type { RecurrenceType } from "@/types/tasks";

/**
 * Date arithmetic for recurring tasks.
 *
 * Pulled out of useCreateTask so the schedule can be built once and inserted in
 * a single call, and so the arithmetic is testable. Two things it fixes:
 *
 *  - Timezone drift. The previous code did `new Date("2026-09-01")` (parsed as
 *    UTC midnight), mutated it with local-time setters, then formatted with
 *    toISOString(). For any user behind UTC that could land a day early.
 *    Everything here stays in UTC.
 *
 *  - Month-end overflow. JavaScript rolls 31 Jan + 1 month to 3 Mar. A monthly
 *    task due on the 31st should fall on the last day of the shorter month.
 */

export interface Occurrence {
  start_date: string | null;
  due_date: string | null;
}

/** Parse a YYYY-MM-DD date as UTC, avoiding local-timezone shifts. */
function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

const formatISODate = (d: Date): string => d.toISOString().split("T")[0];

/** Add whole months, clamping to the last valid day rather than overflowing. */
function addMonthsUTC(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();
  shifted.setUTCDate(Math.min(day, daysInTargetMonth));
  return shifted;
}

function shift(date: Date, recurrence: RecurrenceType, occurrence: number): Date {
  const next = new Date(date.getTime());
  switch (recurrence) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + occurrence);
      return next;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + occurrence * 7);
      return next;
    default:
      // monthly and custom both step by month, matching the original behaviour.
      return addMonthsUTC(next, occurrence);
  }
}

/**
 * Build the follow-up occurrences for a recurring task.
 *
 * Returns `count` entries — the original task is occurrence 0 and is not
 * included. Returns [] when the task does not recur.
 *
 * @param today used when the task has no start/due date; injectable for tests.
 */
export function buildRecurrenceSchedule(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
  recurrence: RecurrenceType | null | undefined,
  count: number | null | undefined,
  today: Date = new Date(),
): Occurrence[] {
  if (!recurrence || recurrence === "none") return [];
  const total = Math.max(0, Math.floor(count ?? 0));
  if (total === 0) return [];

  const fallback = parseISODate(formatISODate(today));
  const baseStart = startDate ? parseISODate(startDate) : fallback;
  const baseDue = dueDate ? parseISODate(dueDate) : fallback;

  return Array.from({ length: total }, (_, i) => {
    const occurrence = i + 1;
    return {
      start_date: formatISODate(shift(baseStart, recurrence, occurrence)),
      due_date: formatISODate(shift(baseDue, recurrence, occurrence)),
    };
  });
}
