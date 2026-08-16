/**
 * Referral facts (task #23 hub) — the Head Hunter Program's metric emissions.
 *
 * When a REFERRED member's onboarding shows a qualifying fact, the referring
 * head hunter earns it as a tenant metric event on Boomin:
 *
 *   x:qualified_candidates — any confirmed persona whose role_details carry
 *     education bachelors|masters|doctorate (0028; the forms ask, we derive).
 *   x:revenue_startups     — a confirmed founder whose venture_stage is
 *     "revenue" (the onboarding's own vocabulary; "raising" is not revenue).
 *
 * Emission is idempotent per (user, fact): event ids are
 * `atlantium_candidate_<userId>` / `atlantium_startup_<userId>`, so re-running
 * on every role/details write is safe — Boomin dedupes on
 * (program, source, event_id) and each fact lands at most once, on the
 * HEAD HUNTER program's surface via the signed events channel. Positive
 * capability only: missing education, unknown stage, or no referral code emit
 * nothing. Never throws — this rides waitUntil off the write path.
 */

import { eq, inArray } from "drizzle-orm";
import { postProgramEvent } from "@boomin/server";
import type { Db } from "../db/client";
import { memberRoles, profiles, roleDetails, user } from "../db/schema";
import type { Env } from "../env";
import { partnerProgram } from "./partner-programs";

const QUALIFYING_EDUCATION = new Set(["bachelors", "masters", "doctorate"]);

export interface ReferralFactsResult {
  emitted: string[];
  skipped?: "no_referral" | "no_surface" | "no_user";
}

/** Pure: which facts does this member's local truth support? */
export function qualifyingFacts(input: {
  roles: Array<{ role: string; confirmedAt: Date | null; education?: string | null; ventureStage?: string | null }>;
}): Array<"qualified_candidate" | "revenue_startup"> {
  const facts: Array<"qualified_candidate" | "revenue_startup"> = [];
  const confirmed = input.roles.filter((r) => r.confirmedAt);
  if (confirmed.some((r) => r.education != null && QUALIFYING_EDUCATION.has(r.education))) {
    facts.push("qualified_candidate");
  }
  if (confirmed.some((r) => r.role === "founder" && r.ventureStage === "revenue")) {
    facts.push("revenue_startup");
  }
  return facts;
}

/**
 * Re-derive and emit this user's referral facts. Safe to call after any
 * role / role-details / onboarding write; each fact lands once, ever.
 */
export async function maybeEmitReferralFacts(db: Db, env: Env, userId: string): Promise<ReferralFactsResult> {
  try {
    const hunter = partnerProgram("head_hunter");
    const publicKey = hunter?.publicKey(env);
    const signingSecret = hunter?.signingSecret(env);
    if (!hunter || !publicKey || !signingSecret) return { emitted: [], skipped: "no_surface" };

    const [u] = await db
      .select({ referredByCode: user.referredByCode })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!u) return { emitted: [], skipped: "no_user" };
    if (!u.referredByCode) return { emitted: [], skipped: "no_referral" };

    const profileRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.ownerUserId, userId));
    const roleRows = profileRows.length
      ? await db
          .select({
            role: memberRoles.role,
            confirmedAt: memberRoles.confirmedAt,
            education: roleDetails.education,
            ventureStage: roleDetails.ventureStage,
          })
          .from(memberRoles)
          .leftJoin(roleDetails, eq(roleDetails.roleId, memberRoles.id))
          .where(inArray(memberRoles.profileId, profileRows.map((p) => p.id)))
      : [];

    const facts = qualifyingFacts({ roles: roleRows });
    const emitted: string[] = [];
    for (const fact of facts) {
      const [metricKey, eventId, eventType] = fact === "qualified_candidate"
        ? ["x:qualified_candidates", `atlantium_candidate_${userId}`, "qualified_candidate"]
        : ["x:revenue_startups", `atlantium_startup_${userId}`, "revenue_startup"];
      try {
        await postProgramEvent({
          issuer: "atlantium.ai",
          signingSecret,
          apiBase: (env.BOOMIN_CONNECT_API_BASE || "https://api.boomin.ai/v1/connect").replace(/\/+$/, ""),
          body: {
            event_id: eventId,
            event_type: eventType,
            publicKey,
            partner_ref: u.referredByCode,
            metric_key: metricKey,
            amount: 1,
            metadata: { source: "atlantium_onboarding", atlantiumUserId: userId },
          },
        });
        emitted.push(metricKey);
      } catch (error) {
        // Unknown code / Boomin outage / not enrolled on this program — the
        // member's own flow is unaffected; the next write retries.
        const code = (error as { code?: string }).code;
        if (code !== "referral_code_not_found") {
          console.error("referral fact emit failed", { userId, metricKey, code, message: (error as Error).message });
        }
      }
    }
    return { emitted };
  } catch (error) {
    console.error("referral facts crashed", { userId, message: (error as Error).message });
    return { emitted: [] };
  }
}
