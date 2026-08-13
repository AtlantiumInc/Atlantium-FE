-- P0A — Identity (plan §3.2). Personas, affiliations and the professional
-- matching surface.
--
-- Three axes, deliberately not one enum: persona (member_roles.role),
-- affiliation (member_roles.entry_id → directory_entries), status
-- (professional_preferences.seeking). Verification is a fourth, orthogonal
-- concern and lands in P0B.
--
-- Both enums are created here, not in P0B: professional_preferences cannot
-- exist without seeking_visibility. P0B owns the BEHAVIOUR (visibleSeekers(),
-- employer exclusion, authorization) — this migration only owns the types.

CREATE TYPE member_role AS ENUM ('investor', 'professional', 'founder', 'advisor');

-- 'inferred' exists so a migration guess is never mistaken for a member's own
-- assertion. Inferred roles grant no initiation rights until confirmed (§5.3).
CREATE TYPE role_source AS ENUM ('self_declared', 'inferred', 'admin_assigned');

CREATE TYPE seeking_status AS ENUM ('not_seeking', 'open', 'actively_looking');

-- matched_only is the default and the load-bearing privacy control (§8.7):
-- Atlantium may act on the signal; nobody may query, list or receive it.
CREATE TYPE seeking_visibility AS ENUM (
  'private',
  'matched_only',
  'verified_employers',
  'all_members'
);

CREATE TABLE IF NOT EXISTS member_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         member_role NOT NULL,
  entry_id     uuid REFERENCES directory_entries(id) ON DELETE SET NULL,
  title        text,
  is_primary   boolean NOT NULL DEFAULT false,
  source       role_source NOT NULL DEFAULT 'self_declared',
  confirmed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- One row per (member, persona, org). The COALESCE lets a member hold both an
-- unaffiliated role and an affiliated one without colliding on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS member_roles_profile_role_entry_uq
  ON member_roles (profile_id, role, COALESCE(entry_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS member_roles_profile_idx ON member_roles (profile_id);
CREATE INDEX IF NOT EXISTS member_roles_entry_idx ON member_roles (entry_id) WHERE entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_roles_role_idx ON member_roles (role);

CREATE TABLE IF NOT EXISTS professional_preferences (
  role_id            uuid PRIMARY KEY REFERENCES member_roles(id) ON DELETE CASCADE,
  seeking            seeking_status NOT NULL DEFAULT 'not_seeking',
  seeking_updated_at timestamptz,
  visibility         seeking_visibility NOT NULL DEFAULT 'matched_only',
  target_titles      text[] NOT NULL DEFAULT '{}'::text[],
  seniority          text,
  stack              text[] NOT NULL DEFAULT '{}'::text[],
  min_salary         integer,
  remote_pref        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- "Who in Atlanta is looking right now" is the core placement query, so it gets
-- an index rather than a JSON scan. Visibility is deliberately part of it:
-- every candidate-facing read filters on both.
CREATE INDEX IF NOT EXISTS professional_seeking_idx
  ON professional_preferences (seeking, visibility, seeking_updated_at)
  WHERE seeking IN ('open', 'actively_looking');
