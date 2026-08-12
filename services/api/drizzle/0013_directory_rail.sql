-- Directory rail (plan §3.2, v2.1). Shared identity on directory_entries;
-- everything filtered/sorted lives in typed facet tables; contacts are a
-- separate relation behind their own repository boundary.
CREATE TYPE directory_kind AS ENUM ('company', 'person', 'investor', 'grant', 'resource');

CREATE TYPE directory_status AS ENUM ('active', 'expired', 'hidden');

-- Source registry: THE source-level kill switch. Scrapers check enabled
-- before fetching anything; disabling retains all history.
CREATE TABLE IF NOT EXISTS directory_sources (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  base_url text,
  enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS directory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind directory_kind NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  summary text,
  website text,
  location text,
  tags text[] NOT NULL DEFAULT '{}',
  status directory_status NOT NULL DEFAULT 'active',
  attributes jsonb NOT NULL DEFAULT '{}',
  verified_at timestamptz,
  review jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);

CREATE INDEX IF NOT EXISTS directory_entries_kind_status_idx
  ON directory_entries (kind, status, updated_at DESC);

-- Typed facets: filters are columns.
CREATE TABLE IF NOT EXISTS grant_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  funder text,
  amount_min int,
  amount_max int,
  deadline_date date,
  deadline_at timestamptz,
  deadline_timezone text DEFAULT 'America/New_York',
  recurring boolean NOT NULL DEFAULT false,
  eligibility text[] NOT NULL DEFAULT '{}',
  application_url text
);

CREATE INDEX IF NOT EXISTS grant_details_deadline_idx ON grant_details (deadline_date, deadline_at);

CREATE TABLE IF NOT EXISTS resource_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  category text NOT NULL,
  eligibility text[] NOT NULL DEFAULT '{}',
  application_url text
);

CREATE INDEX IF NOT EXISTS resource_details_category_idx ON resource_details (category);

CREATE TABLE IF NOT EXISTS company_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  stage text,
  headcount_band text,
  founded_year int,
  funding_total_usd bigint,
  is_hiring boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS company_details_stage_idx ON company_details (stage);

CREATE TABLE IF NOT EXISTS investor_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  firm text,
  check_min_usd bigint,
  check_max_usd bigint,
  stages text[] NOT NULL DEFAULT '{}',
  thesis text
);

-- Provenance: one entry, many sources. (source, external_id) is the stable
-- scraped identity; (kind, slug) is only the public URL identity.
CREATE TABLE IF NOT EXISTS directory_entry_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  source text NOT NULL REFERENCES directory_sources(id),
  external_id text NOT NULL,
  source_url text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  source_data jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS directory_entry_sources_entry_idx ON directory_entry_sources (entry_id);

-- Entity resolution: one normalized name MAY map to several candidates; that
-- ambiguity is what routes a lookup into the manual merge queue.
CREATE TABLE IF NOT EXISTS directory_entry_aliases (
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  name_normalized text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, name_normalized)
);

CREATE INDEX IF NOT EXISTS directory_entry_aliases_name_idx ON directory_entry_aliases (name_normalized);

-- Contacts: separate relation, separate repository. value is NULL once
-- suppressed (a real tombstone); value_hash survives so future scrapes match.
CREATE TABLE IF NOT EXISTS directory_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  contact_type text NOT NULL,
  value text,
  value_hash text NOT NULL,
  label text,
  source text NOT NULL DEFAULT 'manual',
  source_url text,
  verified_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT directory_contacts_tombstone_ck CHECK (
    (suppressed_at IS NULL AND value IS NOT NULL) OR suppressed_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS directory_contacts_entry_idx
  ON directory_contacts (entry_id) WHERE suppressed_at IS NULL;

CREATE TABLE IF NOT EXISTS directory_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_hash text NOT NULL UNIQUE,
  reason text NOT NULL,
  requested_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS directory_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS directory_reveals_user_time_idx ON directory_reveals (user_id, revealed_at);

CREATE TABLE IF NOT EXISTS directory_export_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind directory_kind,
  row_count int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS directory_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind directory_kind NOT NULL,
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'
);
