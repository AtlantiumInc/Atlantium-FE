import { and, eq, isNull, or, gt } from "drizzle-orm";
import type { Db } from "../db/client";
import { verificationGrants } from "../db/schema";

/**
 * Verification is a GRANT with a lifecycle (plan §4.5), not a trust enum.
 *
 * Always read it through this module. Selecting `verification_grants` rows
 * directly is how expiry and revocation get forgotten — and a revoked
 * verification that still authorizes is the worst failure this system can have.
 */

export type VerificationType =
  | "identity"
  | "employment"
  | "org_authority"
  | "investor"
  | "advisor"
  | "domain";

export type EvidenceType =
  | "email_domain_otp"
  | "admin_review"
  | "member_vouch"
  | "external_profile"
  | "document"
  | "payment_instrument";

/** Exactly one of these identifies the subject — the DB enforces it too. */
export type GrantSubject =
  | { profileId: string }
  | { memberRoleId: string }
  | { orgMembershipId: string }
  | { directoryEntryId: string };

function subjectColumns(subject: GrantSubject) {
  return {
    profileId: "profileId" in subject ? subject.profileId : null,
    memberRoleId: "memberRoleId" in subject ? subject.memberRoleId : null,
    orgMembershipId: "orgMembershipId" in subject ? subject.orgMembershipId : null,
    directoryEntryId: "directoryEntryId" in subject ? subject.directoryEntryId : null,
  };
}

function subjectPredicate(subject: GrantSubject) {
  if ("profileId" in subject) return eq(verificationGrants.profileId, subject.profileId);
  if ("memberRoleId" in subject) return eq(verificationGrants.memberRoleId, subject.memberRoleId);
  if ("orgMembershipId" in subject) return eq(verificationGrants.orgMembershipId, subject.orgMembershipId);
  return eq(verificationGrants.directoryEntryId, subject.directoryEntryId);
}

/** A grant counts only while it is neither revoked nor expired. */
function liveGrant(now: Date) {
  return and(
    isNull(verificationGrants.revokedAt),
    or(isNull(verificationGrants.expiresAt), gt(verificationGrants.expiresAt, now)),
  );
}

export async function isVerified(
  db: Db,
  subject: GrantSubject,
  verification: VerificationType,
  now = new Date(),
): Promise<boolean> {
  const [row] = await db
    .select({ id: verificationGrants.id })
    .from(verificationGrants)
    .where(and(
      subjectPredicate(subject),
      eq(verificationGrants.verification, verification),
      liveGrant(now),
    ))
    .limit(1);
  return Boolean(row);
}

export async function grantVerification(
  db: Db,
  input: {
    subject: GrantSubject;
    verification: VerificationType;
    evidence: EvidenceType;
    evidenceRef?: string | null;
    grantedBy?: string | null;
    /** Advisor and investor grants should carry one — see §4.5. */
    expiresAt?: Date | null;
  },
) {
  const [row] = await db
    .insert(verificationGrants)
    .values({
      ...subjectColumns(input.subject),
      verification: input.verification,
      evidence: input.evidence,
      evidenceRef: input.evidenceRef ?? null,
      grantedBy: input.grantedBy ?? null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  return row;
}

/**
 * Revocation is a tombstone, never a delete: the record that trust was
 * withdrawn, and why, is itself evidence worth keeping.
 */
export async function revokeVerification(
  db: Db,
  subject: GrantSubject,
  verification: VerificationType,
  reason: string,
  now = new Date(),
) {
  const revoked = await db
    .update(verificationGrants)
    .set({ revokedAt: now, revokedReason: reason })
    .where(and(
      subjectPredicate(subject),
      eq(verificationGrants.verification, verification),
      isNull(verificationGrants.revokedAt),
    ))
    .returning({ id: verificationGrants.id });
  return revoked.length;
}
