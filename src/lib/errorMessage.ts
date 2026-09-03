/**
 * Turn a Supabase/Postgres error into something an HR user can act on.
 *
 * Raw PostgREST errors were being surfaced verbatim in toasts, e.g.
 *   "new row violates row-level security policy for table \"tasks\""
 *   "duplicate key value violates unique constraint \"employees_email_key\""
 *   "Cannot coerce the result to a single JSON object"
 * These leak table and constraint names and tell the user nothing useful.
 *
 * The raw error is still logged to the console for support.
 */

interface PostgrestLike {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

const CODE_MESSAGES: Record<string, string> = {
  // insufficient_privilege — our RLS policies and field-permission triggers
  "42501": "You do not have permission to do that.",
  // unique_violation
  "23505": "That record already exists.",
  // foreign_key_violation
  "23503": "That change references something that no longer exists. Please refresh and try again.",
  // not_null_violation
  "23502": "A required field is missing.",
  // check_violation
  "23514": "One of the values entered is not allowed.",
  // PostgREST: .single() matched zero rows — almost always RLS hiding the row
  PGRST116: "You do not have permission to view or change this record.",
  // PostgREST: JWT expired / invalid
  PGRST301: "Your session has expired. Please sign in again.",
};

/** Patterns for errors that carry no useful code. */
const PATTERN_MESSAGES: Array<[RegExp, string]> = [
  [/row-level security/i, "You do not have permission to do that."],
  [/cannot coerce the result/i, "You do not have permission to view or change this record."],
  [/duplicate key value/i, "That record already exists."],
  [/violates foreign key/i, "That change references something that no longer exists."],
  [/jwt|token is expired|invalid claim/i, "Your session has expired. Please sign in again."],
  [/failed to fetch|networkerror|load failed/i, "Could not reach the server. Check your connection and try again."],
];

/**
 * @param err     the thrown value
 * @param fallback message shown when nothing more specific is known
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err) console.error("Supabase/API error:", err);

  if (!err) return fallback;

  // Our own thrown Errors already carry a human message — trust them, unless
  // they are a raw database string that slipped through.
  const e = err as PostgrestLike & { name?: string };
  const raw = typeof e.message === "string" ? e.message : "";

  if (e.code && CODE_MESSAGES[e.code]) return CODE_MESSAGES[e.code];

  for (const [pattern, message] of PATTERN_MESSAGES) {
    if (pattern.test(raw)) return message;
  }

  // A deliberate, human-written message (no SQL jargon) is safe to show as-is.
  if (raw && !/violates|constraint|relation |column |pgrst|postgres/i.test(raw)) {
    return raw;
  }

  return fallback;
}
