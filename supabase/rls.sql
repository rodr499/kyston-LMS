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
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's church_id from auth.uid() -> users.church_id (in public schema; auth schema is not writable)
CREATE OR REPLACE FUNCTION public.user_church_id()
RETURNS uuid AS $$
  SELECT church_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing policies so this script is idempotent (safe to re-run)
DROP POLICY IF EXISTS "Users read own church" ON churches;
DROP POLICY IF EXISTS "Churches read by subdomain for tenant resolve" ON churches;
DROP POLICY IF EXISTS "Users read same church" ON users;
DROP POLICY IF EXISTS "Programs church scoped" ON programs;
DROP POLICY IF EXISTS "Courses church scoped" ON courses;
DROP POLICY IF EXISTS "Classes church scoped" ON classes;
DROP POLICY IF EXISTS "Enrollments church scoped" ON enrollments;
DROP POLICY IF EXISTS "Activities church scoped" ON activities;
DROP POLICY IF EXISTS "Activity completions church scoped" ON activity_completions;
DROP POLICY IF EXISTS "Church integrations church scoped" ON church_integrations;
DROP POLICY IF EXISTS "Attendance church scoped" ON attendance;
DROP POLICY IF EXISTS "Platform settings super admin only" ON platform_settings;
DROP POLICY IF EXISTS "Plans read all" ON plans;
DROP POLICY IF EXISTS "Plans super admin write" ON plans;
DROP POLICY IF EXISTS "Church plan config church scoped" ON church_plan_config;
DROP POLICY IF EXISTS "Coupon codes super admin only" ON coupon_codes;
DROP POLICY IF EXISTS "Coupon redemptions church scoped" ON coupon_redemptions;
DROP POLICY IF EXISTS "Integration requests church scoped" ON integration_requests;
DROP POLICY IF EXISTS "Audit logs church scoped" ON audit_logs;

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

-- Platform settings: super admin only (app typically uses service role)
CREATE POLICY "Platform settings super admin only" ON platform_settings
  FOR ALL USING (public.user_church_id() IS NULL);

-- Plans: everyone can read (reference data); super admin can modify
CREATE POLICY "Plans read all" ON plans
  FOR SELECT USING (true);
CREATE POLICY "Plans super admin write" ON plans
  FOR ALL USING (public.user_church_id() IS NULL);

-- Church plan config: church-scoped read/write, or super admin
CREATE POLICY "Church plan config church scoped" ON church_plan_config
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Coupon codes: super admin only (no church_id on table)
CREATE POLICY "Coupon codes super admin only" ON coupon_codes
  FOR ALL USING (public.user_church_id() IS NULL);

-- Coupon redemptions: church-scoped
CREATE POLICY "Coupon redemptions church scoped" ON coupon_redemptions
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Integration requests: church-scoped
CREATE POLICY "Integration requests church scoped" ON integration_requests
  FOR ALL USING (church_id = public.user_church_id() OR public.user_church_id() IS NULL);

-- Audit logs: see own church's logs (by actor's church) or super admin sees all
CREATE POLICY "Audit logs church scoped" ON audit_logs
  FOR ALL USING (
    (SELECT church_id FROM public.users WHERE id = audit_logs.actor_id) = public.user_church_id()
    OR public.user_church_id() IS NULL
  );

-- Allow anon to read churches for subdomain lookup (by subdomain only; app can restrict)
CREATE POLICY "Churches read by subdomain for tenant resolve" ON churches
  FOR SELECT USING (true);
