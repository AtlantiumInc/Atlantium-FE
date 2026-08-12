-- Track which jobs are in an in-flight batch so overlapping cron ticks
-- don't resubmit (and re-pay for) the same jobs while a batch is queued.
ALTER TABLE review_batches ADD COLUMN IF NOT EXISTS job_ids jsonb NOT NULL DEFAULT '[]';
