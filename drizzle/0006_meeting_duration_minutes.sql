-- Store meeting duration (minutes) for auto-created meetings
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "meeting_duration_minutes" integer DEFAULT 60;
