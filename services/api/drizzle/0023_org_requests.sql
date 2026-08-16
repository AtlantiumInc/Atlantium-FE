-- P2 (pulled forward) — org claims (plan §4.6).
--
-- Founder-persona outreach requires an approved org claim (§8.5), and until now
-- there was no way to GET one: a founder hit org_claim_required with nowhere to
-- go. This is the missing door.
--
-- Claim-only by default: members claim organizations already in the directory.
-- A 'create' request exists so a missing company isn't a dead end, but it needs
-- the same review — the catalog stays authoritative either way.

CREATE TYPE org_request_kind AS ENUM ('claim', 'create');
CREATE TYPE org_request_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

CREATE TABLE IF NOT EXISTS org_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             org_request_kind NOT NULL,
  profile_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- NULL for 'create': the organization doesn't exist yet.
  entry_id         uuid REFERENCES directory_entries(id) ON DELETE CASCADE,
  proposed         jsonb NOT NULL DEFAULT '{}'::jsonb,
  relationship     org_relationship NOT NULL DEFAULT 'founder',
  evidence         text,
  status           org_request_status NOT NULL DEFAULT 'pending',
  decided_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  decided_at       timestamptz,
  decision_note    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- One live request per member per organization — no queueing five claims on the
-- same company while the first is being reviewed.
CREATE UNIQUE INDEX IF NOT EXISTS org_requests_live_uq
  ON org_requests (profile_id, COALESCE(entry_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS org_requests_status_idx ON org_requests (status, created_at);
