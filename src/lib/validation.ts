/**
 * Small validation helpers shared by the create *and* edit paths.
 *
 * The create handlers each had a presence check; the edit handlers had none at
 * all. Clearing a name and saving wrote an empty string, after which the record
 * rendered as a blank row, could not be found by search, and appeared as an
 * empty <option> in every dependent dropdown — with no way back to fix it.
 *
 * These return an error message or null, so a caller reads as:
 *
 *   const err = requireText(form.title, "Title");
 *   if (err) return toast({ title: "Validation Error", description: err, ... });
 */

/** Longest accepted free-text value. Nothing enforced a limit before, so a
 *  pasted 10,000-character name reached the database and then blew out the
 *  layout of every dropdown listing it. */
export const MAX_TEXT_LENGTH = 200;

/** Require a non-blank value, rejecting whitespace-only input. */
export function requireText(
  value: string | null | undefined,
  label: string,
  maxLength: number = MAX_TEXT_LENGTH,
): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > maxLength) return `${label} must be ${maxLength} characters or fewer.`;
  return null;
}

/** Reject a due date that falls before the start date. */
export function requireDateOrder(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
  startLabel = "start date",
  dueLabel = "Due date",
): string | null {
  if (!startDate || !dueDate) return null;
  if (dueDate < startDate) return `${dueLabel} cannot be before the ${startLabel}.`;
  return null;
}

/**
 * Permissive email shape check — enough to catch "n/a", "-" and phone numbers
 * arriving from a spreadsheet column, without rejecting unusual but valid
 * addresses. Email is the key the app matches users on, so junk in this column
 * silently breaks identity resolution.
 */
export function isValidEmail(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** Validate an optional email field: blank is allowed, malformed is not. */
export function optionalEmail(value: string | null | undefined, label = "Email"): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  return isValidEmail(v) ? null : `${label} does not look like a valid email address.`;
}

/** Normalised key for comparing names — case- and whitespace-insensitive. */
const nameKey = (s: string | null | undefined): string =>
  (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Find an existing record with the same name, ignoring case and spacing.
 *
 * @param excludeId the record being edited, so renaming it to its own name is
 *                  not reported as a duplicate.
 */
export function findDuplicateName<T extends { id?: string }>(
  items: T[],
  getName: (item: T) => string | null | undefined,
  candidate: string,
  excludeId?: string,
): T | null {
  const key = nameKey(candidate);
  if (!key) return null;
  return items.find(i => i.id !== excludeId && nameKey(getName(i)) === key) ?? null;
}

/** Return the first non-null message from a list of checks. */
export function firstError(...results: Array<string | null>): string | null {
  return results.find(r => r !== null) ?? null;
}
