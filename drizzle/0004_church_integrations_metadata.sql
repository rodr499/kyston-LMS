-- Store platform-specific config (e.g. Teams facilitator sync group ID)
ALTER TABLE "church_integrations" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
