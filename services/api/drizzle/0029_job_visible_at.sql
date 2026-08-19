-- Rolling release: each ingested job carries visible_at — the moment it
-- surfaces publicly. Syncs land in batches; the drip scheduler scatters
-- visibility across business hours so the board reads as a continuous feed.
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "visible_at" timestamp with time zone;
-- Everything already live stays live.
UPDATE "job_postings" SET "visible_at" = "created_at" WHERE "visible_at" IS NULL;
CREATE INDEX IF NOT EXISTS "job_postings_visible_at_idx" ON "job_postings" ("visible_at");
