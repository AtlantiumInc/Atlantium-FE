-- Persona-conditional onboarding: somewhere for the branch answers to live.
--
-- professional_preferences already covers the professional branch (seeking +
-- visibility). This is the equivalent for the other three, kept as ONE table
-- rather than three near-empty ones — every column is typed and queryable
-- because each of these answers either routes a member to someone or gates a
-- capability. Anything that only decorates a profile stays in
-- registration_details and does not earn a column here.

CREATE TYPE intro_appetite AS ENUM ('none', 'some', 'all');
CREATE TYPE advisor_availability AS ENUM ('open', 'intro_only', 'closed');

CREATE TABLE IF NOT EXISTS role_details (
  role_id uuid PRIMARY KEY REFERENCES member_roles(id) ON DELETE CASCADE,

  -- founder: the two answers that make a founder matchable
  venture_stage text,
  needs text[] NOT NULL DEFAULT '{}'::text[],

  -- investor: check band in whole dollars, stages they enter at, and whether
  -- they want the curation queue pointed at them at all
  check_min integer,
  check_max integer,
  focus_stages text[] NOT NULL DEFAULT '{}'::text[],
  intro_appetite intro_appetite NOT NULL DEFAULT 'none',

  -- advisor: what they're asked about, how they engage, and whether founders
  -- may reach them directly
  domains text[] NOT NULL DEFAULT '{}'::text[],
  engagement text[] NOT NULL DEFAULT '{}'::text[],
  availability advisor_availability NOT NULL DEFAULT 'intro_only',

  -- recruiter (a professional whose affiliation carries hiring authority)
  hiring_roles text[] NOT NULL DEFAULT '{}'::text[],
  hiring_contact text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The curation queue asks "which investors want intros right now"; without this
-- that is a sequential scan over every role in the network.
CREATE INDEX role_details_intro_appetite_idx ON role_details (intro_appetite)
  WHERE intro_appetite <> 'none';
