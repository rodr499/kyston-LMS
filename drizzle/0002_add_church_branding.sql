CREATE TABLE IF NOT EXISTS "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "church_integrations" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "secondary_color" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "banner_type" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "banner_image_url" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "banner_color" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "meeting_duration_minutes" integer DEFAULT 60;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "meeting_recurrence" jsonb;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "no_enrollment_needed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "closed_for_enrollment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "closed_contact_user_id" uuid;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classes" ADD CONSTRAINT "classes_closed_contact_user_id_users_id_fk" FOREIGN KEY ("closed_contact_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
