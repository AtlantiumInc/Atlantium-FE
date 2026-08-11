-- Weekly member digest: suppression list + run lock/history.

CREATE TABLE IF NOT EXISTS digest_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL DEFAULT 'unsubscribed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digest_runs (
  period_key text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'weekly',
  recipients integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
