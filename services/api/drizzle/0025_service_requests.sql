-- Service requests: one pipeline for everything sold over a phone call.
--
-- The first service is the AI Engineering cohort, but the shape is generic on
-- purpose: lead applies → founder is notified → call → offer set on the call →
-- payment link at that exact number → webhook marks it paid. The PIPELINE gets
-- typed columns because every service shares it and the queue filters on it.
-- The QUESTIONS go in a jsonb blob because they differ per service and exist
-- only to be read aloud on the call — nothing routes on them. Which services
-- exist lives in a code registry, not an enum, so adding one is a registry
-- entry and a deploy, never a migration.

CREATE TYPE service_request_status AS ENUM
  ('new', 'called', 'offered', 'paid', 'fulfilled', 'passed');

CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,

  -- Who's asking. No auth required — job-board traffic is logged out — but a
  -- session at submit time links the request to the member.
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,

  answers jsonb NOT NULL DEFAULT '{}'::jsonb,

  status service_request_status NOT NULL DEFAULT 'new',
  offer_cents integer,
  payment_link_url text,
  stripe_session_id text,
  note text,

  called_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The queue reads "newest first, by service, by stage".
CREATE INDEX service_requests_queue_idx ON service_requests (kind, status, created_at DESC);
-- The webhook resolves a payment back to its request.
CREATE UNIQUE INDEX service_requests_session_uq ON service_requests (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
