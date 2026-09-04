/**
 * Pure task/sub-task permission rules.
 *
 * These mirror the database triggers and RLS policies:
 *   - enforce_task_field_permissions()      (priority, due_date, assigned_by)
 *   - enforce_sub_task_field_permissions()  (sub-task priority, due_date)
 *   - the sub_tasks INSERT policy            (who may divide a task)
 *
 * The database is the security boundary; these exist so the UI does not offer
 * an action that the server will reject. They live here rather than inside the
 * Tasks page so they can be tested without mounting React or Supabase — this
 * logic changed repeatedly and each change risked a silent access regression.
 */

/** Case- and whitespace-insensitive name key. "Jane  Doe " === "jane doe". */
export const normName = (s?: string | null): string =>
  (s || "").trim().replace(/\s+/g, " ").toLowerCase();

/** Minimal shapes: only the fields these rules read. */
export interface TaskLike {
  assignee_id?: string | null;
  assignee_name?: string | null;
  assigned_by?: string | null;
  created_by?: string | null;
}

export interface SubTaskLike {
  assignee_id?: string | null;
  assignee_name?: string | null;
  created_by?: string | null;
}

export interface Viewer {
  userId: string | null;
  /** Resolved display name, used when a task is assigned by name only. */
  employeeName?: string | null;
  isAdmin: boolean;
  /** RBAC matrix lookups. */
  canEdit: boolean;
  canCreateSubTask: boolean;
}

/**
 * Only the person who assigned or created the task may change its priority.
 * A null task means "creating a new one", where the creator sets the initial value.
 */
export function canChangePriority(task: TaskLike | null, v: Viewer): boolean {
  if (!task) return true;
  if (v.isAdmin) return true;
  if (!v.userId) return false;
  return task.assigned_by === v.userId || task.created_by === v.userId;
}

/** Deadline follows the same rule as priority: assigner-only. */
export const canChangeDeadline = canChangePriority;

/**
 * A sub-task's "assigner" is its creator, or the parent task's assigner.
 * Governs its priority and deadline; status and remarks stay open to the assignee.
 */
export function canChangeSubTaskProtected(
  parent: TaskLike | null,
  subTask: SubTaskLike | null,
  v: Viewer,
): boolean {
  if (!subTask) return true;
  if (v.isAdmin) return true;
  if (!v.userId) return false;
  if (subTask.created_by === v.userId) return true;
  return !!parent && (parent.assigned_by === v.userId || parent.created_by === v.userId);
}

/** True when the viewer is the task's assignee, by id or by name. */
export function isAssigneeOf(task: TaskLike, v: Viewer): boolean {
  if (v.userId && task.assignee_id === v.userId) return true;
  const key = normName(v.employeeName);
  return !!key && normName(task.assignee_name) === key;
}

/**
 * Who may divide a task into sub-tasks: anyone holding create_subtask, or the
 * task's own assignee provided they also hold tasks:edit. Being the assignee is
 * not sufficient on its own, so a Viewer cannot create sub-tasks.
 */
export function canAddSubTaskTo(task: TaskLike | null, v: Viewer): boolean {
  if (!task) return false;
  if (v.isAdmin || v.canCreateSubTask) return true;
  if (!v.canEdit) return false;
  return isAssigneeOf(task, v);
}

/**
 * "My Tasks" membership: work assigned TO the viewer. Tasks they assigned to
 * someone else are deliberately excluded — those belong in the main list.
 */
export function isMyTask(
  task: TaskLike & { sub_tasks?: SubTaskLike[] | null },
  v: Viewer,
): boolean {
  if (isAssigneeOf(task, v)) return true;
  const key = normName(v.employeeName);
  return (task.sub_tasks || []).some(
    (st) =>
      (!!v.userId && st.assignee_id === v.userId) ||
      (!!key && normName(st.assignee_name) === key),
  );
}

/**
 * Resolve a person to a display name. Profiles are readable by every
 * authenticated user; the Employee Master is not, so the profile name is
 * preferred. Never returns an email — a missing mapping is surfaced instead so
 * it can be corrected in the Employee Master.
 */
export function displayPersonName(
  profile: { full_name?: string | null; email?: string | null } | null | undefined,
  employees: Array<{ email?: string | null; employee_name?: string | null; last_name?: string | null }>,
  fallbackEmail?: string | null,
): string {
  const fn = profile?.full_name?.trim();
  if (fn && !fn.includes("@")) return fn;

  const email = (profile?.email || fallbackEmail || "").toLowerCase();
  if (email) {
    const emp = employees.find((e) => e.email?.toLowerCase() === email);
    if (emp) {
      const full = `${emp.employee_name ?? ""}${emp.last_name ? " " + emp.last_name : ""}`.trim();
      if (full) return full;
    }
  }
  return "Unmapped User";
}
