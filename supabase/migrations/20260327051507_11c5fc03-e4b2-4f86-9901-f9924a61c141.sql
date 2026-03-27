
-- =============================================
-- HR TASK MANAGEMENT PLATFORM - DATABASE SCHEMA
-- =============================================

-- 1. MASTER DATA: Task Categories
CREATE TABLE public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view task_categories" ON public.task_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage task_categories" ON public.task_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 2. MASTER DATA: Task Types
CREATE TABLE public.task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view task_types" ON public.task_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage task_types" ON public.task_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 3. MASTER DATA: Sectors table
CREATE TABLE public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sectors" ON public.sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sectors" ON public.sectors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 4. Task Status enum for workflow
CREATE TYPE public.task_workflow_status AS ENUM (
  'Created', 'Assigned', 'In Progress', 'Pending', 'Under Review',
  'Completed', 'Closed', 'On Hold', 'Cancelled', 'Overdue'
);

-- 5. Priority enum (add Critical)
CREATE TYPE public.task_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');

-- 6. Recurrence type
CREATE TYPE public.recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'custom');

-- 7. MAIN TASKS TABLE
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number serial,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.task_categories(id),
  type_id uuid REFERENCES public.task_types(id),
  assignee_id uuid,
  assigned_by uuid,
  department_id uuid REFERENCES public.departments(id),
  sector_id uuid REFERENCES public.sectors(id),
  company_id uuid REFERENCES public.companies(id),
  location_id uuid REFERENCES public.locations(id),
  priority public.task_priority NOT NULL DEFAULT 'Medium',
  status public.task_workflow_status NOT NULL DEFAULT 'Created',
  start_date date,
  due_date date,
  completed_date date,
  progress numeric(5,2) NOT NULL DEFAULT 0,
  kpi_target_percent numeric(5,2) NOT NULL DEFAULT 100,
  kpi_achievement numeric(5,2) NOT NULL DEFAULT 0,
  task_weight numeric(4,2) NOT NULL DEFAULT 0.6,
  weighted_score numeric(6,4) NOT NULL DEFAULT 0,
  remarks text,
  escalation_person_id uuid,
  recurrence public.recurrence_type NOT NULL DEFAULT 'none',
  recurrence_count int DEFAULT 0,
  parent_recurring_id uuid REFERENCES public.tasks(id),
  related_module text,
  sla_frequency text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 8. SUB-TASKS TABLE
CREATE TABLE public.sub_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  status public.task_workflow_status NOT NULL DEFAULT 'Created',
  progress numeric(5,2) NOT NULL DEFAULT 0,
  priority public.task_priority NOT NULL DEFAULT 'Medium',
  task_weight numeric(4,2) NOT NULL DEFAULT 0.6,
  weighted_score numeric(6,4) NOT NULL DEFAULT 0,
  assignee_id uuid,
  due_date date,
  completed_date date,
  remarks text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sub_tasks" ON public.sub_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sub_tasks" ON public.sub_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sub_tasks" ON public.sub_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete sub_tasks" ON public.sub_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'sector_hr_admin'));

-- 9. TASK COMMENTS
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view comments" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.task_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. TASK ACTIVITY LOG
CREATE TABLE public.task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view activity_log" ON public.task_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activity_log" ON public.task_activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- 11. NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 12. INDEXES for performance
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_department ON public.tasks(department_id);
CREATE INDEX idx_tasks_sector ON public.tasks(sector_id);
CREATE INDEX idx_tasks_company ON public.tasks(company_id);
CREATE INDEX idx_sub_tasks_task_id ON public.sub_tasks(task_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_activity_log_task_id ON public.task_activity_log(task_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- 13. TRIGGERS for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sub_tasks_updated_at BEFORE UPDATE ON public.sub_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_categories_updated_at BEFORE UPDATE ON public.task_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_types_updated_at BEFORE UPDATE ON public.task_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Enable realtime for tasks and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
