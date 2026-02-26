-- Replace free-text closed contact with a user reference (dropdown of tenant users)
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "closed_contact_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "classes" DROP COLUMN IF EXISTS "closed_contact";
