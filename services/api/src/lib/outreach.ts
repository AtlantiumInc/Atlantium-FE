import { and, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  dmPolicies,
  dmRequests,
  memberBlocks,
  memberConnections,
  memberRoles,
  orgMemberships,
  professionalPreferences,
  verificationGrants,
} from "../db/schema";
import { entitlementsFor } from "./entitlements";
import { SEEKING_STALE_DAYS } from "./seeking";

/**
 * Cold outreach: who may create a new edge in the network, and how often
 * (plan §8.2–8.6, §8A.5).
 *
 * The resource being rationed is NOT messages — it is attempts to create new
 * relationships. DM requests and connection requests therefore draw on one
 * `outreach_budget`; if connecting were free while messaging cost quota, the
 * cheap path to any inbox would just be a connection request.
 *
 * The authorization law, which is deliberately asymmetric:
 *
 *   GRANTS are contextual — you get only the rights of the persona you are
 *   acting as.
 *   RESTRICTIONS are cumulative WITHIN the protected surface they govern —
 *   holding a recruiter role anywhere binds your hiring-purpose contact with
 *   professionals, whichever hat you wear, but does not touch founder-to-founder
 *   peer contact.
 */

export const PENDING_LIMIT = 5;
export const MONTHLY_LIMIT = 20;
export const DECLINE_WINDOW = 10;
export const IGNORED_AFTER_DAYS = 14;

export type Purpose = "hiring" | "fundraising" | "advice" | "peer" | "intro";

export type InitiationDecision =
  | { allowed: true; connected: boolean }
  | { allowed: false; reason: string; message: string };

const deny = (reason: string, message: string): InitiationDecision => ({ allowed: false, reason, message });

/** Personas the member has actually confirmed. Inferred grants nothing (§5.3). */
async function confirmedRoles(db: Db, profileId: string) {
  return db
    .select()
    .from(memberRoles)
    .where(and(eq(memberRoles.profileId, profileId), sql`${memberRoles.confirmedAt} IS NOT NULL`));
}

async function liveGrantExists(db: Db, where: ReturnType<typeof and>, now: Date) {
  const [row] = await db
    .select({ id: verificationGrants.id })
    .from(verificationGrants)
    .where(and(
      where,
      isNull(verificationGrants.revokedAt),
      or(isNull(verificationGrants.expiresAt), gt(verificationGrants.expiresAt, now)),
    ))
    .limit(1);
  return Boolean(row);
}

export async function areConnected(db: Db, a: string, b: string) {
  const [row] = await db
    .select({ id: memberConnections.id })
    .from(memberConnections)
    .where(and(
      eq(memberConnections.status, "accepted"),
      or(
        and(eq(memberConnections.requesterProfileId, a), eq(memberConnections.recipientProfileId, b)),
        and(eq(memberConnections.requesterProfileId, b), eq(memberConnections.recipientProfileId, a)),
      ),
    ))
    .limit(1);
  return Boolean(row);
}

async function blockedBetween(db: Db, a: string, b: string) {
  const [row] = await db
    .select({ blocker: memberBlocks.blockerProfileId })
    .from(memberBlocks)
    .where(or(
      and(eq(memberBlocks.blockerProfileId, a), eq(memberBlocks.blockedProfileId, b)),
      and(eq(memberBlocks.blockerProfileId, b), eq(memberBlocks.blockedProfileId, a)),
    ))
    .limit(1);
  return Boolean(row);
}

/**
 * Budget is DERIVED from the request tables, never stored — a stored balance
 * can drift from reality, and this one decides who gets to bother whom.
 */
export async function outreachStatus(db: Db, profileId: string, userId: string) {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ignoredBefore = new Date(now.getTime() - IGNORED_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const [dmMonth, connMonth, dmPending, connPending, recent] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(dmRequests)
      .where(and(eq(dmRequests.fromProfileId, profileId), gt(dmRequests.createdAt, monthAgo))),
    db.select({ n: sql<number>`count(*)::int` }).from(memberConnections)
      .where(and(eq(memberConnections.requesterProfileId, profileId), gt(memberConnections.createdAt, monthAgo))),
    db.select({ n: sql<number>`count(*)::int` }).from(dmRequests)
      .where(and(eq(dmRequests.fromProfileId, profileId), eq(dmRequests.status, "pending"))),
    db.select({ n: sql<number>`count(*)::int` }).from(memberConnections)
      .where(and(eq(memberConnections.requesterProfileId, profileId), eq(memberConnections.status, "pending"))),
    db.select({ status: dmRequests.status, createdAt: dmRequests.createdAt }).from(dmRequests)
      .where(eq(dmRequests.fromProfileId, profileId))
      .orderBy(sql`${dmRequests.createdAt} DESC`).limit(DECLINE_WINDOW),
  ]);

  const monthlyUsed = (dmMonth[0]?.n ?? 0) + (connMonth[0]?.n ?? 0);
  const pendingUsed = (dmPending[0]?.n ?? 0) + (connPending[0]?.n ?? 0);

  // Declines cost budget and are never refunded, so spraying is irrational
  // rather than merely throttled. Ignored-for-14-days counts as a decline.
  const rejected = recent.filter((r) =>
    r.status === "declined" || (r.status === "pending" && r.createdAt < ignoredBefore)).length;
  const penalised = recent.length >= DECLINE_WINDOW && rejected * 2 > recent.length;

  const entitlements = await entitlementsFor(db, userId);
  const unlimited = entitlements.has("dm.send.unlimited");
  const mayInitiate = unlimited || entitlements.has("dm.send");

  return {
    mayInitiate,
    unlimited,
    penalised,
    pendingUsed,
    monthlyUsed,
    pendingLimit: unlimited ? null : PENDING_LIMIT,
    monthlyLimit: unlimited ? null : MONTHLY_LIMIT,
  };
}

/**
 * The single decision point for cold outreach. Both DM requests and connection
 * requests call it, which is what keeps them on one budget and one matrix.
 */
export async function canInitiate(
  db: Db,
  input: {
    actorProfileId: string;
    actorUserId: string;
    actingRoleId?: string | null;
    purpose: Purpose;
    recipientProfileId: string;
  },
): Promise<InitiationDecision> {
  const now = new Date();
  const { actorProfileId, recipientProfileId } = input;

  if (actorProfileId === recipientProfileId) return deny("self", "You can't reach yourself.");
  // Blocks always win, and are never disclosed to the blocked party — hence the
  // same generic message as an ordinary refusal.
  if (await blockedBetween(db, actorProfileId, recipientProfileId)) {
    return deny("not_available", "You can't reach this member.");
  }

  const connected = await areConnected(db, actorProfileId, recipientProfileId);

  const [policyRow] = await db.select().from(dmPolicies)
    .where(eq(dmPolicies.profileId, recipientProfileId)).limit(1);
  const accepts = policyRow?.accepts ?? "members";
  if (accepts === "nobody" && !connected) return deny("not_available", "You can't reach this member.");

  const [actorRoles, recipientRoles] = await Promise.all([
    confirmedRoles(db, actorProfileId),
    confirmedRoles(db, recipientProfileId),
  ]);

  // ── GRANTS: contextual. Rights come only from the acting persona. ─────────
  const actingRole = input.actingRoleId
    ? actorRoles.find((r) => r.id === input.actingRoleId)
    : actorRoles.find((r) => r.isPrimary) ?? actorRoles[0];

  if (!connected) {
    if (!actingRole) return deny("no_confirmed_role", "Confirm your role before reaching other members.");

    if (actingRole.role === "investor" || actingRole.role === "advisor") {
      // Broad reach must be earned: admin verification, not self-declaration.
      const verified = await liveGrantExists(db, and(
        eq(verificationGrants.memberRoleId, actingRole.id),
        eq(verificationGrants.verification, actingRole.role === "investor" ? "investor" : "advisor"),
      )!, now);
      if (!verified) {
        return deny("verification_required",
          `Your ${actingRole.role} role needs to be verified before you can reach other members.`);
      }
    }

    if (actingRole.role === "founder") {
      // Founder rights come from the org claim you already approve (§8.5).
      const [claim] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
        .where(and(
          eq(orgMemberships.profileId, actorProfileId),
          eq(orgMemberships.isCurrent, true),
          ne(orgMemberships.authority, "none"),
        )).limit(1);
      if (!claim) return deny("org_claim_required", "Claim your company before reaching other members as a founder.");
    }

    // Investors are the scarce side: nothing reaches them uninvited, and that
    // conversation is the monetized intro surface (§8.3).
    const recipientIsInvestor = recipientRoles.some((r) => r.role === "investor");
    if (recipientIsInvestor && actingRole.role !== "investor" && accepts !== "members") {
      return deny("intro_required", "Reach this investor through an Atlantium introduction.");
    }
    if (recipientIsInvestor && actingRole.role !== "investor" && accepts === "members") {
      // Even when open, only a verified advisor may cold-contact an investor.
      const advisorVerified = actingRole.role === "advisor";
      if (!advisorVerified) {
        return deny("intro_required", "Reach this investor through an Atlantium introduction.");
      }
    }
    if (accepts === "introductions_only") {
      return deny("intro_required", "This member only accepts Atlantium introductions.");
    }
  }

  // ── RESTRICTIONS: cumulative, but only within the surface they govern. ────
  // A recruiter role anywhere binds HIRING contact with professionals — even
  // acting as an investor. It does not touch founder-to-founder peer contact,
  // which is what made a blanket rule wrong (§8.6).
  if (input.purpose === "hiring") {
    const [recruiterHat] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
      .where(and(
        eq(orgMemberships.profileId, actorProfileId),
        eq(orgMemberships.isCurrent, true),
        or(
          inArray(orgMemberships.relationship, ["recruiter", "representative"]),
          inArray(orgMemberships.authority, ["hiring", "admin"]),
        ),
      )).limit(1);

    if (recruiterHat) {
      const staleBefore = new Date(now.getTime() - SEEKING_STALE_DAYS * 24 * 60 * 60 * 1000);
      const [exposed] = await db
        .select({ id: professionalPreferences.roleId })
        .from(professionalPreferences)
        .innerJoin(memberRoles, eq(memberRoles.id, professionalPreferences.roleId))
        .where(and(
          eq(memberRoles.profileId, recipientProfileId),
          inArray(professionalPreferences.seeking, ["open", "actively_looking"]),
          inArray(professionalPreferences.visibility, ["all_members", "verified_employers"]),
          gt(professionalPreferences.seekingUpdatedAt, staleBefore),
        ))
        .limit(1);
      if (!exposed) {
        // Deliberately the same generic refusal used elsewhere: the reply must
        // not reveal that someone is quietly looking, or that they are not.
        return deny("not_available", "You can't reach this member.");
      }
    }
  }

  if (connected) return { allowed: true, connected: true };

  const budget = await outreachStatus(db, actorProfileId, input.actorUserId);
  if (!budget.mayInitiate) {
    return deny("upgrade_required", "Starting new conversations is part of paid membership.");
  }
  if (budget.penalised) {
    return deny("outreach_paused", "Too many of your recent requests went unanswered. Outreach is paused.");
  }
  if (budget.pendingLimit !== null && budget.pendingUsed >= budget.pendingLimit) {
    return deny("too_many_pending", `Wait for some of your ${budget.pendingUsed} pending requests to be answered.`);
  }
  if (budget.monthlyLimit !== null && budget.monthlyUsed >= budget.monthlyLimit) {
    return deny("monthly_limit", "You've used this month's outreach budget.");
  }

  return { allowed: true, connected: false };
}
