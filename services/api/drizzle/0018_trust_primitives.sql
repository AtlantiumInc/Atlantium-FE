-- P0B — Trust primitives (plan §4.2, §4.3, §4.5).
--
-- Three tables that together answer "what may Atlantium safely believe, and
-- reveal, about a member": org authority (many-to-many, not a single claimant),
-- org domains (evidence, never proof), and verification as a GRANT with a
-- lifecycle rather than an enum.

-- ── Organizations: authority is many-to-many ────────────────────────────────
-- A company has a founder, a CEO, recruiters and an eng manager; several act
-- for it with DIFFERENT privileges. A single claimed_by column cannot express
-- that, and makes seat pricing awkward.

CREATE TYPE org_relationship AS ENUM ('employee', 'founder', 'executive', 'recruiter', 'representative');
CREATE TYPE org_authority AS ENUM ('none', 'page_editor', 'hiring', 'admin');

CREATE TABLE IF NOT EXISTS org_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_id     uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  relationship org_relationship NOT NULL,
  authority    org_authority NOT NULL DEFAULT 'none',
  is_current   boolean NOT NULL DEFAULT true,
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_uq
  ON org_memberships (profile_id, entry_id, relationship) WHERE is_current;
CREATE INDEX IF NOT EXISTS org_memberships_entry_idx
  ON org_memberships (entry_id, authority) WHERE is_current;
-- Employer exclusion (§3.4) reads this constantly: "which orgs is this member at".
CREATE INDEX IF NOT EXISTS org_memberships_profile_idx
  ON org_memberships (profile_id) WHERE is_current;

-- ── Domains: evidence of employment, never proof of which entity ────────────
-- Deliberately NOT unique on domain alone. A parent company, its subsidiaries
-- and its venture arm legitimately share @parent.com; a global unique index
-- would silently convert evidence into ownership.

CREATE TABLE IF NOT EXISTS org_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  domain      text NOT NULL,
  is_primary  boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_domains_entry_domain_uq ON org_domains (entry_id, domain);
CREATE INDEX IF NOT EXISTS org_domains_domain_idx ON org_domains (domain);

-- ── Verification: a grant with a lifecycle ──────────────────────────────────
-- Typed nullable FKs rather than a polymorphic (subject_type, subject_id) pair.
-- This is authorization data: the database should refuse impossible state, and
-- a deleted subject must take its grants with it rather than leaving a live
-- grant pointing at nothing. expires_at ships unused rather than being
-- retrofitted onto live trust data later (investor/advisor re-verification).

CREATE TYPE verification_type AS ENUM
  ('identity', 'employment', 'org_authority', 'investor', 'advisor', 'domain');
CREATE TYPE evidence_type AS ENUM
  ('email_domain_otp', 'admin_review', 'member_vouch', 'external_profile', 'document', 'payment_instrument');

CREATE TABLE IF NOT EXISTS verification_grants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  member_role_id     uuid REFERENCES member_roles(id) ON DELETE CASCADE,
  org_membership_id  uuid REFERENCES org_memberships(id) ON DELETE CASCADE,
  directory_entry_id uuid REFERENCES directory_entries(id) ON DELETE CASCADE,
  verification       verification_type NOT NULL,
  evidence           evidence_type NOT NULL,
  evidence_ref       text,
  granted_by         text REFERENCES "user"(id) ON DELETE SET NULL,
  granted_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  revoked_at         timestamptz,
  revoked_reason     text,
  CONSTRAINT verification_grants_one_subject CHECK (
    num_nonnulls(profile_id, member_role_id, org_membership_id, directory_entry_id) = 1
  )
);

CREATE INDEX IF NOT EXISTS verification_grants_profile_idx
  ON verification_grants (profile_id, verification) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS verification_grants_role_idx
  ON verification_grants (member_role_id, verification) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS verification_grants_orgmem_idx
  ON verification_grants (org_membership_id, verification) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS verification_grants_entry_idx
  ON verification_grants (directory_entry_id, verification) WHERE revoked_at IS NULL;

-- ── Work-email verification (the evidence behind an employment grant) ───────
CREATE TABLE IF NOT EXISTS work_email_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email       text NOT NULL,
  domain      text NOT NULL,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_email_verifications_profile_idx
  ON work_email_verifications (profile_id, created_at DESC);
