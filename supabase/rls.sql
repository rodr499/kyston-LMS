-- Run this in Supabase SQL Editor after applying Drizzle migrations.
-- Enables RLS and adds tenant-scoped policies. Super admins (users with church_id IS NULL) bypass via service role or app-level checks.

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's church_id from auth.uid() -> users.church_id (in public schema; auth schema is not writable)
CREATE OR REPLACE FUNCTION public.user_church_id()
RETURNS uuid AS $$
  SELECT church_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Churches: users can read their own church
CREATE POLICY "Users read own church" ON churches
  FOR SELECT USING (id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Service role / app uses direct connection; RLS can be bypassed with service_role key for super admin operations.

-- Users: read same church or self; insert/update restricted (use app logic)
CREATE POLICY "Users read same church" ON users
  FOR SELECT USING (church_id = public.user_church_id() OR id = auth.uid() OR public.user_church_id() IS NULL);

-- Programs: church-scoped
CREATE POLICY "Programs church scoped" ON programs
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Courses: church-scoped
CREATE POLICY "Courses church scoped" ON courses
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Classes: church-scoped
CREATE POLICY "Classes church scoped" ON classes
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Enrollments: church-scoped
CREATE POLICY "Enrollments church scoped" ON enrollments
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Activities: church-scoped
CREATE POLICY "Activities church scoped" ON activities
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Activity completions: church-scoped
CREATE POLICY "Activity completions church scoped" ON activity_completions
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Church integrations: church-scoped
CREATE POLICY "Church integrations church scoped" ON church_integrations
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Attendance: church-scoped
CREATE POLICY "Attendance church scoped" ON attendance
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Allow anon to read churches for subdomain lookup (by subdomain only; app can restrict)
CREATE POLICY "Churches read by subdomain for tenant resolve" ON churches
  FOR SELECT USING (true);
