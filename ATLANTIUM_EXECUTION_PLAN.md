# Atlantium — Execution plan to finish P1 and go live

**Written 2026-08-13.** Companion to `ATLANTIUM_NETWORK_PLAN.md` (architecture, v4).
That document says *what* and *why*; this one says *in what order, and how we know it worked*.

**Confirmed with the founder:** pricing is **$29/mo · $290/yr** (replacing $128/$399);
**conversations ship before discovery**, because accepting a request currently leads nowhere.

---

## 0. Where we actually are

Built, tested, **dev-only** — nothing below has touched production:

| Phase | Migration | Tests |
|---|---|---|
| P0A identity — `member_roles`, `professional_preferences`, persona onboarding | 0017 | 17 |
| P0B trust — `visibleSeekers()`, `verification_grants`, `org_memberships`, work-email OTP | 0018 | 24 |
| P1 spine — connections, blocks, DM requests, outreach budget | 0019 | 14 |
| P1b billing — Stripe checkout/portal/webhook, entitlements | 0020 | 13 |
| P1 frontend — `/network`, `/members/:id`, outreach dialog | — | browser-verified |

**68 automated + browser verification. Six migrations queued behind one deploy.**

In flight: a background session is configuring the Stripe **test-mode** sandbox (keys,
products, prices, webhook endpoint). Wave 1's billing UI depends on it.

---

## 1. The order, and why

Two constraints drive it. **DMs are inert without billing** — `dm.send` comes from a paid
tier, so the network loop cannot be exercised by a real member until checkout works. And
**accepting a request currently dead-ends** — there is no thread view, which is the worst
kind of half-feature: it invites an action and then abandons the user.

So Wave 1 closes the loop, Wave 2 puts it in front of real people, Wave 3 adds the parts
that only pay off once there are members to connect.

---

## Wave 1 — Close the loop (nothing new to design)

### S1 · Conversations
The dead end. `threads`/`thread_participants`/`thread_messages` already exist and DM
acceptance already writes to them; there is simply no way to read or reply.

- `GET /v1/threads` — the member's DM threads, newest activity first
- `GET /v1/threads/:id/messages`, `POST /v1/threads/:id/messages`
- **Authorization is the whole risk here**: participants only; a block severs an existing
  thread; 404 (never 403) for a thread you aren't in, so ids can't be probed
- FE: `/messages` list + thread view; accepting a request lands you *in* the conversation

**Acceptance:** a non-participant gets 404 on read and write; a block stops delivery both
directions; accepting a DM request opens the thread with the original message in it.
**Tests:** ~8, in `smoke-threads.ts`.

### S2 · DM policies, and the investor default
`dm_policies` is read by `canInitiate()` and written by nothing, so everyone sits on
`members`.

- `PATCH /v1/me/dm-policy` (`members` | `verified` | `introductions_only` | `nobody`)
- **Granting a verified investor role defaults them to `introductions_only`** — the comped
  side is protected by default, not by remembering to set it (§8.3)
- FE: one control in settings, plain-language

**Acceptance:** a new verified investor is `introductions_only` without touching settings;
a founder's request to them returns `intro_required`.
**Tests:** ~4, extending `smoke-network-loop.ts`.

### S3 · Navigation
`/network` and `/messages` exist only as URLs today.

- Member nav entries with pending counts (requests + unread)
- Profile links wherever a member name is rendered

**Acceptance:** a member can reach every P1 surface without typing a URL.

### S4 · Pricing surface + checkout
The money path, end to end.

- `/pricing` and the onboarding tier step move to **$29 / $290** — note `StepPricing`
  still hardcodes $128/$399 and its "Save $1,137" badge
- Wire both to `POST /v1/billing/checkout`; "Manage billing" → portal
- Handle `503 billing_unavailable` gracefully (keys not yet set is a normal state)

**Depends on:** the sandbox chip finishing, for real test price IDs.
**Acceptance:** a test-card checkout in Stripe test mode flips the member to `club`,
grants `dm.send`, and a DM sends — verified in a browser, not just by webhook replay.

---

## Wave 2 — Production rollout

The riskiest step in the plan, because it moves six migrations and a payment integration
at once. Sequenced so each stage is verifiable and independently revertible.

### R1 · Migrations (additive, low risk)
0017–0020 only **create** types, tables and columns. The running worker ignores them, so
they can land before any code deploy.

```
DATABASE_URL=<prod> npx tsx scripts/migrate.ts
```
**Verify:** all four applied; `\d member_roles`, `\d verification_grants` present;
existing endpoints still 200.
**Rollback:** none needed — nothing reads them yet.

### R2 · API worker
Deploy the worker. Every new endpoint is auth-gated, and `/billing/*` returns
`503 billing_unavailable` while keys are unset — a deliberate, graceful default.

**Verify on prod:** `/v1/me/roles` 401 unauthenticated; `/v1/billing/status` 200 for a
signed-in member showing `tier: free`; existing job/directory endpoints unchanged.
**Rollback:** `wrangler rollback`.

### R3 · Persona backfill
```
DATABASE_URL=<prod> npx tsx scripts/backfill-member-roles.ts          # dry run first
DATABASE_URL=<prod> npx tsx scripts/backfill-member-roles.ts --apply
```
Writes `source='inferred'`, `confirmed_at=NULL` — inference is never assertion, and
inferred personas grant no outreach rights.
**Verify:** counts match the dry run; spot-check that no row is `self_declared`.

### R4 · Stripe (test mode first, then live — deliberately separate)
1. Test keys + webhook endpoint on prod; run one test-card checkout end to end.
2. Only once that works: live keys, live prices, live webhook endpoint.

**Live-mode is a founder decision, not part of this rollout.** Until it happens, prod
billing stays `503` and DMs stay inert — which is the honest state, not a bug.

### R5 · Frontend
Per `CLAUDE.md`: build with prod env inlined, **grep the bundle** (no localhost strings,
prod URLs present), `wrangler pages deploy`, confirm the live hash changed.
**Verify:** new signup completes the persona-branched questionnaire; `/network` renders;
a free member sees the upgrade CTA.

### R6 · The founding-member question (decide before R5)
With live billing deferred, nobody can DM on prod. Two options:

- **(a) Comp early members** — grant `dm.send` via a `verification_grants`-style
  entitlement rather than a tier, exactly as investors are comped. Reversible, and it
  makes the network usable at launch.
- **(b) Ship it inert** — connections work, messages don't, until billing goes live.

Recommendation: **(a)**, capped and dated, so launch isn't gated on Stripe going live.

---

## Wave 3 — Once there are members

### S5 · Curated introductions
The one piece with an unrecoverable ordering constraint.

- Migration 0021: `introductions` (requester, target, facilitator, reason, status,
  outcome) **and `member_connections.introduction_id`**
- Two-sided acceptance auto-connects with `source='atlantium_intro'` **and the intro id** —
  `source` alone cannot reconstruct attribution later (§8A.7)
- No cooling-off after a two-sided accept — decided, §8A.4

**Acceptance:** the funnel query works — intros → accepted → conversations → outcomes.
**Tests:** ~6.

### S6 · Discovery
Deliberately last, and deliberately narrow.

- `GET /v1/members?q=&role=&org=` — entitlement-gated, returns only what a profile
  already shows, **never** seeking data
- Candidate search (the `visibleSeekers()` surface) stays out: it is a paid employer
  product and belongs with org seats in P2

**Acceptance:** an unentitled member gets 403; results never contain seeking fields;
`matched_only` members appear nowhere in search.
**Tests:** ~6, extending `smoke-visible-seekers.ts`.

---

## Dependencies

```
sandbox chip ──► S4 (pricing/checkout) ──► R4 ──► live billing (founder decision)
S1 conversations ──► S3 nav (badge counts)
R1 ──► R2 ──► R3 ──► R5
S5 intros needs member_connections (done) + introduction_id (0021)
```

Wave 1 slices are otherwise independent and can be built in any order.

---

## Risks, and what we do about them

| Risk | Response |
|---|---|
| **Six migrations in one deploy** | All additive; land them before any code (R1), so a worker rollback never leaves schema behind |
| **Billing bugs cost real money** | Test mode proven on prod before live keys; membership state only ever written by verified webhooks |
| **Launch with no usable DMs** | R6 comps, capped and dated |
| **Seeking privacy regression** | `smoke:seekers` is the guard; any new read path must go through `visibleSeekers()` — including S6 discovery |
| **Persona backfill mislabels people** | `inferred` + unconfirmed grants nothing; members confirm before it means anything |
| **`/signup` page hangs** (pre-existing) | Fix before R5 — it's on the main signup path and unrelated to this work |

---

## Definition of done for P1

- A member signs up, picks a persona, and completes a branched questionnaire.
- They find another member, connect or request a conversation, and **actually talk**.
- Their outreach is budgeted, their job search is invisible to their employer, and their
  investor inbox isn't mineable.
- They can pay, and paying grants exactly the capability it claims.
- Every one of those is covered by a test that fails loudly if it regresses.
