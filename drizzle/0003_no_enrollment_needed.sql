-- No enrollment needed: class is accessible via link without enrolling
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "no_enrollment_needed" boolean DEFAULT false NOT NULL;
