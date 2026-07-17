ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'group_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'location_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'data_entry_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_admin';