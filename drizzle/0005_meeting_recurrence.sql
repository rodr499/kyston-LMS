-- Recurring Teams meetings: store pattern (weekly + days) and end date
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "meeting_recurrence" jsonb;
