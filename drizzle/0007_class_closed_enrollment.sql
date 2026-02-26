-- Classes can be set to closed for enrollment with optional contact for inquiries
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "closed_for_enrollment" boolean DEFAULT false NOT NULL;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "closed_contact" text;
