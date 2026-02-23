CREATE TYPE "public"."coupon_duration_type" AS ENUM('permanent', 'days', 'months');--> statement-breakpoint
CREATE TYPE "public"."coupon_grant_type" AS ENUM('plan', 'manual_config');--> statement-breakpoint
CREATE TYPE "public"."integration_request_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."integrations_mode" AS ENUM('none', 'auto', 'manual');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "church_plan_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"plan_id" uuid,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"override_max_facilitators" integer,
	"override_max_students" integer,
	"override_max_programs" integer,
	"override_max_courses" integer,
	"override_max_storage_mb" integer,
	"override_integrations_mode" "integrations_mode",
	"override_allowed_integrations" jsonb,
	"override_custom_branding" boolean,
	"override_certificates" boolean,
	"override_sms_notifications" boolean,
	"override_analytics" boolean,
	"admin_notes" text,
	"last_modified_by" uuid,
	"last_modified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "church_plan_config_church_id_unique" UNIQUE("church_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"grant_type" "coupon_grant_type" NOT NULL,
	"grant_plan_id" uuid,
	"grant_max_facilitators" integer,
	"grant_max_students" integer,
	"grant_max_programs" integer,
	"grant_max_courses" integer,
	"grant_max_storage_mb" integer,
	"grant_integrations_mode" "integrations_mode",
	"grant_allowed_integrations" jsonb,
	"grant_custom_branding" boolean,
	"grant_certificates" boolean,
	"grant_sms_notifications" boolean,
	"duration_type" "coupon_duration_type" DEFAULT 'permanent' NOT NULL,
	"duration_value" integer,
	"expires_at" timestamp with time zone,
	"max_redemptions" integer,
	"current_redemptions" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"church_id" uuid NOT NULL,
	"redeemed_by" uuid NOT NULL,
	"redeemed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"platform" "integration_platform" NOT NULL,
	"status" "integration_request_status" DEFAULT 'pending' NOT NULL,
	"request_note" text,
	"response_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"price_monthly" numeric(10, 2),
	"price_yearly" numeric(10, 2),
	"stripe_price_id_monthly" text,
	"stripe_price_id_yearly" text,
	"max_facilitators" integer DEFAULT 3 NOT NULL,
	"max_students" integer DEFAULT 20 NOT NULL,
	"max_programs" integer DEFAULT 2 NOT NULL,
	"max_courses" integer DEFAULT 5 NOT NULL,
	"max_storage_mb" integer DEFAULT 500 NOT NULL,
	"integrations_mode" "integrations_mode" DEFAULT 'none' NOT NULL,
	"allowed_integrations" jsonb DEFAULT '[]'::jsonb,
	"custom_branding" boolean DEFAULT false NOT NULL,
	"certificates" boolean DEFAULT false NOT NULL,
	"sms_notifications" boolean DEFAULT false NOT NULL,
	"analytics" boolean DEFAULT false NOT NULL,
	"priority_support" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_prerequisite_course_id_courses_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "church_plan_config" ADD CONSTRAINT "church_plan_config_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "church_plan_config" ADD CONSTRAINT "church_plan_config_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "church_plan_config" ADD CONSTRAINT "church_plan_config_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_grant_plan_id_plans_id_fk" FOREIGN KEY ("grant_plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupon_codes_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon_codes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_redeemed_by_users_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
