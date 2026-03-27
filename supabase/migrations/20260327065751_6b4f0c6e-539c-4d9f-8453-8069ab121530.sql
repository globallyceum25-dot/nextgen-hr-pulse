-- Add assignee_name column to sub_tasks for storing assignee name directly
ALTER TABLE public.sub_tasks ADD COLUMN IF NOT EXISTS assignee_name text;