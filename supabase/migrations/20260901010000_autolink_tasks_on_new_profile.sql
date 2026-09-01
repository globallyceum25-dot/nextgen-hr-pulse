-- Auto-link existing tasks when a user account is created.
--
-- WHY
-- Accounts are being created gradually, so tasks are often assigned by name long
-- before that person has a login. The 20260901000000 backfill links whatever exists
-- at the moment it runs; without this trigger, every new account would need that
-- migration re-run by hand before their tasks appeared in "My Tasks".
--
-- WHAT
-- When a profile row is created (or its name/email is filled in), claim any task or
-- sub-task whose assignee_name matches that person and still has assignee_id NULL.
-- Matching is by display name or email, normalised. Rows already linked are never
-- touched, so this cannot reassign someone else's work.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.link_tasks_to_new_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  name_key  text := public.norm_person_name(NEW.full_name);
  email_key text := public.norm_person_name(NEW.email);
  emp_key   text;
BEGIN
  -- The Employee Master name for this email, when there is one. Covers tasks assigned
  -- using the HR-record name while the profile still shows a different value.
  SELECT public.norm_person_name(e.employee_name || ' ' || coalesce(e.last_name, ''))
  INTO emp_key
  FROM public.employees e
  WHERE NEW.email IS NOT NULL AND lower(e.email) = lower(NEW.email)
  LIMIT 1;

  -- Ignore a name that is really an email placeholder (handle_new_user seeds it that way).
  IF name_key = '' OR NEW.full_name LIKE '%@%' THEN
    name_key := NULL;
  END IF;

  UPDATE public.tasks t
  SET assignee_id = NEW.user_id
  WHERE t.assignee_id IS NULL
    AND public.norm_person_name(t.assignee_name) IN (
      coalesce(name_key, '\x00'), coalesce(email_key, '\x00'), coalesce(emp_key, '\x00')
    );

  UPDATE public.sub_tasks s
  SET assignee_id = NEW.user_id
  WHERE s.assignee_id IS NULL
    AND public.norm_person_name(s.assignee_name) IN (
      coalesce(name_key, '\x00'), coalesce(email_key, '\x00'), coalesce(emp_key, '\x00')
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_link_tasks ON public.profiles;
CREATE TRIGGER trg_profiles_link_tasks
  AFTER INSERT OR UPDATE OF full_name, email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_tasks_to_new_profile();
