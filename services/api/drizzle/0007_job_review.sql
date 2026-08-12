-- Daily AI job review: per-job verdict state + Anthropic batch tracking.

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS review jsonb;

CREATE INDEX IF NOT EXISTS job_postings_status_reviewed_idx
  ON job_postings (status, reviewed_at);

CREATE TABLE IF NOT EXISTS review_batches (
  batch_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'in_progress',
  job_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb
);
