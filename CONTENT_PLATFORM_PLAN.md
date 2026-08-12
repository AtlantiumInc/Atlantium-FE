# Atlantium Content Platform — Full Build Plan (v2.1)

**Document status:** APPROVED (architecture) / APPROVED WITH REQUIRED SCHEMA PATCHES (implementation) per staff re-review — **the five required patches are applied in this revision; the foundation is considered frozen.** Per the same review, no further broad architectural rewrites: remaining refinement happens in implementation. Nothing in this document is built unless its status marker says so.
**Author:** drafted with Claude Code, 2026-08-12. v2 same day incorporating staff review; v2.1 same day applying the re-review punch list.

**v2.1 changelog (staff re-review punch list — foundation now frozen after these):**
1. `directory_contacts` tombstone contradiction fixed: `value` nullable, `value_hash NOT NULL`, CHECK constraint; hash incorporates contact type (§3.2)
2. Alias table re-keyed `(entry_id, name_normalized)` so one name can map to multiple candidate entities → merge queue is representable (§3.2)
3. True source registry `directory_sources` with the source-level kill switch; row-level `enabled` retained as a separate per-provenance capability (§3.2, §4.2, §6.1)
4. Document slugs back to `UNIQUE(type, slug)`; API route carries `:type`; canonical doc URL is `/docs/:slug` — collections are navigation taxonomy, not URL identity (§3.1, §4.1, §7.1)
5. Grant deadlines date-safe: `deadline_date` / `deadline_at` / `deadline_timezone` with end-of-day-in-program-timezone expiry semantics (§3.2, §6.1)
6. Hardening: advisory lock key is 64-bit (`hashtextextended`), lock CTE explicitly `MATERIALIZED` (§5.2)
7. Reveal semantic explicitly decided: **entry-level unlock** (§5.2)
8. Phase-2 SEO acceptance rewritten to deterministically verifiable criteria; indexation moved to an OPERATING metric (§8)

**v2 changelog (all staff-review requests addressed):**
1. Reveal quota made atomic (statement-level advisory lock; §5.2) — reviewer issue 1
2. Entitlement contract unified: list endpoints never carry contacts for any tier; explicit privileged contacts/export routes added (§4.1, §4.3) — issue 2
3. Contacts moved from a jsonb column to a separate `directory_contacts` table + suppression/takedown primitive (§3.2) — issue 3
4. Kind-specific facet tables (`grant_details`, `company_details`, `investor_details`) replace filterable jsonb (§3.2) — issue 4
5. Document model split into `type` (publishing surface) × `format` (content format); slug made globally unique (§3.1) — issue 5
6. Source identity/provenance: `directory_entry_sources` with unique `(source, external_id)`, alias table, jobs→company entity resolution path (§3.2, §6.1) — issue 6
7. SEO architecture section added with an explicit rendering decision (§7.4) — issue 7
8. Funnel instrumentation with named events, wired into phase acceptance criteria (§7.5, §8) — issue 8
9. Bug fixes: partial unique index written explicitly; comments inherit subject visibility; `contact_state: 'none'`; positive entitlement capabilities replace `tier != 'free'` (§3.3, §4.4, §5.2, §5.4)
10. Phases reordered grants-first per review (§8); §2 status markers corrected and a five-state legend formalized

---

## 0. Status vocabulary (used throughout)

| Marker | Meaning |
|---|---|
| **PLANNED** | designed in this doc, no code exists |
| **IMPLEMENTED** | code written, not yet verified |
| **VERIFIED-DEV** | exercised against the dev stack with real data |
| **DEPLOYED** | live in prod |
| **OPERATING** | deployed *and* observed doing its job on real traffic/data |

Everything in §3–§8 is **PLANNED** unless stated otherwise.

---

## 1. Atlantium: what the org is and why this platform matters

**Atlantium (atlantium.ai), "Citizen Technology Lab," is Atlanta's premier technology network — where the city's sharpest technologists connect, level up, and get hired.** (Live homepage positioning.)

### 1.1 Product ladder (today)

| Tier | Product | Price | Status |
|---|---|---|---|
| Anonymous | Job board, homepage, events listing, OG-card shares | free | OPERATING |
| **Free member** | Weekly Job Report email digest, lobby participation | free account | OPERATING (signup funnel shipped Aug 2026) |
| **Paid member** | Office Hours (daily), resume help, warm intros to hiring managers | ~$128/mo | OPERATING |
| Program | AI Engineer Training — 4-week hands-on program | paid | OPERATING (`/training`) |
| B2B | Services — custom AI solutions, integrations, consulting | contract | OPERATING (`/services`) |
| Growth | Creator/Partner program (Boomin-powered referral infra) | rev-share | OPERATING (`/creator-program`) |

### 1.2 The strategic thesis

Atlantium's growth engine is **aggregated local public-good data → free account → weekly email habit → paid community & training**. Proven in production with the job board:

- ~4,900 Atlanta AI/tech jobs scraped daily from hiring.cafe into our own Neon DB (OPERATING).
- Every job page carries a signup modal ("get the Weekly Job Report") → free membership (OPERATING).
- Weekly digest email with section-provider architecture: jobs + events sections today (OPERATING).
- AI review pipeline verifying every job daily via Claude Haiku Batch API — see §2.1 for its *actual* current status.
- Job content redistributed on social (New Job Report on YouTube/IG/TikTok/Threads) with per-job OG cards (OPERATING).

**This plan extends the same flywheel to four more surfaces** — docs/guides, a blog, a company/investor directory, and a grants & municipal resources directory — because the marginal cost is low (scraping, gating, digest, OG, and AI-verification rails exist) and each surface adds a distinct lead magnet and paid-upgrade pressure point.

### 1.3 Why each new surface earns its place

- **Docs & guides:** Atlantium sells AI training; free gated docs are top-of-funnel proof of teaching quality, plus an SEO surface (§7.4 now specifies the SEO machinery this claim depends on).
- **Blog (CMS):** local authority — write-ups on Atlanta tech influentials, funding news, scene coverage. Nobody owns "Atlanta tech media."
- **Company & investor directory:** the Crunchbase/Apollo model localized; contact info is the metered asset (free: N reveals/rolling-30d; paid: privileged access + export).
- **Grants & municipal resources:** the most differentiated asset. Nobody aggregates Atlanta/Georgia public money for tech. Deadlines create urgency, recurrence, and digest content. Pure scraping, high perceived value. **Per staff review, this ships second, not fourth** — it validates the directory primitive, scraper framework, expiry semantics, and traffic appetite *before* the PII/metering complexity of companies/investors.

### 1.4 History lesson this plan must respect

The previous blog + messaging system lived on Xano and is dead (every call returns `Invalid name: mvpw1`). Its fatal flaw: **articles were messages** — an article row was a message inside a thread with the article packed into a `content` jsonb blob, HTML body via `dangerouslySetInnerHTML`. Content and conversation were the same primitive; when the messaging backend died, the blog died with it.

**Design law: content is not a message; records are not documents.** Three primitives, cleanly separated, pointing at each other:
1. **Documents** (narrative markdown, read linearly)
2. **Directory entries** (structured records: filtered, searched, revealed)
3. **Threads/messages** (conversation) — anchored *to* the other two by reference, never containing them

---

## 2. Current technical state

### 2.1 Infrastructure (status per item)

- **API:** Cloudflare Worker `atlantium-api` at `api.atlantium.ai` (Hono) — OPERATING
- **DB:** Neon Postgres, drizzle-orm `neon-http`, idempotent SQL migrations tracked in `schema_migrations` — OPERATING. **Constraint that shapes §5.2:** the neon-http driver has no interactive transactions; multi-statement read-then-write transactions are not available, so atomicity must come from single-statement SQL.
- **Auth:** better-auth (email OTP + Google OAuth, cookie sessions), `ensureDefaultProfile` hook, `ADMIN_EMAILS` allowlist — OPERATING
- **FE:** React/Vite SPA on Cloudflare Pages `atlantium-fe`; manual wrangler deploy only — OPERATING
- **Email:** Resend batch + HMAC unsubscribe; weekly digest with section-provider architecture (jobs + events) — OPERATING
- **OG meta worker:** injects per-route OG tags; per-job card PNGs via workers-og (satori/resvg) — OPERATING. This worker is the seed of the SEO layer in §7.4.
- **Crons:** daily job scrape 10:00 UTC (OPERATING), Monday digest 13:00 UTC (OPERATING), AI review cycle every 30 min (DEPLOYED-config; see next line)
- **AI job-review pipeline:** IMPLEMENTED in full; VERIFIED-DEV for the deterministic tier, shard submission, inflight caps, and a synchronous same-schema Claude call; the **batch poll/apply path is still awaiting its first completed Anthropic batch** (queued unusually long on Anthropic's side as of this writing). **NOT DEPLOYED to prod.** Prod rollout is gated on that verification. Statements elsewhere in this doc about reusing "the verification rail" inherit this status.

### 2.2 Current Neon tables (prod, 17)

- Auth/identity: `user`, `session`, `account`, `verification`, `profiles`, `profile_members`, `memberships`
- Lobby/events: `lobby_rooms`, `lobby_events`, `lobby_messages` (flat room chat), `lobby_event_attendance`, `lobby_room_roles`
- Jobs: `job_postings` (incl. `content` jsonb, `review` jsonb, `reviewed_at`), `review_batches`
- Email: `digest_runs`, `digest_suppressions`

**No content, docs, blog, directory, or generic thread tables exist.** The FE retains the dead-Xano blog client (`Article` types, `ArticleDetailPage`, `ArticleCard`, `LatestArticles`, `AdminArticlesPage`) and dead DM types — reusable UI, dead endpoints.

---

## 3. Schema (all PLANNED)

Four migrations, ~14 tables.

### 3.1 Migration A — documents rail

Per staff review: `type` = publishing surface, `format` = content format — both real columns because both are filtered. Uniqueness is **`(type, slug)`** — `/blog/getting-started` and `/docs/getting-started` are separate web resources; the public URL already disambiguates, and the API route carries the type. **Canonical doc URL is `/docs/:slug` (no collection segment)**: collections are navigation taxonomy, not URL identity, so documents can move between collections without breaking URLs or minting redirects — which also makes nullable `collection_id` coherent (an uncollected doc is simply un-navigated, not un-addressable).

```sql
CREATE TYPE document_type   AS ENUM ('doc', 'post');
CREATE TYPE document_format AS ENUM ('article', 'guide', 'reference');
CREATE TYPE document_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE document_gate   AS ENUM ('public', 'preview', 'member');

CREATE TABLE content_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type document_type NOT NULL,            -- WHERE it publishes: docs surface vs blog
  format document_format NOT NULL DEFAULT 'article',  -- WHAT it is: article/guide/reference
  slug text NOT NULL,                     -- unique per type (see UNIQUE below): /blog/x and /docs/x
                                          -- are separate web resources; no global namespace
  title text NOT NULL,
  excerpt text,
  body_md text NOT NULL DEFAULT '',       -- markdown, never raw HTML
  cover_image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  author_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES content_collections(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  status document_status NOT NULL DEFAULT 'draft',
  gate document_gate NOT NULL DEFAULT 'preview',
  published_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}',       -- display-only: tldr[], read_time, sources[],
                                          -- guide: {steps, difficulty, time_to_complete}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);
CREATE INDEX content_documents_type_status_pub_idx ON content_documents (type, status, published_at DESC);
CREATE INDEX content_documents_format_idx        ON content_documents (format) WHERE status = 'published';
CREATE INDEX content_documents_collection_idx    ON content_documents (collection_id, sort_order);
```

Gating semantics (server-enforced, §5.1): `public` = full body for everyone; `preview` = anonymous gets body truncated at `<!--more-->` (fallback: first 30% of blocks) + `gated: true`; `member` = anonymous gets excerpt only. **The full body of a gated document is never selected for an anonymous request path** — gating client-side would ship scrapeable text.

### 3.2 Migration B — directory rail

Per staff review: shared identity/discovery on `directory_entries`; **filterable/sortable facts in typed per-kind facet tables**; **contacts in their own table** behind a hard repository boundary; **source provenance as a first-class relation**; **suppression as a takedown primitive that survives re-syncs**.

```sql
CREATE TYPE directory_kind   AS ENUM ('company', 'person', 'investor', 'grant', 'resource');
CREATE TYPE directory_status AS ENUM ('active', 'expired', 'hidden');

-- Shared identity + discovery fields only. attributes jsonb remains, but is
-- DISPLAY-ONLY by rule: anything filtered/sorted gets a typed facet column.
CREATE TABLE directory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind directory_kind NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  summary text,
  website text,
  location text,
  tags text[] NOT NULL DEFAULT '{}',
  status directory_status NOT NULL DEFAULT 'active',
  attributes jsonb NOT NULL DEFAULT '{}',   -- display-only extras (e.g. person.socials, freeform notes)
  verified_at timestamptz,
  review jsonb,                             -- AI verdict payload (same family as job_postings.review)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);
CREATE INDEX directory_entries_kind_status_idx ON directory_entries (kind, status, updated_at DESC);

-- Typed facet tables: 1:1 with entries of that kind. Filters are columns.
CREATE TABLE grant_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  funder text,
  amount_min int, amount_max int,
  -- Deadlines are date-safe (per staff review): most grants publish
  -- "applications close September 30" — a date, not an instant.
  deadline_date date,                       -- date-only deadline as published
  deadline_at timestamptz,                  -- exact instant when the source gives one
  deadline_timezone text,                   -- IANA tz of the program (default 'America/New_York')
  recurring boolean NOT NULL DEFAULT false,
  eligibility text[] NOT NULL DEFAULT '{}',
  application_url text
);
CREATE INDEX grant_details_deadline_idx ON grant_details (deadline_date, deadline_at);
-- Expiry semantics: exact instant known → expire past deadline_at. Date-only →
-- remain active through END of deadline_date in deadline_timezone. Both null →
-- never auto-expire (verification pass may still flag).

CREATE TABLE company_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  stage text,                               -- 'seed' | 'series_a' | ... normalized vocabulary
  headcount_band text,                      -- '1-10' | '11-50' | ...
  founded_year int,
  funding_total_usd bigint,
  is_hiring boolean NOT NULL DEFAULT false  -- maintained by the jobs join (§6.1)
);
CREATE INDEX company_details_stage_idx ON company_details (stage);

CREATE TABLE investor_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  firm text,
  check_min_usd bigint, check_max_usd bigint,
  stages text[] NOT NULL DEFAULT '{}',
  thesis text
);
-- resource kind: category is filtered → typed
CREATE TABLE resource_details (
  entry_id uuid PRIMARY KEY REFERENCES directory_entries(id) ON DELETE CASCADE,
  category text NOT NULL,                   -- 'accelerator' | 'tax_credit' | 'city_program' | ...
  eligibility text[] NOT NULL DEFAULT '{}',
  application_url text
);
CREATE INDEX resource_details_category_idx ON resource_details (category);

-- CONTACTS: separate relation, separate repository, never joined by the
-- ordinary directory read path. Contact-level provenance + verification +
-- removal state live here.
CREATE TABLE directory_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  contact_type text NOT NULL,               -- 'email' | 'phone' | 'linkedin' | 'intro_path' | 'form'
  value text,                               -- NULL once suppressed (real tombstone: the data is gone)
  value_hash text NOT NULL,                 -- sha256(contact_type || ':' || normalize(value)); survives suppression
  label text,                               -- 'partnerships', 'founder', ...
  source text NOT NULL DEFAULT 'manual',
  source_url text,
  verified_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (suppressed_at IS NULL AND value IS NOT NULL)
    OR suppressed_at IS NOT NULL
  )
);
-- Suppression op: value = NULL, suppressed_at = now(); value_hash remains so
-- the tombstone still matches future scrape attempts.
CREATE INDEX directory_contacts_entry_idx ON directory_contacts (entry_id) WHERE suppressed_at IS NULL;

-- Suppression registry: normalized-value hashes that syncs MUST check before
-- (re)inserting a contact. This is what makes takedown survive future scrapes.
CREATE TABLE directory_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_hash text NOT NULL UNIQUE,          -- sha256(contact_type || ':' || normalize(value)) — same format as directory_contacts.value_hash
  reason text NOT NULL,                     -- 'takedown_request' | 'bounced' | 'legal' | ...
  requested_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SOURCE REGISTRY: the actual source-level kill switch (per staff review).
-- Disabling a source here stops its scraper before it fetches — one switch,
-- history retained.
CREATE TABLE directory_sources (
  id text PRIMARY KEY,                      -- 'invest_atlanta', 'jobs_board', 'manual', ...
  display_name text NOT NULL,
  base_url text,
  enabled boolean NOT NULL DEFAULT true,    -- THE source-level kill switch
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SOURCE IDENTITY: one entry, many sources. (source, external_id) is the
-- stable scraped identity; (kind, slug) is only the public URL identity.
CREATE TABLE directory_entry_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  source text NOT NULL REFERENCES directory_sources(id),
  external_id text NOT NULL,                -- source-native stable id (URL path, listing id…)
  source_url text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  source_data jsonb NOT NULL DEFAULT '{}',  -- raw normalized payload from that source
  enabled boolean NOT NULL DEFAULT true,    -- per-provenance-record disable (bad single record),
                                            -- a DIFFERENT capability from the registry kill switch
  UNIQUE (source, external_id)
);
CREATE INDEX directory_entry_sources_entry_idx ON directory_entry_sources (entry_id);

-- Entity resolution: aliases so "Cognizant US Corporation" and "Cognizant"
-- resolve to one company. Keyed (entry_id, name_normalized): one normalized
-- name MAY map to multiple candidate entities — that ambiguity is exactly
-- what routes a lookup into the manual merge queue (per staff review).
CREATE TABLE directory_entry_aliases (
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  name_normalized text NOT NULL,            -- lower, trimmed, legal-suffix-stripped
  verified boolean NOT NULL DEFAULT false,  -- human-confirmed vs scraper-proposed
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, name_normalized)
);
CREATE INDEX directory_entry_aliases_name_idx ON directory_entry_aliases (name_normalized);

CREATE TABLE directory_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_id)                -- re-revealing the same entry is free forever
);
CREATE INDEX directory_reveals_user_time_idx ON directory_reveals (user_id, revealed_at);

-- Paid export is audited.
CREATE TABLE directory_export_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind directory_kind,
  row_count int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Later (phase 4): `job_postings.directory_entry_id uuid NULL` — canonical company link populated via the alias table; `company_details.is_hiring` maintained from it.

### 3.3 Migration C — conversation rail

```sql
CREATE TYPE thread_kind         AS ENUM ('comments', 'dm', 'group');
CREATE TYPE thread_subject_type AS ENUM ('document', 'directory_entry');

CREATE TABLE threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind thread_kind NOT NULL,
  subject_type thread_subject_type,
  subject_id uuid,                          -- polymorphic; app-enforced (deliberate: 2 subject types)
  title text,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Explicit partial unique index (per staff review — the invariant is
-- "one comments thread per subject", encoded, not implied by null semantics):
CREATE UNIQUE INDEX threads_comments_subject_uq
  ON threads (subject_type, subject_id)
  WHERE kind = 'comments';

CREATE TABLE thread_participants (
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body text NOT NULL,                       -- plain text + light markdown; never HTML
  parent_message_id uuid REFERENCES thread_messages(id) ON DELETE SET NULL,
  deleted_at timestamptz,                   -- soft delete → "[removed]" keeps reply chains intact
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX thread_messages_thread_time_idx ON thread_messages (thread_id, created_at);
```

- Comments thread auto-created on first comment (upsert on the partial unique index).
- One reply level only (replying to a reply → 400).
- `lobby_messages` untouched. DMs not built now; tables make them a route + UI task later.

### 3.4 Migration D — scrape bookkeeping

```sql
CREATE TABLE directory_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind directory_kind NOT NULL,
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'         -- {created, updated, expired, suppressed_skips, errors}
);
```

---

## 4. API surface (all PLANNED; existing worker, `/v1`)

### 4.1 Public + member

| Route | Auth | Behavior |
|---|---|---|
| `GET /v1/content/collections` | none | collections + published counts |
| `GET /v1/content/documents?type=&format=&collection=&tag=&q=&limit=&offset=` | optional | paged; excerpt-level fields only |
| `GET /v1/content/documents/:type/:slug` | optional | full doc **with gate applied** (§5.1); `gated`, `gate_reason` in response |
| `GET /v1/directory?kind=&category=&stage=&q=&limit=&offset=` | optional | paged entries + facets. **Never contains contact data — for any tier, including paid.** |
| `GET /v1/directory/:kind/:slug` | optional | entry + facet detail. **No contact values.** Includes `contact_state` (§5.2) + `reveals_available` |
| `POST /v1/directory/:id/reveal` | member | atomic quota burn (§5.2); returns contacts + `reveals_available`; structured `quota_exhausted` error with `upgrade_url` |
| `GET /v1/directory/:id/contacts` | entitled | **privileged read path** — requires `directory.contacts.unlimited` entitlement OR a prior reveal row; the only GET that emits contact values |
| `GET /v1/directory/export?kind=` | entitled | **privileged export** — requires `directory.contacts.export`; streams CSV; rate-limited (e.g. 4/day); writes `directory_export_events` audit row |
| `GET /v1/threads/:subjectType/:subjectId/messages` | optional | comments — **after subject-visibility check (§4.4)** |
| `POST /v1/threads/:subjectType/:subjectId/messages` | member | create comment/reply; auto-creates thread; rate limit 10/min/user; subject-visibility check first |
| `DELETE /v1/thread_messages/:id` | author/admin | soft delete |

### 4.2 Admin (existing `requireAdminUser`)

- `POST/PATCH/DELETE /v1/admin/content/documents` + `/collections` — CRUD, draft/publish, reorder
- `POST/PATCH/DELETE /v1/admin/directory/entries` (+ facet payloads) — CRUD
- `POST/DELETE /v1/admin/directory/contacts` — contact CRUD; delete offers "suppress" (tombstone + `directory_suppressions` hash) vs plain remove
- `POST /v1/admin/directory/suppressions` — takedown by value
- `PATCH /v1/admin/directory/sources/:id` — toggle the registry-level `enabled` kill switch, edit display fields
- `POST /v1/admin/directory/sync?kind=&source=` — manual scraper trigger; refuses disabled sources (registry checked before any fetch)
- `GET /v1/admin/directory/review/status` — verification stats
- `DELETE /v1/admin/thread_messages/:id` — moderation

### 4.3 Serialization rules (load-bearing)

- `publicDocument()` truncates `body_md` at the gate point on markdown block boundaries; full body not selected on anonymous paths.
- **The base directory repository has no join to `directory_contacts` at all** — list/detail serializers physically cannot emit contact values. Only the reveal/entitlement repository (used by `POST /reveal`, `GET /:id/contacts`, `GET /export`) touches that table, and it filters `suppressed_at IS NULL`.
- Comment authors serialize as `{profile_id, display_name, avatar_url}` from `profiles` — never raw user/email.

### 4.4 Comments inherit subject visibility (per staff review)

`GET/POST /v1/threads/:subjectType/:subjectId/messages` first resolves the subject and applies **the subject's own read rules** (document must be `published` and visible to this caller per its gate; directory entry must be `active`). Draft documents and hidden entries have no comment side-channel. 404 (not 403) on invisible subjects — same tenant-wall convention used elsewhere in the org.

---

## 5. Entitlement & gating

### 5.1 Documents (lead magnet)

```
public   → full body, everyone.
preview  → session? full. anonymous? body up to <!--more--> (fallback 30% of blocks),
           gated:true → FE fade-out + signup modal (the shipped JobReportSignupModal flow).
member   → session? full. anonymous? excerpt only.
```
Free account is the only gate for documents — they're top-of-funnel.

### 5.2 Directory contacts (metered)

**Contact states** (per entry, per caller): `none` (entry has no unsuppressed contacts — grants/resources usually; UI shows nothing), `hidden` (anonymous → signup modal), `revealable` (member with quota), `revealed` (already-revealed or entitled), `upgrade_required` (member, quota exhausted).

**Quota:** 5 reveals per rolling 30 days (`DIRECTORY_REVEAL_QUOTA` env — runtime capability, not schema). UI copy per staff review: **"3 reveals available"** + **"Next reveal refreshes Aug 24"** — never "this month"; a rolling window is not a month.

**Unlock semantic (explicit decision, per staff review): a reveal is an ENTRY-level unlock.** "You've unlocked Acme forever" — revealing an entry grants durable access to that entry's *current* contacts, including contacts added or replaced after the reveal. We are selling network intelligence about Atlanta entities, not per-contact credits (the Apollo model); the `(user_id, entry_id)` uniqueness key encodes this deliberately. Consequences accepted: a revealed entry whose contact roster improves later is a retention feature, not leakage; if a per-contact credit product is ever wanted, that is a new product decision requiring a schema change (authorization would move to `directory_contacts.id`), not a bug fix.

**Atomicity (per staff review).** Count-then-insert is racy, and the neon-http driver has no interactive transactions, so the quota check is one atomic statement using a statement-scoped advisory lock (a single statement is its own transaction; `pg_advisory_xact_lock` releases at commit; the cross-join forces the lock to be acquired before the count runs; a concurrent call for the same user blocks on the lock until the first statement commits, then counts the committed row):

```sql
WITH lock AS MATERIALIZED (        -- MATERIALIZED: the ordering is the point; make it unmistakable
  SELECT pg_advisory_xact_lock(hashtextextended('reveal:' || $user_id, 0)) AS acquired
),                                 -- hashtextextended → 64-bit key: no reason to accept
                                   -- the 32-bit collision domain of hashtext()
current_count AS (
  SELECT count(*) AS c
  FROM directory_reveals, lock
  WHERE user_id = $user_id
    AND revealed_at > now() - interval '30 days'
)
INSERT INTO directory_reveals (user_id, entry_id)
SELECT $user_id, $entry_id FROM current_count WHERE current_count.c < $quota
ON CONFLICT (user_id, entry_id) DO NOTHING
RETURNING id;
```
Zero rows returned + no pre-existing reveal row → quota exhausted (structured error). Pre-existing row (conflict) → free re-reveal. This is verified in dev with a concurrent-request test before phase 4 ships (the org has been bitten by read-then-act webhook races before; this class of bug is a known failure mode).

**Entitlements are positive capabilities (per staff review)** — never `tier != 'free'`:

```ts
// entitlements.ts — single derivation point from memberships (+ future programs/comps)
type Entitlement = 'directory.contacts.unlimited' | 'directory.contacts.export';
function entitlementsFor(membership: Membership | null): Set<Entitlement>
```
New tiers/comps/programs grant capabilities explicitly; nothing is authorized by "not being something."

### 5.3 Export contract (resolves the v1 contradiction)

Regular list/detail endpoints **never** include contacts for any tier. Paid access is expressed only through the two privileged routes (`GET /:id/contacts`, `GET /export`), each gated by its named entitlement, the export audited and rate-limited. The main directory query is never a PII firehose; accidental disclosure requires calling a route whose entire purpose is contact disclosure.

### 5.4 Comments

Read: everyone (subject-visibility permitting, §4.4). Write: signed-in members, rate-limited. Soft-deleted → "[removed]". Admin moderation in panel.

---

## 6. Scrapers & AI verification

### 6.1 Scrapers (per-source modules, cron-scheduled, `jobs-sync.ts` shape)

- Every scraper is registered in `directory_sources` and **checks the registry's `enabled` flag before fetching anything** — one switch disables a source (licensing change, poisoned data) with history retained. Row-level `directory_entry_sources.enabled` separately disables an individual bad provenance record. **"Government" is not encoded as "okay to scrape"; the registry + provenance is the policy mechanism.**
- Every scraped record writes/updates a `directory_entry_sources` row keyed by `(source, external_id)`; entries are created/merged from sources, not identified by name. `last_seen_at` drives expiry sweeps.
- Grant expiry respects the date-safe deadline semantics (§3.2): exact `deadline_at` when known; date-only deadlines stay active through end-of-day in the program's timezone (default America/New_York) — a grant is never marked closed hours early because a scraper stamped midnight UTC.
- Contact inserts check `directory_suppressions` by value hash first — takedowns survive re-syncs.
- Phase-2 grant/resource sources: Atlanta.gov economic development, Invest Atlanta, Georgia Innovates/GRA, SBIR/SBA Georgia, accelerator cohort pages, GA tax-credit pages. Static-page parsing; `grant_details.deadline` from listings.
- Phase-4 companies: **seeded from `job_postings` via the alias table** (normalized-name match, manual merge queue for ambiguity — never bare name equality); enrichment scrapes attach as additional sources. Investor/person contacts are **manually curated at first**; scraped contact data is the lowest-quality highest-liability input and the metering doesn't care how contacts got there.
- Safety rails: `MIN_SANE` floors before mass-expiry, per-run `directory_sync_runs` stats, manual admin trigger.

### 6.2 AI verification (second consumer of the Haiku batch rail)

Same fetch → deterministic → batch → apply loop as jobs (prerequisite: that rail reaching OPERATING, §2.1): grants "deadline passed/program closed?" → expire; companies/resources "page gone/rebranded?" → flag. Verdicts to `directory_entries.review`, `verified_at` badges in UI. Volume is hundreds vs ~5k jobs — incremental cost ≈ pennies.

### 6.3 Digest sections

New providers: "New grants this week" (deadline-sorted), "New on the blog." **Per staff review: section providers get stable string IDs now** (`jobs`, `events`, `grants`, `blog`) so per-member `subscribed_sections[]` preferences can arrive later without rearchitecting. One unsubscribe remains acceptable at this stage.

---

## 7. Frontend

### 7.1 Public routes

| Route | What |
|---|---|
| `/docs` | collection sidebar + doc list (`type='doc'`), format badges (guide/reference), search |
| `/docs/:slug` | doc page (canonical — no collection segment; docs move between collections without breaking URLs); gated fade-out → signup modal; `format='guide'` renders steps/difficulty header |
| `/blog` | post index (`type='post'`) — canonical route is `/blog`; "Frontier" may live on as editorial branding in the UI, never in the URL architecture |
| `/blog/:slug` | post page (react-markdown, **no `dangerouslySetInnerHTML`**), byline, comments |
| `/directory` | kind tabs, typed-facet filters (stage, category, deadline…), search |
| `/directory/:kind/:slug` | entry + facets; contact card driven by `contact_state` (renders nothing for `none`); ~~comments~~ **not at launch** (§7.6) |
| `/grants` | marketable alias for `/directory/grant` — deadline-sorted, "closing soon" badges |

Nav: drop "Open Source" from Solutions; add **Docs** there; **Blog** + **Directory** under Resources. (Dropdown panels were just fixed to viewport-fixed positioning; these are data edits.)

### 7.2 Reuse inventory (EXISTS)

`JobReportSignupModal`/`useJobReportSignup` (parameterized pitch copy per surface) · blog UI shells (`ArticleDetailPage`, `ArticleCard`, `ArticleTLDR`, `LatestArticles`) · admin patterns from `AdminJobsPage` · workers-og card pipeline. Add `react-markdown` + `remark-gfm`.

### 7.3 Admin CMS

- **Content tab:** documents table (type/format/status/collection filters), markdown editor + live preview, `<!--more-->` insert button, publish toggle, collection drag-order.
- **Directory tab:** entries by kind; facet forms per kind (schema-driven field maps); contacts sub-form visibly marked "metered — privileged data"; suppression action; sync-now + verification cards.
- **Moderation:** recent comments, soft-delete.

### 7.4 SEO architecture (new in v2 — the machinery §1.3's claims depend on)

The FE is a Vite SPA; SPAs don't do SEO by default. Decision, in layers:

1. **Meta layer (phase 1):** extend the existing OG-meta-injection worker (EXISTS, OPERATING for jobs) to all content/directory routes — dynamic `<title>`, meta description (from `excerpt`/`summary`), canonical URL, OG/Twitter tags, and JSON-LD structured data: `Article`/`BlogPosting` for posts, `HowTo` for `format='guide'`, `Organization` for companies, `MonetaryGrant` for grants.
2. **Sitemaps (phase 1):** API worker serves `/sitemap.xml` (index) + per-surface sitemaps generated from published slugs with `lastmod`; robots.txt references it. Member-only pages: `noindex`.
3. **Gated-page crawl policy (phase 1):** crawlers receive **exactly what anonymous users receive** — the preview text and the gate. No cloaking, no bot-special body. The preview *is* the indexable content; this is the standard freemium-content pattern and keeps us clean with Google.
4. **Rendering decision:** v1 ships **meta-injection + JSON-LD + sitemaps, no SSR**. Modern Google renders JS; the meta layer covers every other consumer (social, other engines' snippets). **Escalation trigger, decided now:** if Search Console shows document pages unindexed or rendered-empty after 30 days, phase 3 adds bot-targeted edge prerendering of document/directory pages (worker fetches the markdown and emits static HTML for crawler UAs — cheap because content is markdown in our own DB). Full SSR migration is explicitly out of scope.

### 7.5 Funnel instrumentation (new in v2)

The business thesis is a funnel; the build must measure it. Instrumentation = PostHog (org playbook EXISTS from Boomin: first-party proxy, capture at the app layer) with **server-side capture for entitlement events** (reveals/quota/export must be counted where they're enforced, not trusted to the client):

| Event | Fired | Props |
|---|---|---|
| `content_gate_viewed` | client | slug, type, format, surface |
| `content_gate_signup_started` | client | slug, surface |
| `signup_completed` | server | method (otp/google), source_surface |
| `directory_reveal_clicked` | client | entry_id, kind |
| `directory_reveal_completed` | **server** | entry_id, kind, reveals_remaining |
| `reveal_quota_exhausted` | **server** | entry_id |
| `upgrade_clicked` | client | from_surface |
| `upgrade_completed` | server | tier |
| `comment_posted` | server | subject_type |

Source/surface metadata on all of them. Phase acceptance criteria (§8) now include "events verified flowing" — the platform doesn't ship blind.

### 7.6 Directory comments: deferred (per staff review)

Comments launch **blog-only**. The thread rail makes directory comments trivial later; they must earn their moderation cost through demand, not ship because the database makes them cheap.

---

## 8. Rollout phases (reordered per staff review: optimize for learning the differentiated thesis)

**Phase 1 — content rail + minimal blog/docs.** Migrations A+C. Content CRUD + gated read API + subject-visibility comment rules. Minimal `/blog` + `/docs` (index/detail, gate, comments on posts). Admin content editor. SEO meta layer + sitemaps (§7.4.1–3). Funnel events for gate/signup. Nav changes. Seed: 2–3 posts mining the jobs dataset ("Atlanta AI hiring, by the numbers").
*Acceptance:* anon sees preview+fade+modal and crawlers see the same; member sees full; comment posts; draft docs 404 including their comment endpoint; sitemap serves; `content_gate_viewed → signup_completed` events verified flowing end-to-end.

**Phase 2 — grants & municipal resources.** Migrations B+D (directory core + facets + provenance + suppression scaffolding; contacts table created but unused). First two grant scrapers with `(source, external_id)` provenance, `/grants` + `/directory` (grant/resource kinds), deadline-expiry cron, digest `grants` section, JSON-LD `MonetaryGrant`. AI deadline-verification pass **if** the jobs rail is OPERATING by then; otherwise deterministic-only until it is.
*Acceptance (deterministically verifiable — per staff review, indexing itself is not a deployment criterion):* 50+ real grants with provenance rows; date-only deadline expires at end-of-day program-timezone (tested with a fixture, not clock-waiting); a registry-disabled source is refused by both cron and manual sync; digest section renders; grant pages emit valid canonical/meta/`MonetaryGrant` JSON-LD; URLs present in the generated sitemap and the sitemap is submitted/discoverable; pages return crawlable anonymous content.
*Operating metric (checked later, not at deploy):* Search Console discovery/indexation rate — this is the OPERATING state for the SEO layer.

**Phase 3 — richer docs/editorial.** Collections polish, guide format rendering (steps/difficulty), reference format, 5–10 gated guides ported from the AI-training curriculum, digest `blog` section, prerender escalation *if* Search Console triggers (§7.4.4).
*Acceptance:* collection nav; guides render `HowTo` JSON-LD; gate conversion measurable per-document.

**Phase 4 — companies/investors + contact monetization.** Company seed from `job_postings` via alias resolution + merge queue; curated investor entries; `directory_contacts` populated (curated); atomic reveal endpoint + quota UI ("N reveals available / refreshes <date>"); privileged contacts + export routes with entitlement registry; export audit; server-side reveal/quota/export events; pricing page update.
*Acceptance:* concurrent-reveal race test passes (two parallel requests at 4/5 → exactly one insert); free member exhausts quota → `upgrade_clicked` fires; entitled member reads contacts only via privileged routes (asserted: list/detail responses contain no contact fields for any tier); suppression survives a forced re-sync; export writes audit rows.

**Phase 5 (later) — member DMs** on `threads(kind='dm')` + participants. Route + UI only.

Each phase ships via the established runbook (migrate dev → verify local two-server stack → migrate prod → deploy worker → FE prod-env build + grep gates + wrangler pages deploy + live hash check).

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Reveal quota race | Atomic single-statement advisory-lock insert (§5.2) + concurrent test in phase-4 acceptance |
| Contact data liability | Separate `directory_contacts` repo boundary; curated-first sourcing; per-contact provenance; suppression registry that survives re-syncs; export audit |
| Gate leaks to anonymous | Serializer-level truncation, full body unselected on anon paths; test asserts anon/crawler response lacks post-marker text |
| Entity-resolution garbage in company seed | Alias table + merge queue; no name-equality joins; canonical `directory_entry_id` on jobs in phase 4 |
| JSONB creep | Facet tables for anything filtered/sorted; `attributes` display-only by rule; review checklist item |
| Comment side-channel on hidden content | Subject-visibility resolution before any thread read/write (§4.4), 404 convention |
| Comment spam | Member-only writes, rate limit, soft-delete moderation; approval queue only if needed |
| Polymorphic `subject_id` orphans | App-level existence check on creation; two subject types only; optional nightly sweep |
| Negative-entitlement drift | Positive capability registry (§5.2); adding tiers never implicitly grants |
| SEO thesis unmeasured | §7.4 decision + Search Console trigger; §7.5 events in acceptance criteria |
| Scraper licensing | Per-source `enabled` kill switch + provenance; no "public = free to scrape" assumption encoded |

## 10. Staff-review question resolutions (was "open questions")

1. **Reveal quota:** 5 / rolling 30 days initial; runtime-tunable; instrumented rather than theorized. Anonymous sees names/summaries/attributes (discovery + SEO preserved); contacts hidden. UI never says "this month" — "N reveals available · next refreshes <date>".
2. **Guide modeling:** neither a type nor a meta flag — `format` column (`article|guide|reference`) orthogonal to `type` (`doc|post`). Uniqueness is `(type, slug)` (v2.1: global uniqueness was an overcorrection); the API route carries `:type` and public URLs already disambiguate; canonical doc URL is `/docs/:slug` with collections as taxonomy, not URL identity.
3. **Naming:** canonical `/blog`; "Frontier" allowed as UI branding only.
4. **Directory comments:** blog-only at launch; directory comments must earn their moderation cost via demand.
5. **Grant scraping:** no "government = okay" assumption; provenance + per-source disable is the policy mechanism.
6. **Digest prefs:** one unsubscribe now; stable section IDs from day one so `subscribed_sections[]` is additive later.
