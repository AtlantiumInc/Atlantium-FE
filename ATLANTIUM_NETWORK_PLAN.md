# Atlantium: Identity, Network & Monetization Plan — v3

**Status:** **greenlit for P0A.** v1 written 2026-08-13; v2 same day after external review;
v3 after second review, which approved the architecture subject to four surgical fixes — all
applied; **v4 adds the member relationship graph to P1 (§8A) after two further review
rounds. P0A/P0B unchanged since the greenlight.**
**Author:** Claude (Fable 5), for founder review.

> **v4 changelog.** §8A — first-class member connections in P1: relationship ≠
> communication, provenance on every edge, and a connection that pierces nothing (privacy,
> verification, authority, commercial entitlements all unaffected). Blocks are a standalone
> primitive, not a connection status. Cold initiation is governed by a single
> **`outreach_budget`** — the real abuse primitive is edge-creation attempts, not messages —
> with contextual scoped grants instead of power-user tiers. No cooling-off after an accepted
> two-sided intro. §8A.10 records the six distinctions that must never collapse.

> **v3 changelog.** (1) `seeking_visibility` is created in **P0A**, since
> `professional_preferences` cannot exist without it — P0B owns the behaviour, not the type
> (§3.2). (2) `UNIQUE(domain)` is gone: shared corporate mail domains are real, and a unique
> constraint silently converted evidence into ownership. Uniqueness is now
> `(entry_id, domain)`, and a domain match yields a **candidate set** the member resolves
> (§4.3). (3) `verification_grants` moved from polymorphic `subject_id` to **typed nullable
> FKs with a `CHECK` that exactly one is set** — trust data should be impossible to corrupt
> and should cascade on delete (§4.5). (4) §8.6's cumulative restrictions were over-broad —
> they now bind **within the protected context they govern**, and the real boundary is
> stated architecturally: Atlantium is not usable as a covert database of hidden job
> seekers, but it does not try to stop two humans talking. Also: seats bill
> `COUNT(DISTINCT profile_id)` (§4.2), and a queue-automation law was added (§4.8).

> **v2 changelog.** External review accepted almost in full. Material changes:
> seeking **visibility** is now first-class and in P0 (§3.4); org authority moved from
> `directory_entries.claimed_by_profile_id` to many-to-many `org_memberships` (§4.2);
> verification became a **grant with a lifecycle** rather than an enum (§4.5); DM
> authorization is now **contextual grants + cumulative restrictions**, closing a
> privilege-escalation hole (§8.6); monetization no longer charges for *presence*, only
> for *commercial use of the graph* (§6); job moderation **fails closed** (§4.7); inferred
> personas are labelled `inferred`, never `self_declared` (§5.3); the Georgia legal claim
> was overstated and is corrected (§7.2); LinkedIn Premium comparison corrected (§6.6);
> phasing split into P0A/P0B (§10).
> One place v2 goes **further** than the review: §8.6's restriction rule.

---

## 0. How to review this

Same as v1: attack it. Priority order — identity model (§3), trust primitives (§4.5, §3.4),
authorization (§8.6), monetization (§6). The "Current state" section (§2) was read from the
schema and routes and can be trusted; challenge everything else.

---

## 1. The goal, stated concretely

Atlantium becomes where a person or company in Atlanta tech goes when they need something
from the city: a role, a hire, capital, a co-founder, an advisor, a customer.

- **The deepest pulse on who is hiring for what**, including roles that never hit a board,
  sourced from relationships rather than scrapes.
- **Every serious Atlanta tech company present on Atlantium** — maintained by a verified
  employee, because that is where talent and capital are looking.
- **Investors present and reachable** — scarce supply, not paying customers.
- **One hop to any of it**, because the network knows who everyone is.

This is an identity-and-graph problem before it is a features problem.

---

## 2. Current state (as built, on prod)

### Identity & access

| Thing | Where | Notes |
|---|---|---|
| Accounts | `user` | better-auth; OTP email + Google. `is_admin`, `is_approved`, `email_verified`. `is_approved` defaults **false** (migration 0016) |
| Member record | `profiles` | `owner_user_id`, `display_name`, `slug`, `metadata` jsonb, `registration_details` jsonb, `onboarding_completed_at` |
| The gate | `ensureMemberInGoodStanding()` in `routes/app.ts` | Approved **and** questionnaire complete; admins bypass. Non-throwing twin `hasMemberBenefits()` for serializers |
| Paid capability | `memberships` + `src/lib/entitlements.ts` | Tiers `free`/`club`/`club_annual`; positive-capability model with the documented rule: never authorize with `tier !== 'free'` |
| Questionnaire | 11 steps, `components/onboarding/` | Tier declared at step 2, required, nothing pre-selected. Completion grants approval |

### The catalog

| Thing | Where | Notes |
|---|---|---|
| Directory | `directory_entries` | kinds `company`/`person`/`investor`/`grant`/`resource`; `attributes` jsonb, `verified_at`, `status`; unique (kind, slug) |
| Detail tables | `grant_details`, `directory_contacts`, `directory_entry_sources` | **Note the existing pattern: `grant_details.entry_id` is a PK-FK detail table. §3.2 follows it deliberately** |
| Reveals | `directory_reveal_budgets` | Metered |
| Jobs | `job_postings` | ~500 scraped rows (hiring.cafe → `seed-jobs.ts`), keyed by unique `apply_url`. Apply link gated |
| Content | `content_documents` | Gate defaults `public`; all published docs open |

### Messaging (already exists)

`threads` (kind: **`comments` | `dm` | `group`**), `thread_participants`, `thread_messages`.
Only `comments` is in use. **DMs are a new kind on an existing spine.**

### Gaps

- **No payment rail.** No Stripe in the Atlantium API; `memberships` is populated by nothing.
- **No link between `directory_entries` and `user`.** §3–4 is that bridge.
- Directory `person` kind is a scraped-entity concept, not a member.

---

## 3. Identity

### 3.1 Three axes, four concerns

Persona (what I am) · affiliation (who I'm with) · status (what I'm looking for), plus
verification as an orthogonal concern (§4.5). Company representative is **affiliation +
authority**, never a persona.

### 3.2 Narrow core, typed details

v1 put persona, affiliation, status, verification and free-form attributes in one table.
That table becomes the next `registration_details`. v2 keeps the core thin and pushes
matching dimensions into typed, indexed detail tables — the same shape
`grant_details` already uses against `directory_entries`.

```sql
CREATE TYPE member_role AS ENUM ('investor','professional','founder','advisor');
CREATE TYPE role_source AS ENUM ('self_declared','inferred','admin_assigned');

CREATE TABLE member_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         member_role NOT NULL,
  entry_id     uuid REFERENCES directory_entries(id) ON DELETE SET NULL,  -- affiliation
  title        text,
  is_primary   boolean NOT NULL DEFAULT false,
  source       role_source NOT NULL DEFAULT 'self_declared',
  confirmed_at timestamptz,          -- null until the member affirms it (§5.3)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX member_roles_profile_role_entry_uq
  ON member_roles (profile_id, role, COALESCE(entry_id,'00000000-0000-0000-0000-000000000000'::uuid));
```

**The test for every field: will the business regularly ask this question?** If yes, it is a
graph dimension and gets a column. `attributes jsonb` survives only for genuine long-tail
decoration.

```sql
CREATE TYPE seeking_status AS ENUM ('not_seeking','open','actively_looking');

-- Both enums are created in P0A. professional_preferences cannot exist without
-- seeking_visibility, so the *type* ships with the table; P0B owns the
-- *behaviour* — visibleSeekers(), employer exclusion, authorization (§3.4, §10).
CREATE TYPE seeking_visibility AS ENUM
  ('private','matched_only','verified_employers','all_members');

CREATE TABLE professional_preferences (
  role_id            uuid PRIMARY KEY REFERENCES member_roles(id) ON DELETE CASCADE,
  seeking            seeking_status NOT NULL DEFAULT 'not_seeking',
  seeking_updated_at timestamptz,
  visibility         seeking_visibility NOT NULL DEFAULT 'matched_only',   -- §3.4
  target_titles      text[] NOT NULL DEFAULT '{}',
  seniority          text,
  stack              text[] NOT NULL DEFAULT '{}',
  min_salary         integer,
  remote_pref        text
);
CREATE INDEX professional_seeking_idx ON professional_preferences (seeking, seeking_updated_at)
  WHERE seeking IN ('open','actively_looking');

CREATE TABLE investor_preferences (
  role_id      uuid PRIMARY KEY REFERENCES member_roles(id) ON DELETE CASCADE,
  check_min    integer,
  check_max    integer,
  stages       text[] NOT NULL DEFAULT '{}',
  sectors      text[] NOT NULL DEFAULT '{}',
  leads_rounds boolean
);

CREATE TABLE founder_state (
  role_id     uuid PRIMARY KEY REFERENCES member_roles(id) ON DELETE CASCADE,
  stage       text,
  raising     boolean NOT NULL DEFAULT false,
  raise_stage text,
  hiring      boolean NOT NULL DEFAULT false,
  needs       text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE advisor_availability (
  role_id      uuid PRIMARY KEY REFERENCES member_roles(id) ON DELETE CASCADE,
  domains      text[] NOT NULL DEFAULT '{}',
  hours_month  integer,
  accepting    boolean NOT NULL DEFAULT true
);
```

**Scope discipline:** P0A ships `member_roles` + `professional_preferences` only. The other
three land with their onboarding branches in P0B/P1. Creating four empty tables on day one
is how P0 becomes a three-month infrastructure project (§10).

### 3.3 Why not extend the directory tables

`directory_entries` is a catalog of organizations gathered from public sources, swept by
cron, `status` flipping to `expired`. Member identity has the opposite lifecycle. Merging
them lets a scraper sweep mutate people. Keep separate; join via `member_roles.entry_id`.
A claimed human is always a `profile`; the directory never gains a `person` row for a member.

### 3.4 Seeking visibility — the field that makes `seeking` safe to collect

**This is the highest-severity fix from review.** Consider Jane: professional, works at
Company A, actively looking, wants Company B to find her, must not let Company A know. v1
could represent every fact but the last — and worse, v1's DM rule let *any* employee-verified
rep contact anyone marked seeking, including her own employer's recruiter. The feature that
was supposed to protect candidates would have outed them.

`seeking_visibility` (declared in §3.2, P0A) means:

| Value | Meaning |
|---|---|
| `private` | Nobody. The member tracks it for themselves |
| **`matched_only`** | **DEFAULT.** Atlantium may match on it; never searchable, never listed, never serialized to another member |
| `verified_employers` | Discoverable by admin-verified hiring authorities |
| `all_members` | Discoverable by any member |

```sql
CREATE TABLE seeking_hidden_orgs (
  role_id  uuid NOT NULL REFERENCES member_roles(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, entry_id)
);
```

Three invariants, all enforced server-side:

1. **Default is `matched_only`.** Atlantium can act on the signal (intros, agent, curation);
   nobody can query for it. This is the conservative default *and* it makes introductions
   the product rather than a candidate list.
2. **A member's current employers are always excluded — automatically, not by opt-in.**
   Every org in that member's own `member_roles`/`org_memberships` is treated as hidden
   whether or not a `seeking_hidden_orgs` row exists. A member should never have to
   remember to hide from their own boss.
3. **Every candidate-facing query and the DM rule read `visibility`, never raw `seeking`.**
   A single `visibleSeekers(viewer)` helper is the only sanctioned path; nothing else joins
   `professional_preferences.seeking` directly.

Stale-signal handling stays: `seeking_updated_at` older than ~90 days is treated as unknown
and re-prompted.

---

## 4. Organizations, authority, verification

### 4.1 Decisions taken (founder)

Claim existing entries only; every org and claim goes through admin approval; claimants
must complete a robust profile; approved orgs eventually post jobs.

### 4.2 Authority is many-to-many (v1 got this wrong)

v1's `directory_entries.claimed_by_profile_id` implies one company → one claimant. Real
companies have a founder, a CEO, recruiters, an eng manager and a marketing lead, several of
whom legitimately act for the org with **different** privileges. It also made company seat
pricing awkward. Replaced:

```sql
CREATE TYPE org_relationship AS ENUM ('employee','founder','executive','recruiter','representative');
CREATE TYPE org_authority   AS ENUM ('none','page_editor','hiring','admin');

CREATE TABLE org_memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_id     uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  relationship org_relationship NOT NULL,
  authority    org_authority NOT NULL DEFAULT 'none',
  is_current   boolean NOT NULL DEFAULT true,
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX org_memberships_uq ON org_memberships (profile_id, entry_id, relationship)
  WHERE is_current;
CREATE INDEX org_memberships_entry_idx ON org_memberships (entry_id, authority) WHERE is_current;
```

An approved claim **creates an `org_memberships` row with authority**, rather than stamping
ownership on the catalog.

**Seat counting — bill humans, not rows.** The uniqueness constraint is
`(profile_id, entry_id, relationship)`, so one person can legitimately hold *founder* and
*executive* at the same company, both carrying authority. Seats must therefore be:

```sql
SELECT COUNT(DISTINCT profile_id) FROM org_memberships
WHERE entry_id = $1 AND is_current AND authority <> 'none';
```

`COUNT(*)` would double-bill a founder-CEO on day one. Cheap to get right now, expensive as
a support ticket later.

### 4.3 Domains

```sql
CREATE TABLE org_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  domain      text NOT NULL,
  is_primary  boolean NOT NULL DEFAULT false,
  verified_at timestamptz
);
-- NOT unique on domain alone. A parent company, its subsidiaries and its venture
-- arm legitimately share @parent.com; a global unique index would silently
-- convert "evidence of employment" into "proof of which entity you belong to",
-- contradicting the rule two paragraphs down.
CREATE UNIQUE INDEX org_domains_entry_domain_uq ON org_domains (entry_id, domain);
CREATE INDEX org_domains_domain_idx ON org_domains (domain);
```

Separate table because companies legitimately have several mail domains, and because a
domain is itself a verifiable object. Free-mail domains are hard-blocklisted; domain match
is **evidence**, never proof.

**Consequence for the verification flow.** Because a domain can map to several orgs, work-
email OTP does not resolve an employer by itself. It proves *possession of an address at
that domain*, which yields a **candidate set** of orgs:

- exactly one candidate → employment grant against that org, automatically;
- several candidates → the member picks, and the pick is recorded as their assertion
  (`evidence='email_domain_otp'` plus the member's selection);
- a pick that carries authority, or any ambiguity the member cannot resolve → admin review.

Possession of `@foo.com` never structurally proves which `foo` you belong to.

*(Future, if shared domains become common: promote domains to their own canonical table
with an `org_domain_links` join. The `(entry_id, domain)` shape above migrates into it
cleanly, so this is deferred, not foreclosed.)*

### 4.4 Two levels of company identity

| Level | Earned by | Grants |
|---|---|---|
| **Employee-verified** | Work-email OTP matching an `org_domains` row | A badge, DM credibility. `relationship='employee'`, `authority='none'` |
| **Representative** | Admin approval of an `org_requests` row | `authority` of `page_editor`/`hiring`/`admin` |

Anyone at a 5,000-person company can prove employment; almost none speak for it. Collapsing
these is how a competitor edits your page or reads your candidate flow.

### 4.5 Verification is a grant with a lifecycle, not an enum

v1 modelled verification as an increasing-trust enum, which cannot express *who* verified,
against *what evidence*, when it **expires**, or that it was **revoked** — and v1 itself
proposed annual investor re-verification. Verification is a core Atlantium asset; it gets
infrastructure.

```sql
CREATE TYPE verification_type AS ENUM
  ('identity','employment','org_authority','investor','advisor','domain');
CREATE TYPE evidence_type AS ENUM
  ('email_domain_otp','admin_review','member_vouch','external_profile','document','payment_instrument');

CREATE TABLE verification_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Typed nullable FKs rather than a polymorphic (subject_type, subject_id) pair.
  -- This is authorization data: the database should refuse impossible state, and
  -- a deleted subject must take its grants with it rather than leaving a live
  -- grant pointing at nothing.
  profile_id        uuid REFERENCES profiles(id) ON DELETE CASCADE,
  member_role_id    uuid REFERENCES member_roles(id) ON DELETE CASCADE,
  org_membership_id uuid REFERENCES org_memberships(id) ON DELETE CASCADE,
  directory_entry_id uuid REFERENCES directory_entries(id) ON DELETE CASCADE,
  verification      verification_type NOT NULL,
  evidence          evidence_type NOT NULL,
  evidence_ref      text,                     -- vouching profile id, domain, ticket, note
  granted_by        text REFERENCES "user"(id) ON DELETE SET NULL,
  granted_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  revoked_at        timestamptz,
  revoked_reason    text,
  CONSTRAINT verification_grants_one_subject CHECK (
    num_nonnulls(profile_id, member_role_id, org_membership_id, directory_entry_id) = 1
  )
);
CREATE INDEX verification_grants_profile_idx ON verification_grants (profile_id) WHERE revoked_at IS NULL;
CREATE INDEX verification_grants_role_idx    ON verification_grants (member_role_id) WHERE revoked_at IS NULL;
CREATE INDEX verification_grants_orgmem_idx  ON verification_grants (org_membership_id) WHERE revoked_at IS NULL;
CREATE INDEX verification_grants_entry_idx   ON verification_grants (directory_entry_id) WHERE revoked_at IS NULL;
```

The trade is uglier SQL (four nullable columns and a `CHECK`) for two properties worth more
than elegance in trust infrastructure: the database rejects a grant that points at nothing
or at two things, and `ON DELETE CASCADE` makes orphaned authorization structurally
impossible rather than a cleanup job somebody has to remember.

`isVerified(subject, type)` = a grant exists, not revoked, not expired. Advisor and investor
grants carry `expires_at` (annual re-verification) from day one, because retrofitting expiry
onto live trust data is far worse than having it unused for a year.

### 4.6 Org requests (unchanged from v1, retargeted)

`org_requests` stays as the claim/create queue; on approval it now writes an
`org_memberships` row **and** a `verification_grants` row rather than setting
`claimed_by_profile_id`.

### 4.7 Jobs: fail closed, and stop letting the scraper define identity

```sql
CREATE TYPE job_source AS ENUM ('scraped','posted');
CREATE TYPE job_moderation AS ENUM ('pending','approved','rejected');

ALTER TABLE job_postings
  ADD COLUMN source job_source NOT NULL DEFAULT 'scraped',
  ADD COLUMN org_entry_id uuid REFERENCES directory_entries(id) ON DELETE SET NULL,
  ADD COLUMN posted_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN source_external_id text,
  ADD COLUMN moderation job_moderation NOT NULL DEFAULT 'pending';   -- FAIL CLOSED

UPDATE job_postings SET moderation = 'approved' WHERE source = 'scraped';
```

v1 defaulted `moderation` to `approved` so scraped rows kept working — meaning any future
insert that forgets to set it publishes silently. Defaulting to `pending` and backfilling
the existing scrape is the same fail-closed rule used for authorization everywhere else.

**Job identity.** `apply_url` as the unique key breaks the moment jobs are first-party: one
ATS landing page for several roles, roles with no external URL, ATS migrations, and
scraped-plus-claimed duplicates of the same role. Move to a canonical `job_postings.id` with
**source-scoped** uniqueness on `(source, source_external_id)`, and `apply_url` nullable.

**`seed-jobs.ts --expire-missing` must be scoped to `source='scraped'`.** Unscoped, the first
production scrape expires every member-posted job. Highest-risk regression in the plan;
needs a test, not a comment.

---

### 4.8 Queue economics — verify the actor, automate the action

Three human queues exist by design: org claims, advisor verification, job moderation. They do
not saturate equally. Expected order:

1. **Job moderation saturates first.** It is recurring inventory — one company generates
   dozens of approvals, repeatedly, forever.
2. **Org claims** spike at launch, then settle; largely one-time per company.
3. **Advisor verification** is the smallest population; the `external_profile + member_vouch`
   fast path carries it initially.

The law that keeps this survivable:

> **Verify durable authority manually. Automate the routine actions taken under it.**

Nobody should hand-approve the 47th job from a hiring manager already proven to represent
Stripe. The automation path for job moderation:

```
verified hiring authority → good account history → structured validation
   → auto-approve → risk-based sampling + reports
```

Admin review is then spent on *actors*, not on every ordinary action a trusted actor takes.
Org claims get the same treatment from the other side: assemble the evidence bundle (domain
OTP, website, an existing verified admin, external profile, domain consistency) so a human
decides in seconds rather than investigating.

---

## 5. Onboarding

### 5.1 Ordering: persona first, tier last

```
1. Name
2. Persona          ──► branches everything below
3-6. Persona questions (3-4 screens)
7. Profile depth (GitHub / socials)
8. Tier             ← money question, framed in the member's own language
9. Confirm
```

Persona costs nothing to admit; tier does. Persona-first makes every later screen relevant
and lets the tier screen argue specifically. Net: **fewer screens per person than today**,
with far more usable signal.

### 5.2 Branches

| Persona | Asks | Writes |
|---|---|---|
| Professional | seeking + **visibility**, stack, target roles, GitHub, current employer | `member_roles` + `professional_preferences` |
| Founder | company (claim), stage, raising, needs | `member_roles` + `founder_state` + `org_requests` |
| Investor | firm (claim), check size, stages, sectors | `member_roles` + `investor_preferences` + verification queue |
| Advisor | domains, availability | `member_roles` + `advisor_availability` (rights pending admin verification) |

Seeking visibility is asked **in the same breath as seeking status**, never buried in
settings. The question is "who should be able to see this?", defaulted to `matched_only`.

### 5.3 Backfill: inference is not declaration

Existing members get a persona guessed from their old `primary_goal` answers, written as
**`source = 'inferred'` with `confirmed_at = null`** — never `self_declared`. Confirmation by
the member flips it to `self_declared` and stamps `confirmed_at`. Inferred personas grant
**no** initiation rights (§8.5). Knowing the difference between what a member told us and
what we guessed is a core property of a trust product.

---

## 6. Monetization: charge for commercial use, not for existing

### 6.1 The corrected inversion

v1 said "comp the scarce side" and then charged companies for presence — which contradicts
the goal that *every* serious Atlanta company is on the map, and taxes the people whose
participation makes the graph accurate.

> **Nobody pays to exist in the graph. You pay to use the graph commercially.**

Identity is supply. Reach is demand. Companies should be economically motivated to *correct*
your data, not deterred from appearing in it.

### 6.2 Structure

| Segment | Free | Paid |
|---|---|---|
| **Professional** | Profile, seeking status, be discovered, be placed, receive inbound | **$29/mo · $290/yr:** outbound DMs, exclusive events, agent, apply tracking, intros |
| **Company** | Claim + maintain the canonical page, employee badges, basic presence | **Per-post / seats:** post jobs, candidate discovery + outreach, engagement intelligence, verified-hiring badge, promotion, placement |
| **Investor** | Everything — verified, comped, invited | Intro layer (§6.5) |
| **Working Member** | — | $249+/mo, capped seats: office hours, curriculum, advisory (*your time*) |
| **Placement** | — | Employer-paid, per hire (§7) |

The paid boundary states cleanly, which is the point: **be on Atlantium, maintain your
identity, verify your employees — free. Hire through it, reach candidates, promote
opportunities, add commercial seats, place someone — money.**

Sell that as a **bundle, not per-item nickels** — e.g. *Atlantium Hiring: 2 hiring seats, N
active jobs, candidate discovery, outreach, engagement intelligence, verified-hiring badge*
— with placement sitting above it. That is a pricing decision, not an architectural one; the
schema supports either.

### 6.3 The $128 problem and the annual contradiction

Club is $128/mo while Annual is $399/yr — **$33/mo**, advertised as "Save $1,137." A 74%
annual discount means the monthly price is an anchor nobody pays; the committed price is
already ~$33. Annual should become ~2 months free ($290/yr), not 9. Separately, $128 bundles
*your time* onto a network seat — split out as Working Member with capped seats.

### 6.4 Entitlements

Extends `src/lib/entitlements.ts` cleanly. New capabilities:

```
dm.send · dm.send.unlimited · events.exclusive · agent.use · agent.credits.<n>
org.page.edit · org.jobs.post · org.candidates.search · org.candidates.outreach
intro.request · directory.contacts.unlimited (exists) · directory.contacts.export (exists)
```

Investor comping is a **grant, not a tier hack**: entitlements derive from a
`verification_grants` row, not a paid `memberships` row. Never authorize with `tier !== 'free'`.

### 6.5 Comped investors need a reason to return

A free account creates a listing, not liquidity. Without the deferred deal-flow tooling,
ship one small loop: a **weekly Atlanta signal** to verified investors — *3 companies
raising · 4 notable hires · 2 founders worth meeting · 5 new companies · 1 curated event*.
The investor becomes a participant rather than an entry, which is what actually makes the
founder proposition real. **Ops cost: someone curates this every week** — that is a real
recurring commitment, not an automated feed, at least until the graph is dense enough.

### 6.6 The honest pricing comparison

LinkedIn Premium Career lists at **$39.99/mo or $239.88/yr** (~$20/mo annualized). Atlantium
at $290/yr is ~$24/mo — **cheaper monthly, more expensive annually.** So the question is not
"are we cheaper," it is: why pay a premium over LinkedIn? The only defensible answer is
density and truth:

> not "30,000 Atlanta jobs" but "the 47 companies actually hiring, 12 roles never posted,
> 8 verified hiring people, and the members who will actually respond."

If Atlantium does not own that dataset, the price is wrong at any number.

---

## 7. Placement

### 7.1 Why it is the business

A placement is worth $10–20k to an employer. 1,000 professionals at $29 ≈ $29k/mo with a
large support surface; 20 placements/year is comparable revenue at a fraction of the
operational load. The graph that enables it is exactly §3–4:

```
professional_preferences(seeking, visibility)  ×  job_postings  ×  org_memberships(authority='hiring')
```

Every candidate query runs through `visibleSeekers(viewer)` (§3.4). **Scraped job data is
not a moat** — hiring.cafe has it. The moat is verification and relationship, surfaced as a
verified-by-Atlantium flag sourced from reps.

### 7.2 Candidate-side fees — corrected legal note

v1 asserted that "Georgia regulates fees charged to job applicants by employment agencies."
**That was too definite and is withdrawn.** Georgia's former private-employment-agency
chapter was repealed effective 1987, and current Title 34 Chapter 10 concerns labor pools.
Georgia's Fair Business Practices Act does define a "career consulting firm" around paid
career-search services including identification of prospective employers.

Corrected position: **candidate-paid employment, placement, or career-search services may
create legal and regulatory obligations depending on how the service is structured.
Employer-paid placement avoids much of that ambiguity and is the preferred model. Have
Georgia counsel classify the service before charging candidates for placement-related
activity.** The conclusion (employer-paid) is unchanged; the rationale no longer rests on a
misstatement.

---

## 8. Member-to-member DMs

Runs on the existing `threads` spine (`kind='dm'`), so the work is policy, not plumbing.

### 8.1 Requests, not messages

First contact from a stranger is a `dm_requests` row; one pending per pair (unique index);
accepted requests become a thread.

```sql
CREATE TABLE dm_policies (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  accepts    text NOT NULL DEFAULT 'members',  -- members | verified | introductions_only | nobody
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dm_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acting_role_id  uuid REFERENCES member_roles(id) ON DELETE SET NULL,   -- §8.6
  acting_org_id   uuid REFERENCES directory_entries(id) ON DELETE SET NULL,
  purpose         text NOT NULL,        -- hiring | fundraising | advice | peer | intro
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  thread_id       uuid REFERENCES threads(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX dm_requests_pair_pending_uq
  ON dm_requests (from_profile_id, to_profile_id) WHERE status = 'pending';
```

### 8.2 Who may initiate — default closed, directional

| Initiator → Recipient | Allowed? | Initiator must be | Note |
|---|---|---|---|
| professional → professional | ✅ request | self_declared | The peer graph; the only right self-declaration earns |
| professional → advisor / founder | ✅ request | self_declared | Mentorship, job leads |
| professional → company rep | ✅ request | self_declared | About a specific role |
| **rep/recruiter → professional** | ⚠️ **only if the recipient's `visibility` exposes them to this viewer** (§3.4) | employment grant | The anti-mining rule — now keyed on **visibility**, not raw `seeking` |
| founder → founder / advisor | ✅ request | approved org claim | Founder rights come from the claim you already approve |
| founder / professional → investor | ❌ blocked | — | Intro path only (§8.3) |
| investor → anyone | ✅ direct | admin grant | Scarce side, freest rights, highest verification bar |
| advisor → anyone | ✅ request | admin grant | Broad reach must be earned (§8.5) |
| anyone → `accepts='nobody'` | ❌ | — | Always wins |

Recipient policy may only make this stricter, except a member may opt *into* inbound from a
blocked persona. Investors default to `introductions_only`.

### 8.3 Why founder → investor is blocked

Curated intros are the investor-side revenue. Open DMs give that away *and* burn the
investor's willingness to be present — the asset the comp buys.

### 8.4 The outreach budget

The thing being controlled is not messages — it is **how aggressively an actor may attempt
to create new edges in the network**. Implement it as one `outreach_budget`, consumed by
every cold relationship initiation:

```
dm_request         → 1
connection_request → 1     (§8A.5 — same pool, by design)
(later: intro_request, event networking, org outreach — each with its own policy)
```

5 pending / 20 per month at $29; unlimited for investors and admin-verified reps. **Declines
do not refund budget**, so spraying is economically irrational rather than merely throttled.
Last 10 initiations >50% declined or ignored for 14 days → budget drops to 0 until an
admin or a clean streak restores it. Complete profile required to initiate, always.

**Heavy networkers get contextual grants, not bigger numbers.** A "power user = 100" tier is
how legitimate exceptions become spam tiers. Instead, apply the same law as everywhere else
— *verification grants contextual authority*: a verified event organizer gets elevated
initiation rights **toward attendees of their own event, for a limited window** — not broad
permission to cold-contact 200 professionals. The budget table should therefore support
scoped allowances (`scope_type`/`scope_id`/`expires_at`) from day one, even if the only
scope at launch is "global."

**Per-user limits are a starting mechanism, not the anti-abuse system.** Coordinated abuse
defeats them: several recruiters at one org each get their own quota, and a confederate
account can build relationships and introduce the recruiter. The boundary must eventually be
**per user AND per organization AND per domain AND per recipient AND per period**, with
blocks, reports, duplicate-body detection, account age, and org-level outreach budgets.
Scoped to P2, but the `acting_org_id` column exists from day one so org-level accounting is
possible without a migration.

### 8.5 Verification gates initiation (the rights ladder)

| Level | Earned by | Initiation rights |
|---|---|---|
| `inferred` | Migration guess (§5.3) | **None** until confirmed |
| `self_declared` | Onboarding | Professional peer graph only, quota'd |
| employment grant | Work-email OTP vs `org_domains` | Adds rep → *visible* seekers |
| org authority grant | Admin approves a claim | Adds founder/rep rights for that org |
| admin grant | Human review | Advisor and investor — the broad rights |

Advisor and investor require an admin `verification_grants` row before granting any reach.
Members may *display* those personas immediately; they simply cannot reach strangers.
Advisor is the highest-leverage persona to impersonate precisely because it has a plausible
reason to contact strangers. **Founder review confirmed: advisor verification is manual.**
Evidence that clears it fastest without a call: an external profile plus one existing
verified member vouching (`evidence='member_vouch'`). If advisor becomes common, the queue
needs batching or provisional limited rights — watch it.

### 8.6 Contextual authorization — grants are contextual, restrictions are cumulative

**v1 had a privilege-escalation bug.** v1 said initiator rights are the *union* of verified
personas. So a person verified as **both investor and recruiter at Acme** inherits
`investor → anyone` and mines professionals under their investor hat — bypassing precisely
the restriction the recruiter persona was given.

The review's fix — attach actor context to each message — is necessary but not sufficient on
its own: acting as an investor, that same person can still message a non-visible
professional "are you looking? we're hiring." So v2 adopts an asymmetric rule:

> **Grants are contextual: you get only the rights of the persona you are acting as.**
> **Restrictions are cumulative *within the protected context they govern*.**

The second clause was too broad in an earlier draft — "every restriction attached to any
role you hold applies globally" — and second review produced the counterexample. Marcus is a
founder of Startup A *and* a recruiter for Company B. Sarah is a founder of Startup C who is
also a professional, not publicly seeking. Marcus messaging Sarah founder-to-founder about a
peer topic is entirely legitimate, but a global restriction denies it because Marcus holds a
recruiter role somewhere and Sarah is a professional. That makes multi-role humans — the most
valuable people in the network — unusable.

Restrictions therefore attach to a **protected surface**, not to a person:

```
GRANT:       founder → founder,       purpose = peer         → ALLOW
RESTRICTION: recruiter → professional, purpose = hiring      → REQUIRES visibility
```

Sarah's *professional/seeking surface* is protected from Marcus. Sarah the founder is not.

Concretely, `canInitiateDm({ actor, actingRoleId, actingOrgId, purpose, recipient })`:

1. Resolve the acting role; it must belong to the actor, be confirmed (never `inferred`),
   and carry the verification the matrix requires. Rights come **only** from it.
2. Determine which of the recipient's surfaces the request targets, from `purpose` and the
   acting role. Apply every restriction governing **that surface** — regardless of which
   persona the actor is wearing. Hiring-purpose contact obeys seeking visibility if the
   actor holds any recruiter/rep role, whatever they are acting as.
3. Apply recipient protection as the **strictest** rule across the recipient's personas
   (an investor-and-founder receives investor protection) unless they opted in.
4. Refuse anything not explicitly allowed, returning a reason code.

### 8.7 The security boundary, stated honestly

A determined multi-role actor can act as an investor, open a legitimate conversation, and
then ask "by the way, are you looking?" **No static authorization model prevents that**, and
chasing it produces a system that blocks real people from real conversations.

So the boundary is drawn where it can actually hold:

> **Atlantium must never be usable as a covert database of hidden job seekers. It does not
> attempt to stop two humans from talking.**

Which makes `matched_only` (§3.4) the load-bearing control, not the DM matrix. Under
`matched_only`, a recruiter cannot: see the member in candidate search, reach them through
professional filters, receive them in a recommendation, or read `seeking` in any serialized
payload. They may cold-message someone they independently knew about — and learn nothing
from Atlantium in doing so. That is the correct line, and it is enforced in data access
rather than in message policy.

`matched_only` stays the default. It lets Atlantium act on "Jane is looking" — curated
matches, intros, agent suggestions, verified opportunities — without Jane appearing in
anyone's recruiter search. That is a genuine structural difference from LinkedIn: **you do
not have to advertise that you are looking for the network to work for you.**

Test coverage required for: investor+recruiter (the escalation case), **founder+recruiter →
founder-peer (the over-block case)**, founder+professional-seeking, rep-at-two-companies, and
inferred-unconfirmed personas.

---

## 8A. Member connections — the relationship graph (P1)

**Added by feature request after the v3 greenlight; extends v2/v3, reopens nothing in P0.**
The DM system records that two people *communicated*. It does not record the separate,
durable fact that two people *acknowledge a relationship* — and members can know each other
without ever exchanging an Atlantium DM. These are different facts with different lifecycles,
and conflating them is how "I answered a recruiter once" becomes "this recruiter is in my
network."

This is the fourth graph dimension. Identity (who are you), affiliation (who are you with),
intent (what do you need), authority (what are you trusted to do) — connections add **who
actually knows whom**, which is the input to the question the whole product aims at: *who
can credibly route this person to the thing they need?*

### 8A.1 What a connection means — deliberately narrow

Two members mutually acknowledge a relationship. Nothing more. It does **not** mean they
work together, endorse each other, speak for each other's companies, or that any private
state becomes visible. Richer edges (`worked_with`, `invested_in`, `advised`, `hired`) come
later as *evidence-backed* relationship types, never self-assigned labels. No connection
counts, no strength scores, no "people you may know," no follower mechanics in P1 — the
objective is to establish the graph, not gamify it.

### 8A.2 Schema

```sql
CREATE TYPE connection_status AS ENUM ('pending','accepted','declined','removed');
CREATE TYPE connection_source AS ENUM ('direct','atlantium_intro','member_intro');

CREATE TABLE member_connections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_profile_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                   connection_status NOT NULL DEFAULT 'pending',
  source                   connection_source NOT NULL DEFAULT 'direct',
  introduced_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  accepted_at              timestamptz,
  removed_at               timestamptz,
  CONSTRAINT member_connections_no_self CHECK (requester_profile_id <> recipient_profile_id)
);
-- One live edge per pair, regardless of direction:
CREATE UNIQUE INDEX member_connections_pair_uq ON member_connections (
  LEAST(requester_profile_id, recipient_profile_id),
  GREATEST(requester_profile_id, recipient_profile_id)
) WHERE status IN ('pending','accepted');

-- Blocks are their own primitive, NOT a connection status (§8A.3):
CREATE TABLE member_blocks (
  blocker_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_profile_id, blocked_profile_id)
);
```

### 8A.3 Where this plan diverges from the request: blocks are not a connection status

The request proposed `'blocked'` inside `connection_status`. Rejected, for two reasons. A
block modelled as a relationship state implies you can only block someone you are connected
to — but the member who most needs blocking is the stranger who keeps sending requests.
And a block overwriting `removed` destroys the history of having been connected. `member_blocks`
stands alone: it is consulted by `canInitiateDm`, by connection requests, by intro
routing, and it always wins. Blocks are never visible to the blocked party.

### 8A.4 Messaging and connections stay separate

An accepted DM is not a connection; an accepted connection is not created by talking. A
professional can answer a recruiter's pitch without adding them to their network; a founder
can consult an advisor once without a durable edge. After a conversation, the UI may offer
"Connect with Sarah" — a separate, explicit action. The one exception is **curated
introductions**: when both parties accept an Atlantium intro, the connection is created
automatically with `source='atlantium_intro'`, because both explicitly agreed to meet.
That's not a shortcut — it's provenance (§8A.7).

**No cooling-off period after an accepted intro — decided, not deferred.** The DM request
flow exists to answer one question: *has this person consented to interaction?* A two-sided
accepted introduction has already answered it, explicitly, from both parties. Inserting
latency after consent is arbitrary friction that punishes the highest-quality connection the
platform can produce. If intro abuse appears, fix it *upstream* — who may request intros,
how many, who approves them, what context is required, and their decline rates — never by
adding delay after both parties said yes.

### 8A.5 Connection requests obey the same economics as DM requests — the hole in the request as written

The request said connected members skip the stranger first-contact flow. Correct — but
combined with free, unquota'd connection requests, it quietly reopens the hole §8.4 closed:
the cheap path to any inbox becomes *send a connect instead of a DM*. LinkedIn's actual spam
problem is connect requests, not messages. So:

- Connection requests **draw from the same quota pool** as DM requests (5 pending /
  20 per month at $29) and **obey the same directional matrix** (§8.2): a persona that may
  not DM-request someone may not connect-request them either. Founder → investor connects
  route through intros, same as messages.
- Declined connection requests don't refund quota; the decline-rate penalty (§8.4) counts
  both kinds.
- Accepted connections then bypass the request flow for *messaging each other* — subject to
  §8A.6.

### 8A.6 What a connection does not override

> **A connection establishes relationship context. It does not grant universal permission.**

- **Not privacy.** Jane at `matched_only` is invisible to connected-Marcus's recruiter
  surface exactly as she is to strangers. `visibleSeekers(viewer)` remains the only path to
  candidate visibility; connection is not a parameter of it.
- **Not verification or authority.** Connecting with a rep grants no org authority;
  connecting with an investor makes nobody an investor; connection inherits nothing.
- **Not commercial entitlements.** Connected-to-Bob is social permission, not a license:
  `org.candidates.search` and outreach entitlements apply unchanged when Bob acts for Acme.
  *Relationships reduce interpersonal friction; they never bypass commercial entitlements.*
- **Not blocks or `accepts='nobody'`.** Both still win, always.

Connection changes relationship context; the rest of the authorization model is untouched.
The general form of this is §8A.10.

### 8A.7 Provenance is the strategic asset

Every edge carries `source` and, for intros, `introduced_by_profile_id`. That upgrades the
graph from "A knows B" to "A knows B **because** Atlantium (or C) introduced them" — which
is what eventually answers: who can credibly introduce me to this founder? which investors
actually have relationships at this company? which Atlantium intros became real
relationships? That last one is also the honest KPI for the intro product itself.

**Carry-forward (do not build today).** `source` + `introduced_by_profile_id` is enough
while curated intros are a human process. The moment introductions become a real object,
the connection edge must also carry `introduction_id` — a foreign key to the intro record,
not just an enum label. That upgrades provenance into **relationship attribution**:

```
connection ← originated from ← introduction ← requested by (founder)
           ← facilitated by (Atlantium / admin / member)
           ← for reason (fundraising) → outcome (meeting / investment / no response)
```

The reportable number stops being "2,000 connections created" and becomes *143 curated
intros → 92 accepted → 71 conversations → 36 meetings → 8 hires → 4 investments*. Given that
introductions are the investor-side revenue (§6.2, §8.3), that funnel is the business's own
scoreboard — and it is unrecoverable retroactively if the edge never referenced the intro.

Combined with private intent, this is the endgame loop:
**intent → identity graph → relationship graph → verification → permissions → best trusted
path → introduction → economic outcome.** The connect button exists so Atlantium can reason
about credible paths — not to copy LinkedIn.

### 8A.8 Monetization

Connections are free, permanently — genuine relationships are graph supply, and v2's law
already covers this: participation builds the graph; **commercial leverage of the graph is
what's monetized.** Paid, later: "find warm paths into these 20 accounts," "which of my
team's connections reach this company," "founders one trusted hop from our fund." Those are
commercial graph queries under `org.*`/intro entitlements, not member features.

### 8A.9 P1 scope, amended

P1 becomes: member profiles · discovery · **connection requests · durable connections ·
provenance** · DM requests · curated intros. Explicitly out: recommendation engine,
multi-hop search, strength scores, public counts, PYMK, followers.

### 8A.10 The distinctions that must not collapse

Atlantium now carries six concepts that a lesser system would have merged into "user has
access." Every future feature must preserve these boundaries, because each collapse is a
specific, predictable failure:

```
Connection   ≠ permission      — knowing someone is not being allowed to act on them
Permission   ≠ verification    — being allowed is not being proven
Verification ≠ authority       — proving you work there is not speaking for them
Authority    ≠ identity        — what you may do is not who you are
Identity     ≠ intent          — who you are is not what you currently need
Intent       ≠ disclosure      — what Atlantium knows is not what Atlantium reveals
```

Read as guarantees to members: someone may be connected to me without seeing what I need.
Someone may be verified without speaking for their employer. Someone may hold authority at a
company without being in my network. **Atlantium may know I need something without anyone
else knowing I need it** — and may still route an economic opportunity to me on the strength
of all six facts combined.

That last sentence is the system. Everything in this document is machinery for it.

---

## 9. The agent

The only $29 item with real marginal cost. **Metered from day one** — monthly credit
allowance, visible balance, purchasable top-ups (Boomin's credit wallet is the proven
pattern). Grounded in proprietary graph data, not a general chatbot: "who at these 40
companies is hiring for my stack, and who do I know there." Ships last, because it is the
most expensive to build and worthless until the graph is populated.

---

## 10. Phasing

Split per review, with explicit scope limits so P0 cannot sprawl.

| Phase | Contents | Guardrail |
|---|---|---|
| **P0A — Identity** | `member_roles`, `professional_preferences` (+ the `seeking_status` and `seeking_visibility` enums both tables require), persona-branched onboarding, inference backfill + confirm prompt | Two tables. Not four. Enums here, *behaviour* in P0B |
| **P0B — Trust primitives** | `seeking_visibility` + `visibleSeekers()`, `verification_grants`, `org_memberships`, `org_domains` + work-email OTP | These are one conceptual layer with P0A; nothing that consumes identity ships before them |
| **P1 — First network loop** | Member profiles, discovery, **connections + provenance (§8A)**, DM requests, curated intros | **Ship something a member can feel.** Guards against P0 becoming a 3-month infra project with no visible product |
| **P1b — Billing** | Stripe, `memberships` populated, entitlement grants, investor comping | Parallel; gates every paid tier |
| **P2 — Orgs & hiring** | Claims → authority, company seats, org-posted jobs (+ scraper scoping + job identity), verified-hiring signal, org-level abuse limits | |
| **P3 — Agent** | Metered agent over the graph | Needs a populated graph |

Revenue timing is the live risk: P1 is the first paid value. If P0A+P0B slips, ship the
professional→company loop before the investor loop rather than delaying both.

---

## 11. API surface (additions)

```
GET    /v1/me/roles                       personas + affiliations
POST   /v1/me/roles                       add/update persona
PATCH  /v1/me/roles/:id/seeking           status + visibility (bumps seeking_updated_at)
POST   /v1/me/work-email/verify           OTP vs org_domains → employment grant
POST   /v1/org-requests                   claim or propose
POST   /v1/admin/org-requests/:id/decide  → org_memberships + verification_grants
POST   /v1/admin/verifications            grant/revoke (advisor, investor, authority)
POST   /v1/orgs/:entryId/jobs             rep-posted job → moderation pending
GET    /v1/members?seeking=&role=         graph query — MUST route through visibleSeekers()
POST   /v1/dm/requests                    body carries acting_role_id, acting_org_id, purpose
POST   /v1/dm/requests/:id/decide         accept/decline
POST   /v1/connections/requests           same matrix + quota pool as DM requests (§8A.5)
POST   /v1/connections/requests/:id/decide
DELETE /v1/connections/:id                remove (soft; sets removed_at)
POST   /v1/blocks                         block a profile — works without any prior connection
GET    /v1/me/connections                 accepted edges only; no counts exposed publicly
```

Codebase conventions these must follow: authenticate **before** resolving path ids;
authorize with positive entitlements only; 404 rather than 403 for invisible subjects —
including when the subject exists but belongs to another member, so that probing cannot
distinguish "not yours" from "not there". (Note: the route-mount smoke test referenced in an
earlier draft is a *Boomin* convention; this repo's equivalents are `scripts/direct-smoke.ts`
and the per-feature smokes such as `scripts/smoke-member-roles.ts`.)

---

## 12. Data integrity & known hazards

- **Seeking exposure is the top trust risk.** One incident where an employer learns an
  employee is looking is worse than a year of slow growth. Invariants in §3.4 are not
  optional, and the current-employer exclusion must be a server-side default.
- **Duplicate humans** — scraped `person` entries vs member profiles need a reconciliation
  pass; a claimed person entry should redirect to the profile.
- **Stale seeking flags** — >90 days is unknown, re-prompt.
- **Scraper vs posted jobs** — §4.7. Scope `--expire-missing`; test it.
- **Trust operations scale before Postgres does.** At 10k members the failure modes are
  verification queues, stale identity, seeking privacy, recruiter abuse, org authority
  disputes, impersonation and moderation — none of which are database problems.
- Repo traps: **no `DO $$` in migrations**; drizzle correlated-subquery-in-select can
  silently return 0 (use joins); reveal-quota advisory locks are snapshot-unsafe (use an
  UPDATE-guarded budget); 2-segment route shadowing; frontend deploys are manual wrangler
  with env inlined at build, and the bundle greps are the gate.

---

## 13. Deferred deliberately (veto these)

1. **Reputation scores.** Verification only; scores invite gaming and need volume.
2. **Public browsable member directory.** Discovery via entitlement-gated queries only —
   reduces scraping and recruiter mining.
3. **In-app member↔member payments** (advisor hours). Large compliance surface.
4. **Multi-city.** Atlanta-scoped; no `city` column yet.
5. **Employer self-serve placement fees.** Manual and relationship-driven first.
6. **Investor deal-flow tooling.** Comping buys presence, not a product commitment —
   §6.5's weekly signal is the deliberate minimum.

---

## 14. Open questions for the founder

1. **Company paid line:** per-job-post, per-seat, or bundle? Free page changes this — the
   paid moment is now "post a job / search candidates," which is cleaner to sell.
2. **Do investor grants expire annually?** Schema supports it; recommend yes.
3. **Who runs the queues?** Org claims, advisor verification, job moderation. At volume this
   is a real job, and every trust primitive here assumes it exists.
4. **Grandfather `club`/`club_annual`, or migrate?** Entitlement grants make grandfathering cheap.
5. **Who writes the weekly investor signal** (§6.5), and does it survive a busy week?

---

## 15. Review status

**Round 1 (on v1):** 14 findings; 13 accepted as written, 1 (multi-persona authorization)
accepted and extended.

**Round 2 (on v2): architecture greenlit for P0A**, subject to four surgical fixes — all
applied in v3:

| # | Finding | Resolution |
|---|---|---|
| 1 | P0A/P0B enum dependency: `professional_preferences.visibility` needs a type introduced in P0B | Both enums created in P0A; P0B owns behaviour (§3.2, §10) |
| 2 | `UNIQUE(domain)` turns evidence into ownership; shared corporate domains are real | `(entry_id, domain)`; domain match yields a candidate set the member resolves (§4.3) |
| 3 | Polymorphic `subject_id` leaves authorization data without referential integrity | Typed nullable FKs + `CHECK num_nonnulls(...) = 1`, cascading deletes (§4.5) |
| 4 | Cumulative restrictions over-block legitimate multi-role humans (founder+recruiter → founder peer) | Restrictions bind within the **protected surface** they govern; security boundary stated architecturally (§8.6, §8.7) |

Also accepted from round 2: seats bill `COUNT(DISTINCT profile_id)` (§4.2); queue-automation
law and saturation order (§4.8); company pricing as a bundle (§6.2); `matched_only` retained
as default and elevated to the load-bearing privacy control (§8.7).

Answers to round 1's open items, resolved by round 2: `matched_only` **stays** the default —
it is the differentiator, not a suppressant; free company presence **strengthens** rather
than weakens the paid line, because it buys graph accuracy; job moderation saturates first.

**Round 3 (feature request, post-greenlight):** first-class member relationship graph —
accepted into P1 as §8A, with two divergences from the request as written: blocks became a
standalone primitive rather than a `connection_status` value (§8A.3), and connection
requests were placed under the same quota pool and directional matrix as DM requests, since
free connects would otherwise reopen the §8.4 hole (§8A.5). P0A/P0B untouched.

Open items for a future reviewer:

- [ ] Does the protected-surface model in §8.6 have a case where the surface is genuinely
      ambiguous — e.g. `purpose = 'peer'` used as cover for recruiting?
- [ ] Is P0A+P0B still too much infrastructure before P1's visible product?
- [ ] Once auto-approval exists for job moderation (§4.8), what is the abuse path through a
      trusted-but-compromised hiring account?
**Round 4 (on §8A):** both divergences upheld. Three refinements accepted, and both of
round 3's open questions closed rather than carried:

| Item | Resolution |
|---|---|
| The quota is misnamed | Renamed to **`outreach_budget`** — the controlled resource is edge-creation attempts, not messages. Extensible to intro requests, event networking, org outreach (§8.4) |
| Heavy networkers | **Not** a bigger number — contextual grants scoped to the actor's own event and window, per the same verification-grants-authority law. Budget rows carry scope from day one (§8.4) |
| Cooling-off after intro | **Rejected, decided.** Two-sided accepted consent is exactly what the request flow exists to establish; latency after consent is friction against the platform's best connections. Fix intro abuse upstream (§8A.4) |
| Intro provenance | Carry-forward: when introductions become a real object, the edge references `introduction_id`, not just `source` — enabling relationship attribution as the intro product's scoreboard (§8A.7) |
| Six-way distinction | Recorded as §8A.10 — the boundaries every future feature must preserve |
