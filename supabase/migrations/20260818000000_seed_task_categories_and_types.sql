-- Seed the task master-data tables.
--
-- task_categories and task_types are read-only in the app: useTaskMasterData.ts
-- only ever SELECTs them (filtered to is_active = true), and no admin screen can
-- create rows. The earlier migrations create both tables but never populate them,
-- so on a freshly provisioned project the Category and Type dropdowns on the task
-- form are permanently empty with no in-app way to fix it.
--
-- The values below are the ones the frontend already assumed: they mirror the
-- TASK_CATEGORIES and TASK_TYPES constants in src/data/mockData.ts.
--
-- name is UNIQUE on both tables, so ON CONFLICT DO NOTHING makes this safe to
-- replay and safe to apply to a project that already has these rows.

INSERT INTO public.task_categories (name, description) VALUES
  ('Daily',   'Recurring task performed every working day'),
  ('Weekly',  'Recurring task performed once per week'),
  ('Monthly', 'Recurring task performed once per month')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.task_types (name, description) VALUES
  ('Process', 'Operational process or procedure'),
  ('Letter',  'Correspondence or formal letter')
ON CONFLICT (name) DO NOTHING;
