import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { memberships } from "../db/schema";

/**
 * Entitlements are POSITIVE capabilities (plan §5.2). Never authorize with a
 * negative predicate like `tier !== 'free'` — as comps, programs, internal
 * accounts and legacy tiers appear, "anything except free" eventually grants
 * access to someone nobody intended.
 */
export type Entitlement =
  | "directory.contacts.unlimited"
  | "directory.contacts.export";

const TIER_GRANTS: Record<string, Entitlement[]> = {
  free: [],
  club: ["directory.contacts.unlimited", "directory.contacts.export"],
  club_annual: ["directory.contacts.unlimited", "directory.contacts.export"],
};

/** Statuses that keep a paid membership's capabilities alive. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function entitlementsFor(db: Db, userId: string): Promise<Set<Entitlement>> {
  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  if (!membership) return new Set();

  const statusOk = membership.status ? LIVE_STATUSES.has(membership.status) : false;
  const inGrace = membership.gracePeriodEnd ? membership.gracePeriodEnd.getTime() > Date.now() : false;
  if (!statusOk && !inGrace) return new Set();

  return new Set(TIER_GRANTS[membership.tier] ?? []);
}

export async function hasEntitlement(db: Db, userId: string, entitlement: Entitlement) {
  return (await entitlementsFor(db, userId)).has(entitlement);
}
