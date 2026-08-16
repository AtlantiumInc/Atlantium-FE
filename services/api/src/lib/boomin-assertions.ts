/**
 * Boomin assertion sync (plan Part B, B1) — Atlantium's private truth,
 * projected as claim-addressed assertions on the Boomin relationship.
 *
 * DOCTRINE. Assertions are SEMANTIC PROJECTIONS, never mirrored records: we
 * assert outcomes ("advisor_verified"), not the evidence behind them, and the
 * SEEKING STATUS IS EXCLUDED WHOLESALE — a member's job-seeking state is
 * privacy-bound and never leaves Atlantium, in any encoding.
 *
 * MECHANICS. Stateless full upsert per profile: compute the desired claim set
 * from local truth, assert every desired key, revoke every MANAGED key not
 * desired. Safe to repeat — Boomin's assert is idempotent by content (200
 * unchanged / 201 changed; a refreshed expiry is a new event on the same
 * claim), and revoking an absent claim is a no-op. MANAGED_ASSERTION_KEYS is
 * the revoke boundary: keys outside it are never touched, so other writers
 * can share the namespace.
 *
 * FAILURE. Never throws — sync is best-effort off the write path (waitUntil),
 * and the nightly reconcile heals anything a lossy forward missed.
 * BOOMIN_PLATFORM_SECRET absent = INERT (deploy-order safe).
 */

import { and, eq, inArray, isNull } from "drizzle-orm";
import { assert as assertClaim, revokeAssertion } from "@boomin/server";
import type { Db } from "../db/client";
import {
  memberRoles,
  memberships,
  orgMemberships,
  profiles,
  verificationGrants,
} from "../db/schema";
import type { Env } from "../env";
import { profileExternalUserId } from "./partner-standing";

export const BOOMIN_ASSERTION_ISSUER = "atlantium.ai";

/** The revoke boundary — every key this sync may assert OR revoke. */
export const MANAGED_ASSERTION_KEYS = [
  "persona_investor",
  "persona_professional",
  "persona_founder",
  "persona_advisor",
  "investor_verified",
  "advisor_verified",
  "identity_verified",
  "employment_verified",
  "org_authority_verified",
  "club_member",
] as const;

export type ManagedAssertionKey = (typeof MANAGED_ASSERTION_KEYS)[number];

/** Person-level verification types that project. `domain` is org-plumbing and
 *  deliberately absent. */
const VERIFIED_KEY_BY_TYPE: Record<string, ManagedAssertionKey> = {
  investor: "investor_verified",
  advisor: "advisor_verified",
  identity: "identity_verified",
  employment: "employment_verified",
  org_authority: "org_authority_verified",
};

export interface DesiredAssertionInput {
  /** The profile's member_roles rows (any source). */
  roles: Array<{ role: string; confirmedAt: Date | null }>;
  /** LIVE verification grants across the profile's subject rows. */
  grants: Array<{ verification: string; expiresAt: Date | null }>;
  /** The owning user's membership tier — null/undefined reads as free.
   *  Pass ONLY for the user's default profile (user-scoped fact). */
  membershipTier?: string | null;
}

/**
 * Pure: local truth → the desired claim set. Values are `true`; a claim
 * carries `expiresAt` when the underlying grant expires (forwarded so Boomin
 * decays the claim in lockstep — re-verification refreshes it, which is a new
 * event extending the same claim).
 */
export function desiredAssertions(input: DesiredAssertionInput): Partial<Record<ManagedAssertionKey, { value: true; expiresAt?: string }>> {
  const desired: Partial<Record<ManagedAssertionKey, { value: true; expiresAt?: string }>> = {};

  // Confirmed personas. `confirmed_at` is the member's own assertion of the
  // role — inferred rows never carry it until the member re-declares.
  for (const role of input.roles) {
    if (!role.confirmedAt) continue;
    const key = `persona_${role.role}` as ManagedAssertionKey;
    if ((MANAGED_ASSERTION_KEYS as readonly string[]).includes(key)) desired[key] = { value: true };
  }

  // Live verification grants → <type>_verified, FORWARDING expiry. Several
  // live grants of one type: a non-expiring grant wins; otherwise the furthest
  // expiry does.
  for (const grant of input.grants) {
    const key = VERIFIED_KEY_BY_TYPE[grant.verification];
    if (!key) continue;
    const existing = desired[key];
    if (existing && !existing.expiresAt) continue; // already non-expiring
    if (!grant.expiresAt) {
      desired[key] = { value: true };
    } else if (!existing || (existing.expiresAt && new Date(existing.expiresAt) < grant.expiresAt)) {
      desired[key] = { value: true, expiresAt: grant.expiresAt.toISOString() };
    }
  }

  // Club membership (user-scoped; the caller passes the tier only for the
  // default profile). Positive capability: unknown tiers grant nothing.
  if (input.membershipTier && input.membershipTier !== "free") {
    desired.club_member = { value: true };
  }

  // NO seeking status. Ever. (Privacy invariant — see the header.)
  return desired;
}

/** Persona precedence for the operating capacity at handoff (plan B2):
 *  the scarcest, most-vetted capacity wins. Undefined when nothing confirmed. */
export function primaryOperatingType(roles: Array<{ role: string; confirmedAt: Date | null }>): string | undefined {
  const confirmed = new Set(roles.filter((r) => r.confirmedAt).map((r) => r.role));
  for (const role of ["advisor", "investor", "founder", "professional"]) {
    if (confirmed.has(role)) return role;
  }
  return undefined;
}

// ── Data plumbing ─────────────────────────────────────────────────────────────

async function loadLocalTruth(db: Db, profileId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return null;

  const roleRows = await db
    .select({ id: memberRoles.id, role: memberRoles.role, confirmedAt: memberRoles.confirmedAt })
    .from(memberRoles)
    .where(eq(memberRoles.profileId, profileId));
  const orgRows = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(eq(orgMemberships.profileId, profileId));

  // Live grants across every subject shape this profile owns (profile-,
  // role-, and org-membership-addressed). Expiry is enforced here AND
  // forwarded — an expired grant must not re-assert.
  const now = new Date();
  const grantRows = (
    await db
      .select({
        verification: verificationGrants.verification,
        expiresAt: verificationGrants.expiresAt,
        profileId: verificationGrants.profileId,
        memberRoleId: verificationGrants.memberRoleId,
        orgMembershipId: verificationGrants.orgMembershipId,
      })
      .from(verificationGrants)
      .where(isNull(verificationGrants.revokedAt))
  ).filter((grant) =>
    (grant.profileId === profileId
      || (grant.memberRoleId != null && roleRows.some((r) => r.id === grant.memberRoleId))
      || (grant.orgMembershipId != null && orgRows.some((o) => o.id === grant.orgMembershipId)))
    && (!grant.expiresAt || grant.expiresAt > now),
  );

  // Membership is USER-scoped; it projects only through the user's DEFAULT
  // profile — the one handoffs enroll (multi-profile note, plan Part B).
  const [defaultProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.ownerUserId, profile.ownerUserId), eq(profiles.type, "personal")))
    .orderBy(profiles.createdAt)
    .limit(1);
  let membershipTier: string | null = null;
  if (defaultProfile?.id === profileId) {
    const [membership] = await db
      .select({ tier: memberships.tier })
      .from(memberships)
      .where(eq(memberships.userId, profile.ownerUserId))
      .limit(1);
    membershipTier = membership?.tier ?? null;
  }

  return { profile, roles: roleRows, grants: grantRows, membershipTier };
}

// ── The sync ──────────────────────────────────────────────────────────────────

export interface AssertionSyncResult {
  ok: boolean;
  skipped?: "no_secret" | "no_profile";
  asserted?: number;
  revoked?: number;
  failed?: number;
}

/**
 * Full stateless upsert of one profile's managed claims. Never throws.
 * Sequential on purpose — each change re-evaluates standing on Boomin's side,
 * and ten small ordered calls beat a burst.
 */
export async function syncProfileAssertions(db: Db, env: Env, profileId: string): Promise<AssertionSyncResult> {
  if (!env.BOOMIN_PLATFORM_SECRET) return { ok: true, skipped: "no_secret" };
  try {
    const truth = await loadLocalTruth(db, profileId);
    if (!truth) return { ok: true, skipped: "no_profile" };
    const desired = desiredAssertions(truth);

    const auth = {
      secretKey: env.BOOMIN_PLATFORM_SECRET,
      ...(env.BOOMIN_PLATFORM_API_BASE ? { platformApiBase: env.BOOMIN_PLATFORM_API_BASE } : {}),
      externalUserId: profileExternalUserId(truth.profile),
      issuer: BOOMIN_ASSERTION_ISSUER,
    };

    let asserted = 0;
    let revoked = 0;
    let failed = 0;
    for (const key of MANAGED_ASSERTION_KEYS) {
      const want = desired[key];
      try {
        if (want) {
          await assertClaim({ ...auth, key, value: true, ...(want.expiresAt ? { expiresAt: want.expiresAt } : {}) });
          asserted += 1;
        } else {
          await revokeAssertion({ ...auth, key });
          revoked += 1;
        }
      } catch (error) {
        // entity_not_found = the profile has never handed off — nothing to
        // project onto yet; the reconcile catches them after they enroll.
        failed += 1;
        const code = (error as { code?: string }).code;
        if (code !== "entity_not_found") {
          console.error("boomin assertion sync failed", { profileId, key, code, message: (error as Error).message });
        }
        if (code === "entity_not_found") break; // same subject for every key
      }
    }
    return { ok: failed === 0, asserted, revoked, failed };
  } catch (error) {
    console.error("boomin assertion sync crashed", { profileId, message: (error as Error).message });
    return { ok: false, failed: MANAGED_ASSERTION_KEYS.length };
  }
}

/** Sync the DEFAULT profile of one user — the shape membership changes need
 *  (memberships are user-scoped; the default profile is what handoffs enroll). */
export async function syncUserAssertions(db: Db, env: Env, userId: string): Promise<AssertionSyncResult> {
  if (!env.BOOMIN_PLATFORM_SECRET) return { ok: true, skipped: "no_secret" };
  const [defaultProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.ownerUserId, userId), eq(profiles.type, "personal")))
    .orderBy(profiles.createdAt)
    .limit(1);
  if (!defaultProfile) return { ok: true, skipped: "no_profile" };
  return syncProfileAssertions(db, env, defaultProfile.id);
}

/**
 * Nightly reconcile (cron "0 4 * * *"): re-sync every personal profile.
 * Tenant→Boomin forwards are LOSSY BY ACCEPTANCE (a waitUntil can die with a
 * worker); state-aware re-assertion makes that safe — identical state no-ops,
 * changed state appends.
 */
export async function reconcileAllAssertions(db: Db, env: Env): Promise<{ profiles: number; failed: number; skipped?: string }> {
  if (!env.BOOMIN_PLATFORM_SECRET) return { profiles: 0, failed: 0, skipped: "no_secret" };
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.type, "personal"))
    .orderBy(profiles.createdAt);
  let failed = 0;
  for (const row of rows) {
    const result = await syncProfileAssertions(db, env, row.id);
    if (!result.ok) failed += 1;
  }
  return { profiles: rows.length, failed };
}
