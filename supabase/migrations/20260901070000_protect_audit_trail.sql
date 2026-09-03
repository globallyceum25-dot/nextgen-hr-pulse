-- SECURITY FIX: make the audit trail non-forgeable.
--
-- PROBLEM
--   public.task_activity_log
--     "Users can create activity logs"  WITH CHECK (auth.uid() = user_id)
--   Only the actor column was constrained. task_id, action, field_name,
--   old_value, new_value and description were all free-form, so any signed-in
--   user could POST /rest/v1/task_activity_log and inject fabricated history
--   onto ANY task -- including tasks they cannot see -- e.g. a row claiming a
--   manager approved something, or that a priority change they made was made
--   by somebody else.
--
--   public.rbac_audit_log
--     "rbac_audit_insert_self"  WITH CHECK (user_id = auth.uid() OR user_id IS NULL)
--   The `OR user_id IS NULL` branch allowed ANONYMOUS entries with arbitrary
--   action, module, record_id, old_value, new_value, ip_address and user_agent,
--   letting anyone poison the Access Control -> Audit Logs screen with
--   untraceable noise.
--
-- WHY REVOKING IS SAFE
--   Both tables are populated by SECURITY DEFINER triggers -- log_task_activity,
--   log_sub_task_update, log_task_comment, rbac_audit_trigger -- which run with
--   the definer's rights and are unaffected by RLS or by table grants. The only
--   client-side writers were two redundant inserts in useCreateTask and
--   useUpdateTask, which duplicated what trg_tasks_audit already records (and
--   recorded less: a generic "Task updated" with no field or old/new values).
--   Those have been removed in the same change.
--
--   Reads are untouched: task_activity_log stays stakeholder-scoped and
--   rbac_audit_log stays admin-only, so the Audit Logs and Task history screens
--   continue to work.
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1) task_activity_log — trigger-only writes
-- ============================================================
DROP POLICY IF EXISTS "Users can create activity logs"     ON public.task_activity_log;
DROP POLICY IF EXISTS "Users can insert activity logs"     ON public.task_activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity_log" ON public.task_activity_log;
DROP POLICY IF EXISTS "task_activity_log_insert_self"      ON public.task_activity_log;

REVOKE INSERT, UPDATE, DELETE ON public.task_activity_log FROM authenticated, anon;

-- ============================================================
-- 2) rbac_audit_log — trigger-only writes
-- ============================================================
DROP POLICY IF EXISTS "rbac_audit_insert_self" ON public.rbac_audit_log;

REVOKE INSERT, UPDATE, DELETE ON public.rbac_audit_log FROM authenticated, anon;

-- Note: a BEFORE INSERT guard trigger rejecting current_user IN
-- ('authenticated','anon') was considered as defence-in-depth against a future
-- migration accidentally re-granting INSERT. It was left out deliberately: if
-- the security context inside a SECURITY DEFINER trigger is not what we expect,
-- the guard would raise during audit logging and break task creation entirely.
-- Revoking the grants is the standard fix and is sufficient on its own --
-- SECURITY DEFINER functions insert as their owner, so the triggers are
-- unaffected by the revoke.
