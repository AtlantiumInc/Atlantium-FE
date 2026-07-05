ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "registration_details" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;
