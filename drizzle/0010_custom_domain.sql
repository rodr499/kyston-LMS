ALTER TABLE "churches" ADD COLUMN IF NOT EXISTS "custom_domain" text;
ALTER TABLE "churches" ADD COLUMN IF NOT EXISTS "custom_domain_record_type" text;
CREATE UNIQUE INDEX IF NOT EXISTS "churches_custom_domain_unique" ON "churches" ("custom_domain") WHERE custom_domain IS NOT NULL;
