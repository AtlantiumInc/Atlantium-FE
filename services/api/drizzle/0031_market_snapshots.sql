-- Longitudinal record of the Atlanta tech market: one row per day, written by
-- the daily cron. The board itself only knows the present tense — when a job
-- expires or a salary changes, the old value is gone. These aggregates are the
-- only history that will ever exist, and they cannot be backfilled, so the
-- table exists to be written to every single day from here on.
--
-- Aggregates only, never job rows: ~1KB/day keeps this off the Neon
-- data-transfer budget that has caused outages before.
CREATE TABLE IF NOT EXISTS "market_snapshots" (
  "day" date PRIMARY KEY,
  "total_active" integer NOT NULL,
  "new_today" integer NOT NULL,
  "new_7d" integer NOT NULL,
  "expired_today" integer NOT NULL,
  "remote_count" integer NOT NULL,
  "hybrid_count" integer NOT NULL,
  "onsite_count" integer NOT NULL,
  "no_degree_count" integer NOT NULL,
  "ai_role_count" integer NOT NULL,
  "priced_count" integer NOT NULL,
  "median_min" integer,
  "median_max" integer,
  "p25_max" integer,
  "p75_max" integer,
  "over_200k_count" integer NOT NULL,
  "salary_bands" jsonb,
  "seniority_mix" jsonb,
  "top_tech" jsonb,
  "top_companies" jsonb,
  "field_mix" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
