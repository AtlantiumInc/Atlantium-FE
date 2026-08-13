import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Db } from "../db/client";
import { entitlementGrants, memberships } from "../db/schema";

/**
 * Entitlements are POSITIVE capabilities (plan §5.2). Never authorize with a
 * negative predicate like `tier !== 'free'` — as comps, programs, internal
 * accounts and legacy tiers appear, "anything except free" eventually grants
 * access to someone nobody intended.
 */
export type Entitlement =
  | "directory.contacts.unlimited"
  | "directory.contacts.export"
  /** Cold outreach — DM and connection requests share one budget (§8.4). */
  | "dm.send"
  | "dm.send.unlimited";

const TIER_GRANTS: Record<string, Entitlement[]> = {
  // Free members RECEIVE requests but never initiate them (§8.4).
  free: [],
  club: ["directory.contacts.unlimited", "directory.contacts.export", "dm.send"],
  club_annual: ["directory.contacts.unlimited", "directory.contacts.export", "dm.send"],
};

/** Statuses that keep a paid membership's capabilities alive. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function entitlementsFor(db: Db, userId: string, now = new Date()): Promise<Set<Entitlement>> {
  const [[membership], comps] = await Promise.all([
    db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1),
    // Comped capabilities (investors, founding members). A comp is a grant, not
    // a fake subscription — and it expires unless someone renews it.
    db
      .select({ entitlement: entitlementGrants.entitlement })
      .from(entitlementGrants)
      .where(and(
        eq(entitlementGrants.userId, userId),
        isNull(entitlementGrants.revokedAt),
        or(isNull(entitlementGrants.expiresAt), gt(entitlementGrants.expiresAt, now)),
      )),
  ]);

  const granted = new Set<Entitlement>(comps.map((c) => c.entitlement as Entitlement));

  if (membership) {
    const statusOk = membership.status ? LIVE_STATUSES.has(membership.status) : false;
    const inGrace = membership.gracePeriodEnd ? membership.gracePeriodEnd.getTime() > now.getTime() : false;
    if (statusOk || inGrace) {
      for (const e of TIER_GRANTS[membership.tier] ?? []) granted.add(e);
    }
  }

  return granted;
}

export async function hasEntitlement(db: Db, userId: string, entitlement: Entitlement) {
  return (await entitlementsFor(db, userId)).has(entitlement);
}
