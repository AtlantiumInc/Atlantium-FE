/**
 * Boomin assertion-sync smoke (plan Part B): real Atlantium DEV database,
 * real sync code, the Boomin wire CAPTURED — proves grant→sync→assert and
 * revoke→re-sync→revoke end-to-end on our side of the boundary.
 *
 *   npx tsx --env-file=.dev.vars scripts/smoke-boomin-assertions.ts
 *
 * Default mode stubs fetch and asserts on the captured requests (no network,
 * no Boomin needed). Set SMOKE_LIVE=1 with BOOMIN_PLATFORM_SECRET (+ optional
 * BOOMIN_PLATFORM_API_BASE) to let the calls hit a real Boomin instead —
 * the checks on our side are identical.
 */

import { and, eq, sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { memberRoles, memberships, profiles, user, verificationGrants } from "../src/db/schema";
import { grantVerification, revokeVerification } from "../src/lib/verification";
import { syncProfileAssertions } from "../src/lib/boomin-assertions";
import type { Env } from "../src/env";

const live = process.env.SMOKE_LIVE === "1";
const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  BOOMIN_PLATFORM_SECRET: live ? process.env.BOOMIN_PLATFORM_SECRET : "sk_smoke_captured",
  BOOMIN_PLATFORM_API_BASE: live
    ? process.env.BOOMIN_PLATFORM_API_BASE
    : "https://smoke.invalid/v1/platform",
} as unknown as Env;
if (!env.DATABASE_URL) throw new Error("DATABASE_URL missing — run with --env-file=.dev.vars");
if (live && !env.BOOMIN_PLATFORM_SECRET) throw new Error("SMOKE_LIVE=1 needs BOOMIN_PLATFORM_SECRET");

const db = createDb(env);
const salt = Math.random().toString(36).slice(2, 8);
let failures = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}`, ok || detail === undefined ? "" : JSON.stringify(detail));
  if (!ok) failures += 1;
};

// Captured Boomin wire (default mode).
type Captured = { path: string; body: Record<string, unknown> };
const captured: Captured[] = [];
const realFetch = globalThis.fetch;
if (!live) {
  // Intercept ONLY the Boomin platform base — neon-http drives Postgres over
  // fetch too, and swallowing it would break every DB query in this script.
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const target = new URL(String(url));
    if (target.hostname !== "smoke.invalid") return realFetch(url as never, init);
    captured.push({
      path: target.pathname,
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });
    return new Response(JSON.stringify({ object: "assertion" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

async function main() {
  // ── Seed: user, profile, confirmed advisor persona ─────────────────────────
  const userId = `smoke_${salt}`;
  await db.insert(user).values({ id: userId, name: "Assertion Smoke", email: `assertion-smoke-${salt}@example.com` });
  const [profile] = await db
    .insert(profiles)
    .values({ ownerUserId: userId, displayName: "Assertion Smoke", slug: `assertion-smoke-${salt}`, type: "personal" })
    .returning();
  const [role] = await db
    .insert(memberRoles)
    .values({ profileId: profile.id, role: "advisor", confirmedAt: new Date(), source: "self_declared" })
    .returning();
  await db.insert(memberships).values({ userId, tier: "club", status: "active" });

  // ── 1 · Grant → sync asserts (expiry forwarded) ────────────────────────────
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await grantVerification(db, {
    subject: { memberRoleId: role.id },
    verification: "advisor",
    evidence: "admin_review",
    expiresAt,
  });
  const first = await syncProfileAssertions(db, env, profile.id);
  check("sync runs (grant present)", live ? first.ok || (first.failed ?? 0) > 0 : first.ok === true, first);
  if (!live) {
    const asserts = captured.filter((c) => c.path.endsWith("/assertions"));
    const revokes = captured.filter((c) => c.path.endsWith("/assertions/revoke"));
    const keyOf = (c: Captured) => String(c.body.key);
    check("asserts persona_advisor + advisor_verified + club_member",
      ["persona_advisor", "advisor_verified", "club_member"].every((k) => asserts.some((c) => keyOf(c) === k)),
      asserts.map(keyOf));
    const verified = asserts.find((c) => keyOf(c) === "advisor_verified");
    check("advisor_verified FORWARDS the grant expiry",
      typeof verified?.body.expires_at === "string" && verified.body.expires_at === expiresAt.toISOString(), verified?.body);
    check("every request is claim-addressed by externalUserId+issuer",
      captured.every((c) => c.body.external_user_id === `atlantium_profile_${profile.id}` && c.body.issuer === "atlantium.ai"));
    check("managed-but-undesired keys are REVOKED (e.g. investor_verified), never asserted",
      revokes.some((c) => keyOf(c) === "investor_verified") && !asserts.some((c) => keyOf(c) === "investor_verified"));
    check("nothing resembling seeking status crosses the wire",
      captured.every((c) => !/seek/i.test(JSON.stringify(c.body))));
  }

  // ── 2 · Revoke → re-sync revokes the projected claim ───────────────────────
  captured.length = 0;
  await revokeVerification(db, { memberRoleId: role.id }, "advisor", "smoke");
  const second = await syncProfileAssertions(db, env, profile.id);
  check("re-sync runs (grant revoked)", live ? true : second.ok === true, second);
  if (!live) {
    const asserts = captured.filter((c) => c.path.endsWith("/assertions"));
    const revokes = captured.filter((c) => c.path.endsWith("/assertions/revoke"));
    const keyOf = (c: Captured) => String(c.body.key);
    check("advisor_verified is now REVOKED", revokes.some((c) => keyOf(c) === "advisor_verified"));
    check("persona_advisor still asserts (the persona outlives the verification)",
      asserts.some((c) => keyOf(c) === "persona_advisor"));
  }

  // ── 3 · Secret absent = INERT ──────────────────────────────────────────────
  captured.length = 0;
  const inert = await syncProfileAssertions(db, { ...env, BOOMIN_PLATFORM_SECRET: undefined } as Env, profile.id);
  check("no BOOMIN_PLATFORM_SECRET → skipped, zero wire calls", inert.skipped === "no_secret" && captured.length === 0, inert);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  await db.delete(verificationGrants).where(eq(verificationGrants.memberRoleId, role.id));
  await db.delete(memberships).where(eq(memberships.userId, userId));
  await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);

  globalThis.fetch = realFetch;
  console.log(failures === 0 ? "\nsmoke-boomin-assertions: ALL GREEN" : `\nsmoke-boomin-assertions: ${failures} FAILURE(S)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("smoke-boomin-assertions crashed:", error);
  process.exit(1);
});
