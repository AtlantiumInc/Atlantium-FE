-- P1 — First network loop (plan §8, §8A).
--
-- Connections are a DURABLE RELATIONSHIP, distinct from having talked: a DM
-- thread records that two people communicated; a connection records that they
-- acknowledge each other. Blocks are their own primitive (§8A.3) — you must be
-- able to block a stranger who never connected, and a block must not erase the
-- history of having been connected.

CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined', 'removed');
CREATE TYPE connection_source AS ENUM ('direct', 'atlantium_intro', 'member_intro');

CREATE TABLE IF NOT EXISTS member_connections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_profile_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                   connection_status NOT NULL DEFAULT 'pending',
  source                   connection_source NOT NULL DEFAULT 'direct',
  introduced_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  message                  text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  accepted_at              timestamptz,
  removed_at               timestamptz,
  CONSTRAINT member_connections_no_self CHECK (requester_profile_id <> recipient_profile_id)
);

-- One LIVE edge per pair regardless of direction. Partial so a declined or
-- removed pair can reconnect later without losing the earlier record.
CREATE UNIQUE INDEX IF NOT EXISTS member_connections_pair_uq ON member_connections (
  LEAST(requester_profile_id, recipient_profile_id),
  GREATEST(requester_profile_id, recipient_profile_id)
) WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS member_connections_requester_idx ON member_connections (requester_profile_id, status);
CREATE INDEX IF NOT EXISTS member_connections_recipient_idx ON member_connections (recipient_profile_id, status);

-- Blocks stand alone: not a connection state (§8A.3). Never visible to the
-- blocked party.
CREATE TABLE IF NOT EXISTS member_blocks (
  blocker_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_profile_id, blocked_profile_id)
);

-- ── DMs on the existing threads spine ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS dm_policies (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- members | verified | introductions_only | nobody
  accepts    text NOT NULL DEFAULT 'members',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE dm_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE IF NOT EXISTS dm_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Actor context (§8.6): rights come from the persona being ACTED AS, not from
  -- the union of everything the sender happens to hold.
  acting_role_id  uuid REFERENCES member_roles(id) ON DELETE SET NULL,
  acting_org_id   uuid REFERENCES directory_entries(id) ON DELETE SET NULL,
  purpose         text NOT NULL,
  body            text NOT NULL,
  status          dm_request_status NOT NULL DEFAULT 'pending',
  thread_id       uuid REFERENCES threads(id) ON DELETE SET NULL,
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_requests_no_self CHECK (from_profile_id <> to_profile_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS dm_requests_pair_pending_uq
  ON dm_requests (from_profile_id, to_profile_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS dm_requests_to_idx ON dm_requests (to_profile_id, status, created_at DESC);
-- The outreach budget is DERIVED from these rows rather than stored, so a
-- balance can never drift from reality.
CREATE INDEX IF NOT EXISTS dm_requests_from_created_idx ON dm_requests (from_profile_id, created_at DESC);
