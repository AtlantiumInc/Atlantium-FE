-- P1 S5 — Curated introductions (plan §8.3, §8A.7).
--
-- Founders cannot cold-pitch investors, so the introduction IS the path through
-- a door that is deliberately locked. It is also the investor-side revenue, and
-- the only reason comping investors works: they get an uninterrupted inbox AND
-- a filtered stream of founders worth meeting.

CREATE TYPE introduction_status AS ENUM (
  'pending_review',   -- awaiting curation
  'rejected',         -- curation said no; the target never sees it
  'awaiting_target',  -- curated through, now the target's decision
  'accepted',
  'declined',
  'withdrawn',
  'expired'
);

-- Recorded for attribution, not for a dashboard vanity metric: the point is to
-- learn which introductions actually became something.
CREATE TYPE introduction_outcome AS ENUM (
  'unknown', 'no_response', 'met', 'ongoing', 'hired', 'invested', 'dead'
);

CREATE TABLE IF NOT EXISTS introductions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Who made it happen. NULL means Atlantium itself rather than a member.
  facilitator_user_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  reason                 text NOT NULL,
  context                jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                 introduction_status NOT NULL DEFAULT 'pending_review',
  review_note            text,
  outcome                introduction_outcome NOT NULL DEFAULT 'unknown',
  outcome_note           text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  reviewed_at            timestamptz,
  responded_at           timestamptz,
  CONSTRAINT introductions_no_self CHECK (requester_profile_id <> target_profile_id)
);

-- One live ask per pair: a founder cannot queue five requests at the same
-- investor while the first is still being considered.
CREATE UNIQUE INDEX IF NOT EXISTS introductions_pair_live_uq
  ON introductions (requester_profile_id, target_profile_id)
  WHERE status IN ('pending_review', 'awaiting_target');

CREATE INDEX IF NOT EXISTS introductions_status_idx ON introductions (status, created_at);
CREATE INDEX IF NOT EXISTS introductions_target_idx ON introductions (target_profile_id, status);

-- THE carry-forward (§8A.7). `source='atlantium_intro'` records THAT we
-- introduced them; only this column records WHICH introduction did it. Without
-- it the funnel — intros → accepted → conversations → outcomes — cannot be
-- reconstructed after the fact at any price.
ALTER TABLE member_connections
  ADD COLUMN IF NOT EXISTS introduction_id uuid REFERENCES introductions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS member_connections_introduction_idx
  ON member_connections (introduction_id) WHERE introduction_id IS NOT NULL;
