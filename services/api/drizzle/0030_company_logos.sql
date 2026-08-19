-- Company logo registry: resolved once offline (svgl for brand SVGs, favicon
-- service keyed by the company's real domain for the tail), kept current by
-- the sync cron for newly seen companies.
CREATE TABLE IF NOT EXISTS "company_logos" (
  "company" text PRIMARY KEY,
  "logo_url" text,
  "domain" text,
  "source" text NOT NULL DEFAULT 'favicon',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
