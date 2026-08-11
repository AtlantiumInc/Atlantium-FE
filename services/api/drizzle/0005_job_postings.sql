CREATE TABLE IF NOT EXISTS "job_postings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "company" text NOT NULL,
  "location" text NOT NULL,
  "workplace_type" text,
  "seniority" text,
  "salary_min" integer,
  "salary_max" integer,
  "apply_url" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "posted_at" timestamp with time zone,
  "content" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_postings_slug_unique" ON "job_postings" ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_postings_apply_url_unique" ON "job_postings" ("apply_url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_postings_status_posted_idx" ON "job_postings" ("status", "posted_at");
