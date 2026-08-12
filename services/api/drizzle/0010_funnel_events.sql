-- Funnel instrumentation: first-party event capture (plan §7.5).
-- Server-side capture for entitlement events; client capture via POST /v1/events.
CREATE TABLE IF NOT EXISTS funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  anon_id text,
  props jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_events_event_time_idx
  ON funnel_events (event, created_at);
