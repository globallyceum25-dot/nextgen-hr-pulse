/**
 * Build the PostgREST `.or()` filter for the task search box.
 *
 * The search term used to be interpolated straight into the filter string:
 *
 *   query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
 *
 * PostgREST parses `,` as the separator between OR terms and `()` as grouping,
 * so typing something as ordinary as "Colombo, HR" produced malformed terms and
 * a 400. Because the Tasks page surfaces query errors, the entire list was then
 * replaced by an error state — a comma made every task disappear.
 */

/** Characters PostgREST treats as syntax inside a filter expression. */
const POSTGREST_SYNTAX = /[,()".:]/g;

/** `%` and `_` are LIKE wildcards; a literal one must be escaped. */
const LIKE_WILDCARDS = /[%_\\]/g;

/**
 * Make a user-typed term safe to embed in an `ilike` filter.
 *
 * Syntax characters are replaced with a space rather than removed, so
 * "Colombo,HR" still matches "Colombo HR" instead of collapsing to "ColomboHR".
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(LIKE_WILDCARDS, "\\$&")
    .replace(POSTGREST_SYNTAX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The `.or()` argument matching a task's title or description.
 *
 * @returns null when there is nothing to search for, so the caller can skip the
 *          filter entirely rather than sending an empty pattern.
 */
export function buildTaskSearchFilter(term: string | null | undefined): string | null {
  if (!term) return null;
  const safe = sanitizeSearchTerm(term);
  if (!safe) return null;
  return `title.ilike.%${safe}%,description.ilike.%${safe}%`;
}
