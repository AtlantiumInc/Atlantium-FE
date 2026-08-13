import { and, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  memberRoles,
  orgMemberships,
  professionalPreferences,
  profiles,
  verificationGrants,
} from "../db/schema";

/**
 * THE sanctioned path to candidate visibility (plan §3.4, §8.7).
 *
 * Nothing else may join `professional_preferences.seeking`. The rule this
 * enforces is the load-bearing promise of the whole product:
 *
 *   Atlantium must never be usable as a covert database of hidden job seekers.
 *
 * Three invariants, all enforced here rather than trusted to callers:
 *
 *   1. `matched_only` (the default) and `private` are NEVER returned to another
 *      member. Atlantium may act on those signals — matching, intros, agent
 *      suggestions — but no member may query them.
 *   2. A member's current employers are excluded automatically, whether or not
 *      the member remembered to hide from them. Nobody should have to think of
 *      that themselves.
 *   3. A stale answer is not an answer. `seeking_updated_at` older than the
 *      staleness window is treated as unknown rather than as "still looking".
 */

export const SEEKING_STALE_DAYS = 90;

export type SeekerViewer = {
  /** The viewing member's profile. */
  profileId: string;
  /**
   * Admins deliberately do NOT bypass this helper. `matched_only` means "never
   * listed", and an admin-only backdoor into hidden job seekers is exactly the
   * shape of the incident this design exists to prevent. Admins who need the
   * data have database access and an audit trail; the product surface does not
   * get a bypass.
   */
  isAdmin?: boolean;
};

export type VisibleSeeker = {
  profileId: string;
  displayName: string;
  roleId: string;
  seeking: "open" | "actively_looking";
  seniority: string | null;
  stack: string[];
  targetTitles: string[];
  remotePref: string | null;
  minSalary: number | null;
  seekingUpdatedAt: string | null;
};

/** Orgs the viewer currently belongs to — the basis for employer exclusion. */
async function viewerOrgIds(db: Db, profileId: string): Promise<string[]> {
  const [fromMemberships, fromRoles] = await Promise.all([
    db
      .select({ entryId: orgMemberships.entryId })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.profileId, profileId), eq(orgMemberships.isCurrent, true))),
    db
      .select({ entryId: memberRoles.entryId })
      .from(memberRoles)
      .where(eq(memberRoles.profileId, profileId)),
  ]);
  const ids = new Set<string>();
  for (const r of fromMemberships) if (r.entryId) ids.add(r.entryId);
  for (const r of fromRoles) if (r.entryId) ids.add(r.entryId);
  return [...ids];
}

/**
 * Is the viewer a hiring authority whose authority has been *verified*?
 * Employment alone is not enough (§4.4): proving you work somewhere is not the
 * same as being authorized to hire for it.
 */
async function isVerifiedHiringAuthority(db: Db, profileId: string, now: Date): Promise<boolean> {
  const [row] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .innerJoin(verificationGrants, eq(verificationGrants.orgMembershipId, orgMemberships.id))
    .where(and(
      eq(orgMemberships.profileId, profileId),
      eq(orgMemberships.isCurrent, true),
      inArray(orgMemberships.authority, ["hiring", "admin"]),
      eq(verificationGrants.verification, "org_authority"),
      isNull(verificationGrants.revokedAt),
      or(isNull(verificationGrants.expiresAt), gt(verificationGrants.expiresAt, now)),
    ))
    .limit(1);
  return Boolean(row);
}

export async function visibleSeekers(
  db: Db,
  viewer: SeekerViewer,
  opts: { limit?: number } = {},
): Promise<VisibleSeeker[]> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - SEEKING_STALE_DAYS * 24 * 60 * 60 * 1000);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  const [excludedOrgIds, hiringAuthority] = await Promise.all([
    viewerOrgIds(db, viewer.profileId),
    isVerifiedHiringAuthority(db, viewer.profileId, now),
  ]);

  // verified_employers rows are reachable only by a verified hiring authority;
  // all_members by any member. matched_only and private are never listed.
  const allowedVisibility: Array<"all_members" | "verified_employers"> = hiringAuthority
    ? ["all_members", "verified_employers"]
    : ["all_members"];

  const rows = await db
    .select({
      profileId: profiles.id,
      displayName: profiles.displayName,
      roleId: memberRoles.id,
      seeking: professionalPreferences.seeking,
      seniority: professionalPreferences.seniority,
      stack: professionalPreferences.stack,
      targetTitles: professionalPreferences.targetTitles,
      remotePref: professionalPreferences.remotePref,
      minSalary: professionalPreferences.minSalary,
      seekingUpdatedAt: professionalPreferences.seekingUpdatedAt,
    })
    .from(professionalPreferences)
    .innerJoin(memberRoles, eq(memberRoles.id, professionalPreferences.roleId))
    .innerJoin(profiles, eq(profiles.id, memberRoles.profileId))
    .where(and(
      inArray(professionalPreferences.seeking, ["open", "actively_looking"]),
      inArray(professionalPreferences.visibility, allowedVisibility),
      // A stale flag is unknown, not "still looking".
      gt(professionalPreferences.seekingUpdatedAt, staleBefore),
      // Never surface the viewer to themselves.
      ne(memberRoles.profileId, viewer.profileId),
      // Employer exclusion: never expose a member to an org they belong to.
      excludedOrgIds.length > 0
        ? sql`NOT EXISTS (
            SELECT 1 FROM org_memberships om
            WHERE om.profile_id = ${memberRoles.profileId}
              AND om.is_current
              AND om.entry_id IN (${sql.join(excludedOrgIds.map((id) => sql`${id}::uuid`), sql`, `)})
          ) AND NOT EXISTS (
            SELECT 1 FROM member_roles mr2
            WHERE mr2.profile_id = ${memberRoles.profileId}
              AND mr2.entry_id IN (${sql.join(excludedOrgIds.map((id) => sql`${id}::uuid`), sql`, `)})
          )`
        : sql`true`,
    ))
    .limit(limit);

  return rows.map((r) => ({
    profileId: r.profileId,
    displayName: r.displayName,
    roleId: r.roleId,
    seeking: r.seeking as "open" | "actively_looking",
    seniority: r.seniority,
    stack: r.stack,
    targetTitles: r.targetTitles,
    remotePref: r.remotePref,
    minSalary: r.minSalary,
    seekingUpdatedAt: r.seekingUpdatedAt?.toISOString() ?? null,
  }));
}
