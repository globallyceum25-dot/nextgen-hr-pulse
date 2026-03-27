
-- Update existing Critical priorities to High
UPDATE public.tasks SET priority = 'High' WHERE priority = 'Critical';
UPDATE public.sub_tasks SET priority = 'High' WHERE priority = 'Critical';

-- Drop defaults before changing type
ALTER TABLE public.tasks ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE public.sub_tasks ALTER COLUMN priority DROP DEFAULT;

-- Recreate enum without Critical
ALTER TYPE public.task_priority RENAME TO task_priority_old;
CREATE TYPE public.task_priority AS ENUM ('High', 'Medium', 'Low');

-- Update columns to use new enum
ALTER TABLE public.tasks ALTER COLUMN priority TYPE public.task_priority USING priority::text::public.task_priority;
ALTER TABLE public.sub_tasks ALTER COLUMN priority TYPE public.task_priority USING priority::text::public.task_priority;

-- Re-add defaults
ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'Medium'::task_priority;
ALTER TABLE public.sub_tasks ALTER COLUMN priority SET DEFAULT 'Medium'::task_priority;

-- Drop old enum
DROP TYPE public.task_priority_old;
