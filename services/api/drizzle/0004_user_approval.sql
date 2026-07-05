ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_approved" boolean DEFAULT false NOT NULL;
