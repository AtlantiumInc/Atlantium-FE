import { zValidator } from "@hono/zod-validator";
import { getPartnerStanding, postHandoff, recordReferralClick, recordSignup } from "@boomin/server";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { sendOtpEmail } from "../lib/email";
import { grantVerification, revokeVerification } from "../lib/verification";
import { areConnected, canInitiate, outreachStatus } from "../lib/outreach";
import { entitlementsFor } from "../lib/entitlements";
import {
  attachPaymentMethod,
  createSetupIntent,
  createSubscription,
  ensureCustomer,
  createCheckoutSession,
  createOneTimeCheckout,
  createPortalSession,
  getSubscription,
  normalizeStatus,
  tierForPrice,
  verifyWebhookSignature,
  type StripeSubscription,
} from "../lib/stripe";
import {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  candidateOrgsForDomain,
  generateCode,
  hashCode,
  isFreeMailDomain,
  latestPendingVerification,
  normalizeDomain,
} from "../lib/work-email";
import { createDb } from "../db/client";
import type { Db } from "../db/client";
import { captureEvent } from "./content";
import { runReviewCycle, reviewStatus } from "../lib/jobs-review";
import { syncJobPostings } from "../lib/jobs-sync";
import {
  buildSections,
  renderDigest,
  sendWeeklyDigest,
  unsubscribeUrl,
  verifyUnsubscribeSig,
} from "../lib/digest";
import {
  digestSuppressions,
  jobPostings,
  lobbyEventAttendance,
  lobbyEvents,
  lobbyMessages,
  lobbyRoomRoles,
  lobbyRooms,
  memberships,
  profileMembers,
  profiles,
  memberRoles,
  orgMemberships,
  workEmailVerifications,
  verificationGrants,
  memberConnections,
  memberBlocks,
  dmPolicies,
  dmRequests,
  introductions,
  orgRequests,
  serviceRequests,
  entitlementGrants,
  billingEvents,
  threads,
  threadParticipants,
  threadMessages,
  professionalPreferences,
  roleDetails,
  directoryEntries,
  user,
  verification,
} from "../db/schema";
import type { Env } from "../env";
import { adminEmails, isDebugAuthCodes, requireEnv } from "../env";
import { createAuth, getAuthSession } from "../lib/auth";
import { SERVICES, notifyServiceRequest } from "../lib/service-requests";
import { sendWelcomeEmail } from "../lib/welcome-email";
import { HttpError } from "../lib/http";
import {
  getRecord,
  getString,
  localPartnerExternalUserId,
  profileExternalUserId,
} from "../lib/partner-standing";
import {
  ensureDefaultProfile,
  listProfiles,
  publicUser,
  setActiveProfile,
  slugify,
} from "../lib/profiles";

export const appRoutes = new Hono<{ Bindings: Env }>();

// Membership is open — signups are auto-approved. Two server-side conditions
// still guard member surfaces:
//   1. suspension (is_approved flipped off by an admin after the fact)
//   2. the questionnaire — every member completes onboarding before they get
//      member value (the lab, apply links, contact reveals).
// Admins bypass both.
export async function ensureMemberInGoodStanding(c: Context<{ Bindings: Env }>) {
  const { db, authUser } = await requireAppUser(c);
  if (authUser.isAdmin) return;
  if (!authUser.isApproved) {
    throw new HttpError(403, "account_suspended", "This account has been suspended.");
  }
  const profile = await ensureDefaultProfile(db, authUser);
  const reg = (profile.registrationDetails ?? {}) as Record<string, unknown>;
  const done = Boolean(profile.onboardingCompletedAt) || reg.is_completed === true;
  if (!done) {
    throw new HttpError(403, "onboarding_required", "Complete your member questionnaire to continue.");
  }
}
/**
 * Non-throwing counterpart to ensureMemberInGoodStanding, for endpoints that
 * serialize a public payload and simply omit member-only fields. Same rule:
 * approved AND questionnaire complete (admins bypass).
 */
export async function hasMemberBenefits(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const session = await getAuthSession(c.env, c.req.raw);
  const userId = session?.user?.id;
  if (!userId) return false;
  const db = createDb(c.env);
  const [account] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!account) return false;
  if (account.isAdmin) return true;
  if (!account.isApproved) return false;
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.ownerUserId, userId))
    .limit(1);
  if (!profile) return false;
  const reg = (profile.registrationDetails ?? {}) as Record<string, unknown>;
  return Boolean(profile.onboardingCompletedAt) || reg.is_completed === true;
}

for (const pattern of ["/lobby", "/lobby/*", "/realtime/*", "/dashboard/*"]) {
  appRoutes.use(pattern, async (c, next) => {
    await ensureMemberInGoodStanding(c);
    await next();
  });
}

/**
 * Admin auth runs as MIDDLEWARE, before body validation.
 *
 * Each admin handler still calls requireAdminUser() for its db/authUser, but
 * zValidator runs before the handler — so without this, an anonymous POST with
 * a bad body got a 400 schema error instead of a 401. No data leaked, but it
 * answered a question the caller hadn't earned: that the route exists and what
 * it expects. One gate here covers every current and future /admin route,
 * rather than depending on each one being written in the right order.
 */
appRoutes.use("/admin/*", async (c, next) => {
  await requireAdminUser(c);
  await next();
});

const emailSchema = z.string().email().transform((value) => value.trim().toLowerCase());
const lobbyMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
const lobbyTargetSchema = z.object({
  target_user_id: z.string().trim().min(1),
  track_type: z.enum(["audio", "video"]).optional(),
});
const lobbySpotlightSchema = z.object({
  target_user_id: z.string().trim().min(1).nullable().optional(),
});

const BOOMIN_ISSUER = "atlantium.ai";
const BOOMIN_AUDIENCE = "boomin.ai";
const BOOMIN_HANDOFF_EXPIRES_IN = 5 * 60;
const FREE_PUBLISH_COOLDOWN_DAYS = 14;
const LOBBY_MESSAGE_LIMIT = 80;

type BoominSdkError = Error & {
  status?: number;
  code?: string;
  response?: Record<string, unknown>;
};

type LocalBoominAppMember = Record<string, unknown> & {
  partner?: Record<string, unknown> | null;
  instagram?: Record<string, unknown> | null;
  partnerConnection?: Record<string, unknown> | null;
  tier?: Record<string, unknown> | null;
  qualification?: Record<string, unknown> | null;
  rollups?: Array<Record<string, unknown>>;
};

appRoutes.post(
  "/auth/otp",
  zValidator("json", z.object({ email: emailSchema })),
  async (c) => {
    const body = c.req.valid("json");
    const response = await proxyAuthRequest(c, "/api/auth/email-otp/send-verification-otp", {
      email: body.email,
      type: "sign-in",
    });
    if (response.ok && isDebugAuthCodes(c.env)) {
      await forceDebugOtp(c.env, body.email);
    }
    return response;
  },
);

appRoutes.post(
  "/auth/verify",
  zValidator("json", z.object({
    email: emailSchema,
    code: z.string().trim().min(4),
    name: z.string().trim().optional(),
    // Referral attribution: the frontend forwards the stored ?ref code here.
    referral_code: z.string().trim().optional(),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const otp = isDebugAuthCodes(c.env) && body.code === "123456"
      ? await getStoredOtp(c.env, body.email) ?? body.code
      : body.code;
    const signInResponse = await proxyAuthRequest(c, "/api/auth/sign-in/email-otp", {
      email: body.email,
      otp,
      name: body.name ?? body.email.split("@")[0],
    });
    const payload = await signInResponse.clone().json().catch(() => null) as { user?: { id?: string } } | null;
    if (!signInResponse.ok || !payload?.user?.id) return signInResponse;
    const signedInUserId = payload.user.id;

    const db = createDb(c.env);
    let [freshUser] = await db.query.user.findMany({
      where: (table, { eq }) => eq(table.id, signedInUserId),
      limit: 1,
    });
    if (!freshUser) {
      return signInResponse;
    }
    if (adminEmails(c.env).includes(freshUser.email.toLowerCase()) && !freshUser.isAdmin) {
      [freshUser] = await db
        .update(user)
        .set({ isAdmin: true, updatedAt: new Date() })
        .where(eq(user.id, freshUser.id))
        .returning();
    }
    const activeProfile = await ensureDefaultProfile(db, freshUser);

    // Referral signup attribution: credit the referrer on Boomin when a
    // referred visitor completes their FIRST verify (user row minted in the
    // last few minutes). The event id is keyed by user id, so Boomin's
    // (program, source, event_id) uniqueness makes replays and repeat logins
    // a no-op. Best-effort — attribution must never block auth.
    const isNewSignup = Date.now() - new Date(freshUser.createdAt).getTime() < 10 * 60 * 1000;
    if (isNewSignup) {
      await captureEvent(db, "signup_completed", freshUser.id, null, { method: "otp" });
    }
    if (body.referral_code && isNewSignup) {
      try {
        await recordSignup({
          issuer: BOOMIN_ISSUER,
          signingSecret: requireEnv(c.env, "HANDOFF_SIGNING_SECRET"),
          publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
          partnerRef: body.referral_code,
          eventId: `atlantium_signup_${freshUser.id}`,
          eventType: "referral_signup",
          occurredAt: new Date().toISOString(),
          apiBase: boominConnectApiBase(c.env),
          metadata: {
            source: "atlantium_signup",
            atlantiumUserId: freshUser.id,
            atlantiumProfileId: activeProfile.id,
          },
        });
      } catch {
        // Unknown/stale code or Boomin outage — signup proceeds uncredited.
      }
    }

    const membership = await getMembership(db, freshUser.id);
    return withCopiedCookies(signInResponse, c.json({
      success: true,
      auth_token: null,
      user: { ...publicUser(freshUser, activeProfile), _subscription: membership },
    }));
  },
);

appRoutes.post("/auth/logout", async (c) => {
  const response = await proxyAuthRequest(c, "/api/auth/sign-out", {});
  return response.ok ? withCopiedCookies(response, c.json({ success: true })) : response;
});

appRoutes.get("/auth/me", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const membership = await getMembership(db, authUser.id);
  return c.json({ ...publicUser(authUser, activeProfile), _subscription: membership });
});

appRoutes.get("/profile/me", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  return c.json(publicProfile(authUser, activeProfile));
});

const ASSET_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

// Upload an asset (profile photo, etc.) to Atlantium's own R2 bucket.
appRoutes.post("/upload", async (c) => {
  const { authUser } = await requireAppUser(c);
  const form = await c.req.formData();
  const file = form.get("file") ?? form.get("image");
  if (!(file instanceof File)) {
    throw new HttpError(400, "bad_request", "No file provided.");
  }
  if (!file.type.startsWith("image/")) {
    throw new HttpError(400, "bad_request", "Only image uploads are allowed.");
  }
  if (file.size > MAX_ASSET_BYTES) {
    throw new HttpError(400, "bad_request", "Image must be less than 5MB.");
  }
  const ext = ASSET_EXT_BY_TYPE[file.type] ?? "bin";
  const key = `avatars/${authUser.id}/${crypto.randomUUID()}.${ext}`;
  await c.env.ASSETS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  const url = `${new URL(c.req.url).origin}/v1/assets/${key}`;
  return c.json({ success: true, url, key });
});

// Serve an asset from R2 (bucket has public access disabled, so we proxy it).
appRoutes.get("/assets/:key{.+}", async (c) => {
  const object = await c.env.ASSETS_BUCKET.get(c.req.param("key"));
  if (!object) {
    return c.json({ code: "not_found", message: "Asset not found." }, 404);
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

// ── Admin: new-user approval queue (worker-owned, backs the Approvals tab) ──
appRoutes.get("/admin/users", async (c) => {
  const { db } = await requireAdminUser(c);
  const [users, allProfiles] = await Promise.all([
    db.query.user.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) }),
    db.query.profiles.findMany(),
  ]);
  const profileByOwner = new Map<string, (typeof allProfiles)[number]>();
  for (const p of allProfiles) {
    if (!profileByOwner.has(p.ownerUserId)) profileByOwner.set(p.ownerUserId, p);
  }

  // Persona, affiliation and the branch answers are first-class rows now, not
  // questionnaire keys — an admin looking at an investor should be able to see
  // whether they want introductions, which is what decides if the curation
  // queue may point founders at them.
  const profileIds = allProfiles.map((p) => p.id);
  const roleRows = profileIds.length
    ? await db
        .select({ role: memberRoles, org: directoryEntries, details: roleDetails, prefs: professionalPreferences })
        .from(memberRoles)
        .leftJoin(directoryEntries, eq(directoryEntries.id, memberRoles.entryId))
        .leftJoin(roleDetails, eq(roleDetails.roleId, memberRoles.id))
        .leftJoin(professionalPreferences, eq(professionalPreferences.roleId, memberRoles.id))
        .where(inArray(memberRoles.profileId, profileIds))
    : [];
  const pendingClaims = profileIds.length
    ? await db
        .select({ profileId: orgRequests.profileId, kind: orgRequests.kind, proposed: orgRequests.proposed,
          relationship: orgRequests.relationship, org: directoryEntries.name })
        .from(orgRequests)
        .leftJoin(directoryEntries, eq(directoryEntries.id, orgRequests.entryId))
        .where(and(inArray(orgRequests.profileId, profileIds), eq(orgRequests.status, "pending")))
    : [];

  const rolesByProfile = new Map<string, typeof roleRows>();
  for (const r of roleRows) {
    const list = rolesByProfile.get(r.role.profileId) ?? [];
    list.push(r);
    rolesByProfile.set(r.role.profileId, list);
  }
  const claimsByProfile = new Map<string, typeof pendingClaims>();
  for (const cl of pendingClaims) {
    const list = claimsByProfile.get(cl.profileId) ?? [];
    list.push(cl);
    claimsByProfile.set(cl.profileId, list);
  }

  return c.json(users.map((u) => {
    const p = profileByOwner.get(u.id);
    const reg = (p?.registrationDetails ?? {}) as Record<string, unknown>;
    return {
      id: u.id,
      email: u.email,
      display_name: p?.displayName ?? u.name,
      is_admin: u.isAdmin,
      is_approved: u.isApproved,
      is_email_verified: u.emailVerified,
      onboarding_completed: Boolean(p?.onboardingCompletedAt) || reg.is_completed === true,
      membership_tier: typeof reg.membership_tier === "string" ? reg.membership_tier : null,
      headline: (p?.metadata as Record<string, unknown> | null)?.bio ?? null,
      roles: (rolesByProfile.get(p?.id ?? "") ?? []).map((r) => ({
        role: r.role.role,
        title: r.role.title,
        is_primary: r.role.isPrimary,
        org: r.org ? { name: r.org.name, slug: r.org.slug } : null,
        seeking: r.prefs ? { status: r.prefs.seeking, visibility: r.prefs.visibility } : null,
        details: r.details
          ? {
              venture_stage: r.details.ventureStage,
              needs: r.details.needs,
              check_min: r.details.checkMin,
              check_max: r.details.checkMax,
              focus_stages: r.details.focusStages,
              intro_appetite: r.details.introAppetite,
              domains: r.details.domains,
              engagement: r.details.engagement,
              availability: r.details.availability,
              hiring_roles: r.details.hiringRoles,
              hiring_contact: r.details.hiringContact,
            }
          : null,
      })),
      pending_claims: (claimsByProfile.get(p?.id ?? "") ?? []).map((cl) => ({
        kind: cl.kind,
        relationship: cl.relationship,
        org: cl.org ?? (cl.proposed as Record<string, unknown> | null)?.name ?? null,
      })),
      registration_details: reg,
      created_at: u.createdAt?.toISOString?.() ?? u.createdAt,
    };
  }));
});

appRoutes.post("/admin/users/:userId/approve", async (c) => {
  const { db } = await requireAdminUser(c);
  const [updated] = await db
    .update(user)
    .set({ isApproved: true, updatedAt: new Date() })
    .where(eq(user.id, c.req.param("userId")))
    .returning();
  if (!updated) throw new HttpError(404, "not_found", "User not found.");
  return c.json({ success: true, is_approved: true });
});

appRoutes.post("/admin/users/:userId/revoke", async (c) => {
  const { db } = await requireAdminUser(c);
  const [updated] = await db
    .update(user)
    .set({ isApproved: false, updatedAt: new Date() })
    .where(eq(user.id, c.req.param("userId")))
    .returning();
  if (!updated) throw new HttpError(404, "not_found", "User not found.");
  return c.json({ success: true, is_approved: false });
});


// Reset the questionnaire so the member runs it again from step 1. Used for
// testing the flow, and for members who need to redo their answers.
appRoutes.post("/admin/users/:userId/reset-onboarding", async (c) => {
  const { db } = await requireAdminUser(c);
  const userId = c.req.param("userId");
  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new HttpError(404, "not_found", "User not found.");

  const owned = await db.select().from(profiles).where(eq(profiles.ownerUserId, userId));
  for (const p of owned) {
    const reg = (p.registrationDetails ?? {}) as Record<string, unknown>;
    // Keep the record of what they answered before; only clear completion so
    // the wizard restarts. Nothing else about the account is touched.
    const { is_completed: _dropped, ...previous } = reg;
    await db
      .update(profiles)
      .set({
        onboardingCompletedAt: null,
        registrationDetails: { ...previous, is_completed: false },
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, p.id));
  }
  return c.json({ success: true, profiles_reset: owned.length });
});

// Hard delete. Every user-owned table declares ON DELETE CASCADE, so the row
// takes its sessions, profiles, comments and reveal ledger with it.
appRoutes.post("/admin/users/:userId/delete", async (c) => {
  const { db, authUser } = await requireAdminUser(c);
  const userId = c.req.param("userId");
  if (userId === authUser.id) {
    throw new HttpError(400, "cannot_delete_self", "You can't delete your own account here.");
  }
  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new HttpError(404, "not_found", "User not found.");

  await db.delete(user).where(eq(user.id, userId));
  return c.json({ success: true, deleted_email: target.email });
});


// ── P0A: personas, affiliations and the professional surface (plan §3) ──────

const ROLE_VALUES = ["investor", "professional", "founder", "advisor"] as const;
const SEEKING_VALUES = ["not_seeking", "open", "actively_looking"] as const;
const VISIBILITY_VALUES = ["private", "matched_only", "verified_employers", "all_members"] as const;

const memberRoleWriteSchema = z.object({
  role: z.enum(ROLE_VALUES),
  entry_id: z.string().uuid().nullish(),
  title: z.string().trim().max(120).nullish(),
  is_primary: z.boolean().optional(),
});

const seekingWriteSchema = z.object({
  seeking: z.enum(SEEKING_VALUES).optional(),
  visibility: z.enum(VISIBILITY_VALUES).optional(),
  target_titles: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  seniority: z.string().trim().max(40).nullish(),
  stack: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  min_salary: z.number().int().min(0).max(10_000_000).nullish(),
  remote_pref: z.string().trim().max(40).nullish(),
});

function publicMemberRole(
  row: typeof memberRoles.$inferSelect,
  prefs: typeof professionalPreferences.$inferSelect | null,
  org: { id: string; name: string; slug: string; kind: string } | null,
  details?: typeof roleDetails.$inferSelect | null,
) {
  return {
    id: row.id,
    role: row.role,
    title: row.title,
    is_primary: row.isPrimary,
    source: row.source,
    // An inferred persona is our guess, not their assertion (§5.3). It grants
    // nothing until the member confirms it.
    confirmed: Boolean(row.confirmedAt),
    org: org ? { id: org.id, name: org.name, slug: org.slug, kind: org.kind } : null,
    professional: prefs
      ? {
          seeking: prefs.seeking,
          visibility: prefs.visibility,
          seeking_updated_at: prefs.seekingUpdatedAt?.toISOString() ?? null,
          target_titles: prefs.targetTitles,
          seniority: prefs.seniority,
          stack: prefs.stack,
          min_salary: prefs.minSalary,
          remote_pref: prefs.remotePref,
        }
      : null,
    details: details
      ? {
          venture_stage: details.ventureStage,
          needs: details.needs,
          check_min: details.checkMin,
          check_max: details.checkMax,
          focus_stages: details.focusStages,
          intro_appetite: details.introAppetite,
          domains: details.domains,
          engagement: details.engagement,
          availability: details.availability,
          hiring_roles: details.hiringRoles,
          hiring_contact: details.hiringContact,
        }
      : null,
  };
}

/** The member's own personas. Never a route for looking at anybody else. */
async function loadOwnRoles(db: Db, profileId: string) {
  const rows = await db
    .select({ role: memberRoles, prefs: professionalPreferences, org: directoryEntries, details: roleDetails })
    .from(memberRoles)
    .leftJoin(professionalPreferences, eq(professionalPreferences.roleId, memberRoles.id))
    .leftJoin(roleDetails, eq(roleDetails.roleId, memberRoles.id))
    .leftJoin(directoryEntries, eq(directoryEntries.id, memberRoles.entryId))
    .where(eq(memberRoles.profileId, profileId))
    .orderBy(desc(memberRoles.isPrimary), asc(memberRoles.createdAt));
  return rows.map((r) => publicMemberRole(r.role, r.prefs, r.org, r.details));
}

appRoutes.get("/me/roles", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const profile = await ensureDefaultProfile(db, authUser);
  return c.json({ roles: await loadOwnRoles(db, profile.id) });
});

appRoutes.post("/me/roles", zValidator("json", memberRoleWriteSchema), async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const profile = await ensureDefaultProfile(db, authUser);
  const input = c.req.valid("json");

  // Claim-only: an affiliation must point at an entry that already exists in
  // the catalog. Members never free-create orgs (§4.1).
  if (input.entry_id) {
    const [entry] = await db
      .select({ id: directoryEntries.id })
      .from(directoryEntries)
      .where(eq(directoryEntries.id, input.entry_id))
      .limit(1);
    if (!entry) throw new HttpError(404, "not_found", "That organization isn't in the directory yet.");
  }

  // Raw SQL because the uniqueness is an EXPRESSION index
  // (profile_id, role, COALESCE(entry_id, ...)) and drizzle's typed
  // onConflictDoUpdate cannot express that target. Keeping it as a real upsert
  // matters: the read-then-act alternative races on a double-submit.
  const now = new Date();
  const upserted = await db.execute(sql`
    INSERT INTO member_roles (profile_id, role, entry_id, title, is_primary, source, confirmed_at)
    VALUES (
      ${profile.id}, ${input.role}::member_role, ${input.entry_id ?? null},
      ${input.title ?? null}, ${input.is_primary ?? false}, 'self_declared'::role_source, ${now}
    )
    ON CONFLICT (profile_id, role, COALESCE(entry_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      title = EXCLUDED.title,
      is_primary = EXCLUDED.is_primary,
      -- Re-declaring an inferred persona is the member confirming it.
      source = 'self_declared'::role_source,
      confirmed_at = ${now},
      updated_at = ${now}
    RETURNING id
  `);
  const row = (upserted.rows?.[0] ?? (upserted as unknown as Array<{ id: string }>)[0]) as { id: string } | undefined;

  // A professional persona always has a preferences row so seeking + visibility
  // have somewhere to live — created at the safe default, never null.
  if (row && input.role === "professional") {
    await db
      .insert(professionalPreferences)
      .values({ roleId: row.id })
      .onConflictDoNothing({ target: professionalPreferences.roleId });
  }

  return c.json({ roles: await loadOwnRoles(db, profile.id) });
});

appRoutes.patch("/me/roles/:roleId/seeking", zValidator("json", seekingWriteSchema), async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const profile = await ensureDefaultProfile(db, authUser);
  const input = c.req.valid("json");

  const [role] = await db
    .select()
    .from(memberRoles)
    .where(and(eq(memberRoles.id, c.req.param("roleId")), eq(memberRoles.profileId, profile.id)))
    .limit(1);
  if (!role) throw new HttpError(404, "not_found", "Role not found.");
  if (role.role !== "professional") {
    throw new HttpError(400, "not_professional", "Seeking status belongs to a professional role.");
  }

  const now = new Date();
  await db
    .insert(professionalPreferences)
    .values({
      roleId: role.id,
      ...(input.seeking !== undefined ? { seeking: input.seeking, seekingUpdatedAt: now } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.target_titles !== undefined ? { targetTitles: input.target_titles } : {}),
      ...(input.seniority !== undefined ? { seniority: input.seniority ?? null } : {}),
      ...(input.stack !== undefined ? { stack: input.stack } : {}),
      ...(input.min_salary !== undefined ? { minSalary: input.min_salary ?? null } : {}),
      ...(input.remote_pref !== undefined ? { remotePref: input.remote_pref ?? null } : {}),
    })
    .onConflictDoUpdate({
      target: professionalPreferences.roleId,
      set: {
        // seeking_updated_at only moves when the status itself moves, so the
        // staleness clock measures the answer, not the last time they edited
        // an unrelated field (§3.4).
        ...(input.seeking !== undefined ? { seeking: input.seeking, seekingUpdatedAt: now } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
        ...(input.target_titles !== undefined ? { targetTitles: input.target_titles } : {}),
        ...(input.seniority !== undefined ? { seniority: input.seniority ?? null } : {}),
        ...(input.stack !== undefined ? { stack: input.stack } : {}),
        ...(input.min_salary !== undefined ? { minSalary: input.min_salary ?? null } : {}),
        ...(input.remote_pref !== undefined ? { remotePref: input.remote_pref ?? null } : {}),
        updatedAt: now,
      },
    });

  return c.json({ roles: await loadOwnRoles(db, profile.id) });
});

/**
 * The founder / investor / advisor / recruiter branch answers from onboarding.
 *
 * One endpoint rather than four: which columns are meaningful is decided by the
 * role, and sending a field that doesn't belong to your role is rejected rather
 * than quietly stored — an investor cannot set an advisor's availability, which
 * is what gates whether founders may reach them.
 */
const roleDetailsWriteSchema = z.object({
  venture_stage: z.string().trim().max(40).optional(),
  needs: z.array(z.string().trim().max(40)).max(8).optional(),
  check_min: z.number().int().nonnegative().optional(),
  check_max: z.number().int().nonnegative().optional(),
  focus_stages: z.array(z.string().trim().max(40)).max(8).optional(),
  intro_appetite: z.enum(["none", "some", "all"]).optional(),
  domains: z.array(z.string().trim().max(40)).max(12).optional(),
  engagement: z.array(z.string().trim().max(40)).max(8).optional(),
  availability: z.enum(["open", "intro_only", "closed"]).optional(),
  hiring_roles: z.array(z.string().trim().max(80)).max(12).optional(),
  hiring_contact: z.string().trim().max(40).optional(),
});

const FIELDS_BY_ROLE: Record<string, ReadonlyArray<keyof z.infer<typeof roleDetailsWriteSchema>>> = {
  founder: ["venture_stage", "needs"],
  investor: ["check_min", "check_max", "focus_stages", "intro_appetite"],
  advisor: ["domains", "engagement", "availability"],
  // A recruiter is a professional whose affiliation carries hiring authority —
  // "hiring" is not its own persona (plan §3: persona, affiliation and status
  // are separate axes).
  professional: ["hiring_roles", "hiring_contact"],
};

appRoutes.patch(
  "/me/roles/:roleId/details",
  zValidator("json", roleDetailsWriteSchema),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const profile = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");

    const [role] = await db
      .select()
      .from(memberRoles)
      .where(and(eq(memberRoles.id, c.req.param("roleId")), eq(memberRoles.profileId, profile.id)))
      .limit(1);
    if (!role) throw new HttpError(404, "not_found", "Role not found.");

    const allowed = FIELDS_BY_ROLE[role.role] ?? [];
    const sent = Object.keys(input) as Array<keyof typeof input>;
    const rejected = sent.filter((f) => !allowed.includes(f));
    if (rejected.length > 0) {
      throw new HttpError(400, "wrong_role",
        `A ${role.role} role can't set: ${rejected.join(", ")}.`);
    }

    if (input.check_min !== undefined && input.check_max !== undefined
      && input.check_min > input.check_max) {
      throw new HttpError(400, "bad_range", "The smaller check goes first.");
    }

    const columns = {
      ...(input.venture_stage !== undefined ? { ventureStage: input.venture_stage } : {}),
      ...(input.needs !== undefined ? { needs: input.needs } : {}),
      ...(input.check_min !== undefined ? { checkMin: input.check_min } : {}),
      ...(input.check_max !== undefined ? { checkMax: input.check_max } : {}),
      ...(input.focus_stages !== undefined ? { focusStages: input.focus_stages } : {}),
      ...(input.intro_appetite !== undefined ? { introAppetite: input.intro_appetite } : {}),
      ...(input.domains !== undefined ? { domains: input.domains } : {}),
      ...(input.engagement !== undefined ? { engagement: input.engagement } : {}),
      ...(input.availability !== undefined ? { availability: input.availability } : {}),
      ...(input.hiring_roles !== undefined ? { hiringRoles: input.hiring_roles } : {}),
      ...(input.hiring_contact !== undefined ? { hiringContact: input.hiring_contact } : {}),
    };

    await db
      .insert(roleDetails)
      .values({ roleId: role.id, ...columns })
      .onConflictDoUpdate({
        target: roleDetails.roleId,
        set: { ...columns, updatedAt: new Date() },
      });

    return c.json({ roles: await loadOwnRoles(db, profile.id) });
  },
);

appRoutes.delete("/me/roles/:roleId", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const profile = await ensureDefaultProfile(db, authUser);
  const deleted = await db
    .delete(memberRoles)
    .where(and(eq(memberRoles.id, c.req.param("roleId")), eq(memberRoles.profileId, profile.id)))
    .returning();
  if (deleted.length === 0) throw new HttpError(404, "not_found", "Role not found.");
  return c.json({ roles: await loadOwnRoles(db, profile.id) });
});


// ── P0B: work-email verification → employment grant (plan §4.3) ─────────────

appRoutes.post(
  "/me/work-email/start",
  zValidator("json", z.object({ email: z.string().email() })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const profile = await ensureDefaultProfile(db, authUser);
    const email = c.req.valid("json").email.trim().toLowerCase();
    const domain = normalizeDomain(email);

    if (isFreeMailDomain(domain)) {
      throw new HttpError(400, "personal_domain",
        "Use your work email — a personal address can't prove where you work.");
    }

    const candidates = await candidateOrgsForDomain(db, domain);
    if (candidates.length === 0) {
      // Claim-only: we don't invent orgs from a domain (§4.1).
      throw new HttpError(404, "no_matching_org",
        "No organization in the directory uses that domain yet.");
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await db.insert(workEmailVerifications).values({
      profileId: profile.id,
      email,
      domain,
      codeHash: await hashCode(code, profile.id),
      expiresAt,
    });
    await sendOtpEmail(c.env, email, code);

    return c.json({
      domain,
      // A domain can legitimately map to several orgs, so the member resolves
      // the ambiguity — possession of @foo.com never proves WHICH foo.
      candidates: candidates.map((o) => ({ entry_id: o.entryId, name: o.name, slug: o.slug, kind: o.kind })),
      expires_at: expiresAt.toISOString(),
      // Same flag the auth OTP uses; must stay off in prod.
      ...(isDebugAuthCodes(c.env) ? { dev_code: code } : {}),
    });
  },
);

appRoutes.post(
  "/me/work-email/confirm",
  zValidator("json", z.object({ code: z.string().trim().min(4).max(8), entry_id: z.string().uuid().optional() })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const profile = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");

    const pending = await latestPendingVerification(db, profile.id);
    if (!pending) throw new HttpError(404, "no_pending_verification", "Start work-email verification first.");
    if (pending.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, "code_expired", "That code has expired. Request a new one.");
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      throw new HttpError(429, "too_many_attempts", "Too many attempts. Request a new code.");
    }

    if (await hashCode(input.code, profile.id) !== pending.codeHash) {
      await db
        .update(workEmailVerifications)
        .set({ attempts: pending.attempts + 1 })
        .where(eq(workEmailVerifications.id, pending.id));
      throw new HttpError(400, "invalid_code", "That code doesn't match.");
    }

    const candidates = await candidateOrgsForDomain(db, pending.domain);
    if (candidates.length === 0) throw new HttpError(404, "no_matching_org", "No organization uses that domain.");

    const chosen = input.entry_id
      ? candidates.find((o) => o.entryId === input.entry_id)
      : candidates.length === 1
        ? candidates[0]
        : undefined;
    if (!chosen) {
      // Ambiguous domain and no pick: refuse rather than guess an employer.
      throw new HttpError(400, "org_choice_required", "Choose which organization you work for.", );
    }

    await db
      .update(workEmailVerifications)
      .set({ consumedAt: new Date() })
      .where(eq(workEmailVerifications.id, pending.id));

    // Employment, not authority. Speaking for the company is a separate,
    // admin-reviewed grant (§4.4) — this one is a badge.
    const [membership] = await db
      .insert(orgMemberships)
      .values({
        profileId: profile.id,
        entryId: chosen.entryId,
        relationship: "employee",
        authority: "none",
      })
      .onConflictDoNothing()
      .returning();

    const resolved = membership ?? (await db
      .select()
      .from(orgMemberships)
      .where(and(
        eq(orgMemberships.profileId, profile.id),
        eq(orgMemberships.entryId, chosen.entryId),
        eq(orgMemberships.relationship, "employee"),
      ))
      .limit(1))[0];

    await grantVerification(db, {
      subject: { orgMembershipId: resolved.id },
      verification: "employment",
      evidence: "email_domain_otp",
      evidenceRef: pending.domain,
    });

    return c.json({
      verified: true,
      org: { entry_id: chosen.entryId, name: chosen.name, slug: chosen.slug },
      authority: "none",
      note: "Employment verified. Representing this organization is a separate review.",
    });
  },
);


/** A connection as the viewer sees it — never exposes the other side's blocks. */
function publicConnection(row: typeof memberConnections.$inferSelect, viewerProfileId: string) {
  return {
    id: row.id,
    status: row.status,
    source: row.source,
    direction: row.requesterProfileId === viewerProfileId ? "outgoing" : "incoming",
    other_profile_id: row.requesterProfileId === viewerProfileId ? row.recipientProfileId : row.requesterProfileId,
    message: row.message,
    created_at: row.createdAt.toISOString(),
    accepted_at: row.acceptedAt?.toISOString() ?? null,
  };
}

// ── P1: connections, blocks and DM requests (plan §8, §8A) ──────────────────

const PURPOSES = ["hiring", "fundraising", "advice", "peer", "intro"] as const;

/** Connection requests and DM requests share one door and one budget. */
async function resolveTargetProfile(db: Db, profileId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  // 404 rather than 403 for anything the caller may not see.
  if (!row) throw new HttpError(404, "not_found", "Member not found.");
  return row;
}

appRoutes.get("/me/outreach", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const profile = await ensureDefaultProfile(db, authUser);
  return c.json(await outreachStatus(db, profile.id, authUser.id));
});

appRoutes.post(
  "/connections/requests",
  zValidator("json", z.object({
    profile_id: z.string().uuid(),
    message: z.string().trim().max(600).optional(),
    acting_role_id: z.string().uuid().optional(),
    purpose: z.enum(PURPOSES).default("peer"),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");
    const target = await resolveTargetProfile(db, input.profile_id);

    const decision = await canInitiate(db, {
      actorProfileId: me.id,
      actorUserId: authUser.id,
      actingRoleId: input.acting_role_id ?? null,
      purpose: input.purpose,
      recipientProfileId: target.id,
    });
    if (!decision.allowed) throw new HttpError(403, decision.reason, decision.message);

    // A reciprocal request is mutual intent — accept rather than stack a second
    // pending row, which the pair-unique index would reject anyway.
    const [reciprocal] = await db.select().from(memberConnections)
      .where(and(
        eq(memberConnections.requesterProfileId, target.id),
        eq(memberConnections.recipientProfileId, me.id),
        eq(memberConnections.status, "pending"),
      )).limit(1);
    if (reciprocal) {
      const [accepted] = await db.update(memberConnections)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(memberConnections.id, reciprocal.id))
        .returning();
      return c.json({ connection: publicConnection(accepted, me.id), mutual: true });
    }

    try {
      const [row] = await db.insert(memberConnections).values({
        requesterProfileId: me.id,
        recipientProfileId: target.id,
        message: input.message ?? null,
        source: "direct",
      }).returning();
      return c.json({ connection: publicConnection(row, me.id), mutual: false });
    } catch {
      throw new HttpError(409, "already_connected", "You already have a live connection with this member.");
    }
  },
);

appRoutes.post(
  "/connections/requests/:id/decide",
  zValidator("json", z.object({ accept: z.boolean() })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const accept = c.req.valid("json").accept;

    const [row] = await db.select().from(memberConnections)
      .where(and(
        eq(memberConnections.id, c.req.param("id")),
        eq(memberConnections.recipientProfileId, me.id),
        eq(memberConnections.status, "pending"),
      )).limit(1);
    if (!row) throw new HttpError(404, "not_found", "Request not found.");

    const [updated] = await db.update(memberConnections)
      .set(accept
        ? { status: "accepted", acceptedAt: new Date() }
        : { status: "declined" })
      .where(eq(memberConnections.id, row.id))
      .returning();
    return c.json({ connection: publicConnection(updated, me.id) });
  },
);

appRoutes.get("/me/connections", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const rows = await db.select().from(memberConnections)
    .where(and(
      or(eq(memberConnections.requesterProfileId, me.id), eq(memberConnections.recipientProfileId, me.id)),
      inArray(memberConnections.status, ["pending", "accepted"]),
    ));
  return c.json({ connections: rows.map((r) => publicConnection(r, me.id)) });
});

appRoutes.delete("/connections/:id", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const removed = await db.update(memberConnections)
    .set({ status: "removed", removedAt: new Date() })
    .where(and(
      eq(memberConnections.id, c.req.param("id")),
      or(eq(memberConnections.requesterProfileId, me.id), eq(memberConnections.recipientProfileId, me.id)),
      inArray(memberConnections.status, ["pending", "accepted"]),
    ))
    .returning();
  if (removed.length === 0) throw new HttpError(404, "not_found", "Connection not found.");
  // Kept as a removed row, not deleted: provenance survives (§8A.7).
  return c.json({ success: true });
});

appRoutes.post(
  "/blocks",
  zValidator("json", z.object({ profile_id: z.string().uuid(), reason: z.string().trim().max(300).optional() })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");
    if (input.profile_id === me.id) throw new HttpError(400, "self_block", "You can't block yourself.");
    await resolveTargetProfile(db, input.profile_id);

    // Works with no prior connection — that's the whole point of a standalone
    // primitive (§8A.3).
    await db.insert(memberBlocks)
      .values({ blockerProfileId: me.id, blockedProfileId: input.profile_id, reason: input.reason ?? null })
      .onConflictDoNothing();
    // Any live edge is torn down, but its history is kept.
    await db.update(memberConnections)
      .set({ status: "removed", removedAt: new Date() })
      .where(and(
        inArray(memberConnections.status, ["pending", "accepted"]),
        or(
          and(eq(memberConnections.requesterProfileId, me.id), eq(memberConnections.recipientProfileId, input.profile_id)),
          and(eq(memberConnections.requesterProfileId, input.profile_id), eq(memberConnections.recipientProfileId, me.id)),
        ),
      ));
    return c.json({ success: true });
  },
);

appRoutes.post(
  "/dm/requests",
  zValidator("json", z.object({
    profile_id: z.string().uuid(),
    body: z.string().trim().min(1).max(2000),
    purpose: z.enum(PURPOSES),
    acting_role_id: z.string().uuid().optional(),
    acting_org_id: z.string().uuid().optional(),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");
    const target = await resolveTargetProfile(db, input.profile_id);

    const decision = await canInitiate(db, {
      actorProfileId: me.id,
      actorUserId: authUser.id,
      actingRoleId: input.acting_role_id ?? null,
      purpose: input.purpose,
      recipientProfileId: target.id,
    });
    if (!decision.allowed) throw new HttpError(403, decision.reason, decision.message);

    if (decision.connected) {
      // Connected members skip the request flow entirely (§8A.5) — the
      // restriction checks above still ran.
      const [thread] = await db.insert(threads)
        .values({ kind: "dm", createdBy: authUser.id }).returning();
      await db.insert(threadParticipants).values([
        { threadId: thread.id, userId: authUser.id },
        { threadId: thread.id, userId: target.ownerUserId },
      ]);
      await db.insert(threadMessages).values({
        threadId: thread.id, authorUserId: authUser.id, body: input.body,
      });
      return c.json({ direct: true, thread_id: thread.id });
    }

    try {
      const [row] = await db.insert(dmRequests).values({
        fromProfileId: me.id,
        toProfileId: target.id,
        actingRoleId: input.acting_role_id ?? null,
        actingOrgId: input.acting_org_id ?? null,
        purpose: input.purpose,
        body: input.body,
      }).returning();
      return c.json({ direct: false, request_id: row.id, status: row.status });
    } catch {
      throw new HttpError(409, "already_pending", "You already have a pending request to this member.");
    }
  },
);

appRoutes.post(
  "/dm/requests/:id/decide",
  zValidator("json", z.object({ accept: z.boolean() })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const accept = c.req.valid("json").accept;

    const [row] = await db.select().from(dmRequests)
      .where(and(
        eq(dmRequests.id, c.req.param("id")),
        eq(dmRequests.toProfileId, me.id),
        eq(dmRequests.status, "pending"),
      )).limit(1);
    if (!row) throw new HttpError(404, "not_found", "Request not found.");

    if (!accept) {
      await db.update(dmRequests).set({ status: "declined", decidedAt: new Date() })
        .where(eq(dmRequests.id, row.id));
      // A decline does not refund the sender's budget — that is the deterrent.
      return c.json({ accepted: false });
    }

    const [sender] = await db.select().from(profiles).where(eq(profiles.id, row.fromProfileId)).limit(1);
    const [thread] = await db.insert(threads).values({ kind: "dm", createdBy: authUser.id }).returning();
    await db.insert(threadParticipants).values([
      { threadId: thread.id, userId: authUser.id },
      { threadId: thread.id, userId: sender.ownerUserId },
    ]);
    await db.insert(threadMessages).values({
      threadId: thread.id, authorUserId: sender.ownerUserId, body: row.body,
    });
    await db.update(dmRequests)
      .set({ status: "accepted", decidedAt: new Date(), threadId: thread.id })
      .where(eq(dmRequests.id, row.id));

    // Accepting a conversation is NOT a connection (§8A.4).
    return c.json({ accepted: true, thread_id: thread.id });
  },
);

appRoutes.get("/dm/requests", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const rows = await db.select().from(dmRequests)
    .where(and(eq(dmRequests.toProfileId, me.id), eq(dmRequests.status, "pending")));
  return c.json({
    requests: rows.map((r) => ({
      id: r.id, purpose: r.purpose, body: r.body, created_at: r.createdAt.toISOString(),
    })),
  });
});


// ── P1b: billing (plan §6.5) ────────────────────────────────────────────────
// Stripe is the source of truth. `memberships` is a projection written ONLY
// from verified webhooks — never from a checkout redirect, which anyone can
// forge by visiting the success URL directly.

async function membershipFor(db: Db, userId: string) {
  const [row] = await db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
  return row ?? null;
}

appRoutes.get("/billing/status", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const row = await membershipFor(db, authUser.id);
  const entitlements = [...(await entitlementsFor(db, authUser.id))];
  return c.json({
    tier: row?.tier ?? "free",
    status: row?.status ?? null,
    current_period_end: row?.currentPeriodEnd?.toISOString() ?? null,
    cancel_at_period_end: row?.cancelAtPeriodEnd ?? false,
    has_billing_account: Boolean(row?.stripeCustomerId),
    entitlements,
  });
});

appRoutes.post(
  "/billing/checkout",
  zValidator("json", z.object({ plan: z.enum(["club", "club_annual"]) })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const plan = c.req.valid("json").plan;
    const priceId = plan === "club_annual" ? c.env.STRIPE_PRICE_CLUB_ANNUAL : c.env.STRIPE_PRICE_CLUB_MONTHLY;
    if (!priceId || !c.env.STRIPE_SECRET_KEY) {
      throw new HttpError(503, "billing_unavailable", "Billing isn't configured yet.");
    }

    const existing = await membershipFor(db, authUser.id);
    const base = c.env.APP_BASE_URL || "https://atlantium.ai";
    const session = await createCheckoutSession(c.env, {
      priceId,
      userId: authUser.id,
      email: authUser.email,
      customerId: existing?.stripeCustomerId ?? null,
      successUrl: `${base}/dashboard?checkout=success`,
      cancelUrl: `${base}/pricing?checkout=cancelled`,
    });
    return c.json({ checkout_url: session.url });
  },
);

appRoutes.post("/billing/portal", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const row = await membershipFor(db, authUser.id);
  if (!row?.stripeCustomerId) throw new HttpError(404, "no_billing_account", "No billing account yet.");
  const base = c.env.APP_BASE_URL || "https://atlantium.ai";
  const session = await createPortalSession(c.env, {
    customerId: row.stripeCustomerId,
    returnUrl: `${base}/dashboard`,
  });
  return c.json({ portal_url: session.url });
});

/** Applies a subscription's state to our projection. */
async function applySubscription(
  db: Db,
  env: Env,
  userId: string,
  sub: StripeSubscription,
) {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const tier = tierForPrice(env, priceId);
  const status = normalizeStatus(sub.status);
  const live = status === "active" || status === "trialing" || status === "past_due";

  const values = {
    // An unknown price grants nothing rather than defaulting to a paid tier —
    // the same positive-capability rule entitlements use.
    tier: live && tier ? tier : ("free" as const),
    status,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    updatedAt: new Date(),
  };

  await db
    .insert(memberships)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: memberships.userId, set: values });
}

appRoutes.post("/billing/webhook", async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "billing_unavailable", "Billing isn't configured yet.");

  // The signature covers the RAW bytes — parsing and re-serializing would
  // change them and break verification.
  const rawBody = await c.req.text();
  const verified = await verifyWebhookSignature(secret, rawBody, c.req.header("stripe-signature") ?? null);
  if (!verified.ok) throw new HttpError(400, "invalid_signature", `Webhook rejected: ${verified.reason}`);

  const event = JSON.parse(rawBody) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };
  const db = createDb(c.env);

  // Record before acting. If this insert conflicts, the event is a retry of one
  // we already handled and must not be applied twice.
  const inserted = await db
    .insert(billingEvents)
    .values({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> })
    .onConflictDoNothing()
    .returning({ id: billingEvents.id });
  if (inserted.length === 0) return c.json({ received: true, duplicate: true });

  try {
    const object = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        const meta = (object.metadata ?? {}) as Record<string, string>;

        // A service-request payment (training tuition etc.) — one-time, not a
        // subscription. Marked paid only here, from a verified event, never
        // from the success redirect.
        if (meta.service_request_id) {
          await db
            .update(serviceRequests)
            .set({ status: "paid", paidAt: new Date(), stripeSessionId: object.id as string })
            .where(eq(serviceRequests.id, meta.service_request_id));
          break;
        }

        const userId = (object.client_reference_id ?? meta.user_id) as string | undefined;
        const subscriptionId = object.subscription as string | undefined;
        if (userId && subscriptionId) {
          const sub = await getSubscription(c.env, subscriptionId);
          await applySubscription(db, c.env, userId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = object as unknown as StripeSubscription;
        // metadata.user_id is set at checkout; fall back to the customer we
        // already recorded so subscription edits made in Stripe still land.
        let userId = sub.metadata?.user_id;
        if (!userId && typeof sub.customer === "string") {
          const [row] = await db.select({ userId: memberships.userId }).from(memberships)
            .where(eq(memberships.stripeCustomerId, sub.customer)).limit(1);
          userId = row?.userId;
        }
        if (userId) {
          await applySubscription(db, c.env, userId, {
            ...sub,
            status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          });
        }
        break;
      }
      default:
        break;
    }
    await db.update(billingEvents).set({ processedAt: new Date() }).where(eq(billingEvents.id, event.id));
    return c.json({ received: true });
  } catch (error) {
    // Record the failure and 500 so Stripe retries; the event row stays
    // unprocessed, and the retry re-enters via the conflict path below.
    await db.delete(billingEvents).where(eq(billingEvents.id, event.id));
    throw error;
  }
});


// ── P1 S6: member discovery ─────────────────────────────────────────────────
/**
 * Search members. Returns exactly what a profile already shows — personas,
 * affiliations, verification — and NEVER seeking status or visibility, which
 * only visibleSeekers() may surface.
 *
 * Deliberately NOT entitlement-gated, unlike the original plan: you cannot sell
 * outreach to someone who can't see who they'd be reaching. Participation
 * (finding people) stays open; commercial leverage (contacting them) is what
 * costs. Requires a completed questionnaire, so it isn't a scraping surface for
 * drive-by signups.
 */
// NOTE: registered BEFORE /members/:profileId. Hono matches in order, so the
// param route would otherwise swallow this as profileId="search" — the
// two-segment shadowing trap this repo has hit before.
appRoutes.get("/members/search", async (c) => {
  await ensureMemberInGoodStanding(c);
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);

  const q = (c.req.query("q") ?? "").trim();
  const role = c.req.query("role");
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 24, 1), 50);

  const conditions = [
    ne(profiles.id, me.id),
    sql`${memberRoles.confirmedAt} IS NOT NULL`,
    // Never surface either side of a block to the other.
    sql`NOT EXISTS (
      SELECT 1 FROM member_blocks b
      WHERE (b.blocker_profile_id = ${me.id} AND b.blocked_profile_id = ${profiles.id})
         OR (b.blocker_profile_id = ${profiles.id} AND b.blocked_profile_id = ${me.id})
    )`,
    // Only members who finished onboarding appear — a half-filled profile is
    // noise, and confirming is what makes a persona meaningful.
    // Parenthesised: an unparenthesised OR inside this AND chain silently
    // rewrites the whole predicate.
    sql`(${profiles.onboardingCompletedAt} IS NOT NULL OR ${profiles.registrationDetails}->>'is_completed' = 'true')`,
  ];
  if (q) {
    conditions.push(or(
      ilike(profiles.displayName, `%${q}%`),
      ilike(directoryEntries.name, `%${q}%`),
      ilike(memberRoles.title, `%${q}%`),
    )!);
  }
  if (role && ["professional", "founder", "investor", "advisor"].includes(role)) {
    conditions.push(eq(memberRoles.role, role as "professional" | "founder" | "investor" | "advisor"));
  }

  const rows = await db
    .select({
      profileId: profiles.id,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      metadata: profiles.metadata,
      role: memberRoles.role,
      title: memberRoles.title,
      orgName: directoryEntries.name,
    })
    .from(memberRoles)
    .innerJoin(profiles, eq(profiles.id, memberRoles.profileId))
    .leftJoin(directoryEntries, eq(directoryEntries.id, memberRoles.entryId))
    .where(and(...conditions))
    .orderBy(asc(profiles.displayName))
    .limit(limit * 2);

  // One card per member, with all their personas folded in.
  const members = new Map<string, {
    profile_id: string; display_name: string; avatar_url: string | null; bio: string | null;
    roles: Array<{ role: string; title: string | null; org: string | null }>;
  }>();
  for (const r of rows) {
    const existing = members.get(r.profileId) ?? {
      profile_id: r.profileId,
      display_name: r.displayName,
      avatar_url: r.avatarUrl,
      bio: ((r.metadata ?? {}) as Record<string, string>).bio ?? null,
      roles: [],
    };
    existing.roles.push({ role: r.role, title: r.title, org: r.orgName });
    members.set(r.profileId, existing);
  }

  return c.json({ members: [...members.values()].slice(0, limit) });
});

/**
 * A member as another member sees them. Deliberately narrow: personas,
 * affiliations and verification badges only.
 *
 * It NEVER exposes seeking status or visibility. `visibleSeekers()` is the only
 * path to that, and a profile endpoint that quietly included it would undo the
 * whole privacy design (§3.4, §8.7).
 */
appRoutes.get("/members/:profileId", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const profileId = c.req.param("profileId");

  const [target] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!target) throw new HttpError(404, "not_found", "Member not found.");

  // A blocked viewer gets the same 404 as a stranger — presence is not
  // confirmed to someone who was blocked.
  const [blocked] = await db.select({ b: memberBlocks.blockerProfileId }).from(memberBlocks)
    .where(or(
      and(eq(memberBlocks.blockerProfileId, target.id), eq(memberBlocks.blockedProfileId, me.id)),
      and(eq(memberBlocks.blockerProfileId, me.id), eq(memberBlocks.blockedProfileId, target.id)),
    )).limit(1);
  if (blocked) throw new HttpError(404, "not_found", "Member not found.");

  const roles = await db
    .select({ role: memberRoles, org: directoryEntries })
    .from(memberRoles)
    .leftJoin(directoryEntries, eq(directoryEntries.id, memberRoles.entryId))
    .where(and(eq(memberRoles.profileId, target.id), sql`${memberRoles.confirmedAt} IS NOT NULL`));

  const grants = await db
    .select({ verification: verificationGrants.verification })
    .from(verificationGrants)
    .leftJoin(memberRoles, eq(memberRoles.id, verificationGrants.memberRoleId))
    .leftJoin(orgMemberships, eq(orgMemberships.id, verificationGrants.orgMembershipId))
    .where(and(
      isNull(verificationGrants.revokedAt),
      or(eq(memberRoles.profileId, target.id), eq(orgMemberships.profileId, target.id)),
    ));

  const employers = await db
    .select({ org: directoryEntries, relationship: orgMemberships.relationship })
    .from(orgMemberships)
    .innerJoin(directoryEntries, eq(directoryEntries.id, orgMemberships.entryId))
    .where(and(eq(orgMemberships.profileId, target.id), eq(orgMemberships.isCurrent, true)));

  const [connection] = await db.select().from(memberConnections)
    .where(and(
      inArray(memberConnections.status, ["pending", "accepted"]),
      or(
        and(eq(memberConnections.requesterProfileId, me.id), eq(memberConnections.recipientProfileId, target.id)),
        and(eq(memberConnections.requesterProfileId, target.id), eq(memberConnections.recipientProfileId, me.id)),
      ),
    )).limit(1);

  const metadata = (target.metadata ?? {}) as Record<string, string>;
  return c.json({
    member: {
      profile_id: target.id,
      display_name: target.displayName,
      slug: target.slug,
      avatar_url: target.avatarUrl,
      bio: metadata.bio ?? null,
      location: metadata.location ?? null,
      links: {
        website: metadata.website_url ?? null,
        linkedin: metadata.linkedin_url ?? null,
        github: metadata.github_url ?? null,
      },
      roles: roles.map((r) => ({
        id: r.role.id,
        role: r.role.role,
        title: r.role.title,
        is_primary: r.role.isPrimary,
        org: r.org ? { id: r.org.id, name: r.org.name, slug: r.org.slug } : null,
      })),
      employers: employers.map((e) => ({
        id: e.org.id, name: e.org.name, slug: e.org.slug, relationship: e.relationship,
      })),
      verifications: [...new Set(grants.map((g) => g.verification))],
      connection: connection
        ? {
            id: connection.id,
            status: connection.status,
            direction: connection.requesterProfileId === me.id ? "outgoing" : "incoming",
          }
        : null,
      is_self: target.id === me.id,
    },
  });
});


// ── P1: conversations (plan §8A.4, execution plan S1) ───────────────────────
// The threads spine already existed; DM acceptance already wrote to it. This is
// the missing read/reply half — without it, accepting a request dead-ends.

/**
 * Membership in a thread is the ONLY key. A non-participant gets 404, never
 * 403, so thread ids can't be probed for existence.
 */
async function requireThreadParticipant(db: Db, threadId: string, userId: string) {
  const [row] = await db
    .select({ thread: threads })
    .from(threads)
    .innerJoin(threadParticipants, eq(threadParticipants.threadId, threads.id))
    .where(and(
      eq(threads.id, threadId),
      eq(threadParticipants.userId, userId),
      eq(threads.kind, "dm"),
    ))
    .limit(1);
  if (!row) throw new HttpError(404, "not_found", "Conversation not found.");
  return row.thread;
}

/** The other side of a DM thread, as profile + display name. */
async function counterpart(db: Db, threadId: string, userId: string) {
  const [row] = await db
    .select({ profileId: profiles.id, displayName: profiles.displayName, userId: profiles.ownerUserId })
    .from(threadParticipants)
    .innerJoin(profiles, eq(profiles.ownerUserId, threadParticipants.userId))
    .where(and(eq(threadParticipants.threadId, threadId), ne(threadParticipants.userId, userId)))
    .limit(1);
  return row ?? null;
}

appRoutes.get("/threads", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);

  const rows = await db
    .select({ thread: threads })
    .from(threads)
    .innerJoin(threadParticipants, eq(threadParticipants.threadId, threads.id))
    .where(and(eq(threadParticipants.userId, authUser.id), eq(threads.kind, "dm")))
    .orderBy(desc(threads.updatedAt))
    .limit(100);

  const blocks = await db
    .select({ other: memberBlocks.blockedProfileId, blocker: memberBlocks.blockerProfileId })
    .from(memberBlocks)
    .where(or(eq(memberBlocks.blockerProfileId, me.id), eq(memberBlocks.blockedProfileId, me.id)));
  const blockedProfiles = new Set(blocks.flatMap((b) => [b.other, b.blocker]).filter((id) => id !== me.id));

  const conversations = await Promise.all(rows.map(async ({ thread }) => {
    const other = await counterpart(db, thread.id, authUser.id);
    const [last] = await db
      .select()
      .from(threadMessages)
      .where(and(eq(threadMessages.threadId, thread.id), isNull(threadMessages.deletedAt)))
      .orderBy(desc(threadMessages.createdAt))
      .limit(1);
    return {
      id: thread.id,
      other_profile_id: other?.profileId ?? null,
      other_name: other?.displayName ?? "A member",
      // A block hides the conversation from both sides without deleting it.
      blocked: other ? blockedProfiles.has(other.profileId) : false,
      last_message: last ? { body: last.body, created_at: last.createdAt.toISOString(), mine: last.authorUserId === authUser.id } : null,
      updated_at: thread.updatedAt.toISOString(),
    };
  }));

  return c.json({ conversations: conversations.filter((t) => !t.blocked) });
});

appRoutes.get("/threads/:id/messages", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const thread = await requireThreadParticipant(db, c.req.param("id"), authUser.id);

  const other = await counterpart(db, thread.id, authUser.id);
  if (other) {
    const [blocked] = await db.select({ b: memberBlocks.blockerProfileId }).from(memberBlocks)
      .where(or(
        and(eq(memberBlocks.blockerProfileId, me.id), eq(memberBlocks.blockedProfileId, other.profileId)),
        and(eq(memberBlocks.blockerProfileId, other.profileId), eq(memberBlocks.blockedProfileId, me.id)),
      )).limit(1);
    // A block severs an existing thread in both directions.
    if (blocked) throw new HttpError(404, "not_found", "Conversation not found.");
  }

  const messages = await db
    .select()
    .from(threadMessages)
    .where(and(eq(threadMessages.threadId, thread.id), isNull(threadMessages.deletedAt)))
    .orderBy(asc(threadMessages.createdAt))
    .limit(500);

  return c.json({
    conversation: {
      id: thread.id,
      other_profile_id: other?.profileId ?? null,
      other_name: other?.displayName ?? "A member",
    },
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      mine: m.authorUserId === authUser.id,
      created_at: m.createdAt.toISOString(),
    })),
  });
});

appRoutes.post(
  "/threads/:id/messages",
  zValidator("json", z.object({ body: z.string().trim().min(1).max(4000) })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const thread = await requireThreadParticipant(db, c.req.param("id"), authUser.id);

    const other = await counterpart(db, thread.id, authUser.id);
    if (other) {
      const [blocked] = await db.select({ b: memberBlocks.blockerProfileId }).from(memberBlocks)
        .where(or(
          and(eq(memberBlocks.blockerProfileId, me.id), eq(memberBlocks.blockedProfileId, other.profileId)),
          and(eq(memberBlocks.blockerProfileId, other.profileId), eq(memberBlocks.blockedProfileId, me.id)),
        )).limit(1);
      if (blocked) throw new HttpError(404, "not_found", "Conversation not found.");
    }

    const now = new Date();
    const [message] = await db
      .insert(threadMessages)
      .values({ threadId: thread.id, authorUserId: authUser.id, body: c.req.valid("json").body })
      .returning();
    // Bump the thread so the list orders by real activity.
    await db.update(threads).set({ updatedAt: now }).where(eq(threads.id, thread.id));

    return c.json({
      message: { id: message.id, body: message.body, mine: true, created_at: message.createdAt.toISOString() },
    });
  },
);


// ── P1 S2: DM policy + admin verification grants ────────────────────────────

const DM_ACCEPTS = ["members", "verified", "introductions_only", "nobody"] as const;

appRoutes.get("/me/dm-policy", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const [row] = await db.select().from(dmPolicies).where(eq(dmPolicies.profileId, me.id)).limit(1);
  return c.json({ accepts: row?.accepts ?? "members" });
});

appRoutes.patch(
  "/me/dm-policy",
  zValidator("json", z.object({ accepts: z.enum(DM_ACCEPTS) })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const accepts = c.req.valid("json").accepts;
    await db
      .insert(dmPolicies)
      .values({ profileId: me.id, accepts })
      .onConflictDoUpdate({ target: dmPolicies.profileId, set: { accepts, updatedAt: new Date() } });
    return c.json({ accepts });
  },
);

/**
 * Admin-granted verification — the manual review the founder does for advisors
 * and investors (§8.5). Broad reach must be earned, and this is where it is.
 */
appRoutes.post(
  "/admin/verifications",
  zValidator("json", z.object({
    member_role_id: z.string().uuid(),
    verification: z.enum(["investor", "advisor", "identity"]),
    evidence: z.enum(["admin_review", "member_vouch", "external_profile", "document"]).default("admin_review"),
    evidence_ref: z.string().trim().max(500).optional(),
    expires_in_days: z.number().int().min(1).max(3650).optional(),
  })),
  async (c) => {
    const { db, authUser } = await requireAdminUser(c);
    const input = c.req.valid("json");

    const [role] = await db.select().from(memberRoles)
      .where(eq(memberRoles.id, input.member_role_id)).limit(1);
    if (!role) throw new HttpError(404, "not_found", "Role not found.");
    if (role.role !== input.verification && input.verification !== "identity") {
      throw new HttpError(400, "role_mismatch",
        `That role is ${role.role}, not ${input.verification}.`);
    }

    const grant = await grantVerification(db, {
      subject: { memberRoleId: role.id },
      verification: input.verification,
      evidence: input.evidence,
      evidenceRef: input.evidence_ref ?? null,
      grantedBy: authUser.id,
      // Investor and advisor grants carry an expiry so trust decays rather than
      // silently outliving the review that produced it (§4.5).
      expiresAt: input.expires_in_days
        ? new Date(Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000)
        : input.verification === "investor" || input.verification === "advisor"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : null,
    });

    // A verified investor is the scarce side. Protect their inbox BY DEFAULT
    // rather than relying on them to find a setting (§8.3). Only when they have
    // no policy of their own — never overriding a choice they already made.
    if (input.verification === "investor") {
      await db
        .insert(dmPolicies)
        .values({ profileId: role.profileId, accepts: "introductions_only" })
        .onConflictDoNothing({ target: dmPolicies.profileId });

      // Investors are comped by design (§6.2) — we charge the side that wants
      // to reach them, not them. Without this they could receive introductions
      // and be unable to answer anyone, which is half a membership.
      const [owner] = await db
        .select({ userId: profiles.ownerUserId })
        .from(profiles)
        .where(eq(profiles.id, role.profileId))
        .limit(1);
      if (owner) {
        await db.insert(entitlementGrants).values({
          userId: owner.userId,
          entitlement: "dm.send.unlimited",
          reason: "comped investor — verified",
          grantedBy: authUser.id,
          // Tied to the verification's own lifetime: when the trust expires,
          // so does what it bought.
          expiresAt: grant.expiresAt ?? null,
        });
      }
    }

    return c.json({ granted: true, grant_id: grant.id, expires_at: grant.expiresAt?.toISOString() ?? null });
  },
);

appRoutes.post(
  "/admin/verifications/revoke",
  zValidator("json", z.object({
    member_role_id: z.string().uuid(),
    verification: z.enum(["investor", "advisor", "identity"]),
    reason: z.string().trim().min(1).max(300),
  })),
  async (c) => {
    const { db } = await requireAdminUser(c);
    const input = c.req.valid("json");
    const [role] = await db.select().from(memberRoles)
      .where(eq(memberRoles.id, input.member_role_id)).limit(1);

    const revoked = await revokeVerification(
      db, { memberRoleId: input.member_role_id }, input.verification, input.reason);
    if (revoked === 0) throw new HttpError(404, "not_found", "No live grant to revoke.");

    // Revoking the verification must revoke what it bought, or a revoked
    // investor keeps unlimited outreach forever.
    let entitlementsRevoked = 0;
    if (input.verification === "investor" && role) {
      const [owner] = await db.select({ userId: profiles.ownerUserId }).from(profiles)
        .where(eq(profiles.id, role.profileId)).limit(1);
      if (owner) {
        const rows = await db
          .update(entitlementGrants)
          .set({ revokedAt: new Date(), revokedReason: input.reason })
          .where(and(
            eq(entitlementGrants.userId, owner.userId),
            eq(entitlementGrants.entitlement, "dm.send.unlimited"),
            isNull(entitlementGrants.revokedAt),
          ))
          .returning({ id: entitlementGrants.id });
        entitlementsRevoked = rows.length;
      }
    }

    return c.json({ revoked, entitlements_revoked: entitlementsRevoked });
  },
);


// ── P1b: embedded payments (Stripe Elements) ────────────────────────────────
// Elements collects the card in our own page instead of redirecting. The flow
// is SetupIntent → confirmSetup in the browser → subscription created here with
// the resulting payment method, which avoids leaving `incomplete` subscriptions
// behind when someone abandons the form.

appRoutes.get("/billing/config", async (c) => {
  await requireAppUser(c);
  // Publishable keys are public by design; serving it avoids a rebuild when it
  // rotates, and keeps the FE from guessing which account/mode is live.
  return c.json({
    publishable_key: c.env.STRIPE_PUBLISHABLE_KEY ?? null,
    monthly_price: 2900,
    annual_price: 29000,
    currency: "usd",
  });
});

appRoutes.post("/billing/setup-intent", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  if (!c.env.STRIPE_SECRET_KEY) {
    throw new HttpError(503, "billing_unavailable", "Billing isn't configured yet.");
  }
  const existing = await membershipFor(db, authUser.id);
  const customerId = await ensureCustomer(c.env, {
    existingId: existing?.stripeCustomerId,
    email: authUser.email,
    userId: authUser.id,
    name: authUser.name,
  });

  // Remember the customer immediately: if the member abandons the form we must
  // not mint a second Stripe customer for them next time.
  await db
    .insert(memberships)
    .values({ userId: authUser.id, stripeCustomerId: customerId })
    .onConflictDoUpdate({ target: memberships.userId, set: { stripeCustomerId: customerId, updatedAt: new Date() } });

  const intent = await createSetupIntent(c.env, customerId);
  return c.json({ client_secret: intent.client_secret });
});

appRoutes.post(
  "/billing/subscribe",
  zValidator("json", z.object({
    plan: z.enum(["club", "club_annual"]),
    payment_method_id: z.string().min(1),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const input = c.req.valid("json");
    const priceId = input.plan === "club_annual" ? c.env.STRIPE_PRICE_CLUB_ANNUAL : c.env.STRIPE_PRICE_CLUB_MONTHLY;
    if (!priceId || !c.env.STRIPE_SECRET_KEY) {
      throw new HttpError(503, "billing_unavailable", "Billing isn't configured yet.");
    }

    const existing = await membershipFor(db, authUser.id);
    if (existing?.stripeSubscriptionId && existing.tier !== "free") {
      throw new HttpError(409, "already_subscribed", "You already have an active membership.");
    }

    const customerId = await ensureCustomer(c.env, {
      existingId: existing?.stripeCustomerId,
      email: authUser.email,
      userId: authUser.id,
      name: authUser.name,
    });

    // Stripe's own refusals (declined card, unusable payment method) are the
    // member's problem to fix, not a server fault — surface them as 400 with
    // Stripe's wording rather than a 500 the UI can only call "unknown error".
    let subscription;
    try {
      await attachPaymentMethod(c.env, input.payment_method_id, customerId);
      subscription = await createSubscription(c.env, {
        customerId,
        priceId,
        paymentMethodId: input.payment_method_id,
        userId: authUser.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "That payment couldn't be completed.";
      throw new HttpError(400, "payment_failed", message.replace(/^Stripe \S+ failed: /, ""));
    }

    // The webhook is still the authority — this response only tells the browser
    // what to render while `customer.subscription.created` is in flight.
    return c.json({
      subscription_id: subscription.id,
      status: subscription.status,
      active: subscription.status === "active" || subscription.status === "trialing",
    });
  },
);


// ── P1 S5: curated introductions (plan §8.3, §8A.7) ─────────────────────────
// The sanctioned path through a door that is deliberately locked: founders
// cannot cold-pitch investors, so this is how that conversation happens at all.

function publicIntroduction(
  row: typeof introductions.$inferSelect,
  viewerProfileId: string,
  other?: { display_name: string } | null,
) {
  const outgoing = row.requesterProfileId === viewerProfileId;
  return {
    id: row.id,
    direction: outgoing ? "outgoing" : "incoming",
    status: row.status,
    reason: row.reason,
    other_name: other?.display_name ?? "A member",
    other_profile_id: outgoing ? row.targetProfileId : row.requesterProfileId,
    created_at: row.createdAt.toISOString(),
    // The target must not learn an intro exists until curation lets it through.
    visible_to_target: row.status !== "pending_review" && row.status !== "rejected",
  };
}

appRoutes.post(
  "/introductions/requests",
  zValidator("json", z.object({
    profile_id: z.string().uuid(),
    reason: z.string().trim().min(20).max(1500),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");
    if (input.profile_id === me.id) throw new HttpError(400, "self_intro", "You can't request an introduction to yourself.");

    const [target] = await db.select().from(profiles).where(eq(profiles.id, input.profile_id)).limit(1);
    if (!target) throw new HttpError(404, "not_found", "Member not found.");

    // A block outranks everything, including the intro path.
    const [blocked] = await db.select({ b: memberBlocks.blockerProfileId }).from(memberBlocks)
      .where(or(
        and(eq(memberBlocks.blockerProfileId, me.id), eq(memberBlocks.blockedProfileId, target.id)),
        and(eq(memberBlocks.blockerProfileId, target.id), eq(memberBlocks.blockedProfileId, me.id)),
      )).limit(1);
    if (blocked) throw new HttpError(404, "not_found", "Member not found.");

    if (await areConnected(db, me.id, target.id)) {
      throw new HttpError(409, "already_connected", "You're already connected — just message them.");
    }

    // An intro request is an attempt to create an edge, so it draws on the same
    // outreach budget as DMs and connections. Otherwise it becomes the free
    // path that everything else was rationed to prevent.
    const budget = await outreachStatus(db, me.id, authUser.id);
    if (!budget.mayInitiate) {
      throw new HttpError(403, "upgrade_required", "Requesting introductions is part of paid membership.");
    }
    if (budget.penalised) {
      throw new HttpError(403, "outreach_paused", "Outreach is paused while your recent requests go unanswered.");
    }

    try {
      const [row] = await db.insert(introductions).values({
        requesterProfileId: me.id,
        targetProfileId: target.id,
        reason: input.reason,
      }).returning();
      return c.json({ introduction: publicIntroduction(row, me.id, { display_name: target.displayName }) });
    } catch {
      throw new HttpError(409, "already_requested", "You already have an introduction pending with this member.");
    }
  },
);

appRoutes.get("/me/introductions", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);
  const rows = await db
    .select({ intro: introductions, requester: profiles })
    .from(introductions)
    .innerJoin(profiles, eq(profiles.id, introductions.requesterProfileId))
    .where(or(
      eq(introductions.requesterProfileId, me.id),
      // Incoming only once curation has let it through — an intro under review
      // must be invisible to its target, or curation means nothing.
      and(
        eq(introductions.targetProfileId, me.id),
        inArray(introductions.status, ["awaiting_target", "accepted", "declined"]),
      ),
    ))
    .orderBy(desc(introductions.createdAt))
    .limit(100);

  const withNames = await Promise.all(rows.map(async ({ intro }) => {
    const otherId = intro.requesterProfileId === me.id ? intro.targetProfileId : intro.requesterProfileId;
    const [other] = await db.select({ display_name: profiles.displayName }).from(profiles)
      .where(eq(profiles.id, otherId)).limit(1);
    return publicIntroduction(intro, me.id, other);
  }));
  return c.json({ introductions: withNames });
});

/** The target's decision. Acceptance is the second half of two-sided consent. */
appRoutes.post(
  "/introductions/:id/respond",
  zValidator("json", z.object({ accept: z.boolean() })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const accept = c.req.valid("json").accept;

    const [row] = await db.select().from(introductions)
      .where(and(
        eq(introductions.id, c.req.param("id")),
        eq(introductions.targetProfileId, me.id),
        eq(introductions.status, "awaiting_target"),
      )).limit(1);
    if (!row) throw new HttpError(404, "not_found", "Introduction not found.");

    const now = new Date();
    if (!accept) {
      await db.update(introductions).set({ status: "declined", respondedAt: now })
        .where(eq(introductions.id, row.id));
      return c.json({ accepted: false });
    }

    // Both sides have now explicitly agreed to meet, so the connection is
    // created immediately — no request flow, and deliberately no cooling-off
    // period (§8A.4): the flow exists to establish consent, and consent is what
    // just happened.
    //
    // A live edge may already exist — commonly a connection request that was
    // sent and never answered. The pair-unique index makes a plain insert a
    // silent no-op there, which would leave both parties having said yes while
    // not being connected. Promote the existing row instead.
    let [connection] = await db.insert(memberConnections).values({
      requesterProfileId: row.requesterProfileId,
      recipientProfileId: row.targetProfileId,
      status: "accepted",
      source: "atlantium_intro",
      introductionId: row.id,
      acceptedAt: now,
    }).onConflictDoNothing().returning();

    if (!connection) {
      [connection] = await db
        .update(memberConnections)
        .set({ status: "accepted", source: "atlantium_intro", introductionId: row.id, acceptedAt: now })
        .where(and(
          inArray(memberConnections.status, ["pending", "accepted"]),
          or(
            and(
              eq(memberConnections.requesterProfileId, row.requesterProfileId),
              eq(memberConnections.recipientProfileId, row.targetProfileId),
            ),
            and(
              eq(memberConnections.requesterProfileId, row.targetProfileId),
              eq(memberConnections.recipientProfileId, row.requesterProfileId),
            ),
          ),
        ))
        .returning();
    }

    await db.update(introductions).set({ status: "accepted", respondedAt: now })
      .where(eq(introductions.id, row.id));

    return c.json({ accepted: true, connection_id: connection?.id ?? null });
  },
);

// ── Curation (admin) ────────────────────────────────────────────────────────

appRoutes.get("/admin/introductions", async (c) => {
  const { db } = await requireAdminUser(c);
  const rows = await db
    .select({ intro: introductions })
    .from(introductions)
    .where(eq(introductions.status, "pending_review"))
    .orderBy(asc(introductions.createdAt))
    .limit(100);

  const detailed = await Promise.all(rows.map(async ({ intro }) => {
    const [requester] = await db.select({ name: profiles.displayName }).from(profiles)
      .where(eq(profiles.id, intro.requesterProfileId)).limit(1);
    const [target] = await db.select({ name: profiles.displayName }).from(profiles)
      .where(eq(profiles.id, intro.targetProfileId)).limit(1);
    return {
      id: intro.id,
      reason: intro.reason,
      requester: { profile_id: intro.requesterProfileId, name: requester?.name ?? "—" },
      target: { profile_id: intro.targetProfileId, name: target?.name ?? "—" },
      created_at: intro.createdAt.toISOString(),
    };
  }));
  return c.json({ introductions: detailed });
});

appRoutes.post(
  "/admin/introductions/:id/decide",
  zValidator("json", z.object({ approve: z.boolean(), note: z.string().trim().max(500).optional() })),
  async (c) => {
    const { db, authUser } = await requireAdminUser(c);
    const input = c.req.valid("json");
    const [row] = await db.select().from(introductions)
      .where(and(eq(introductions.id, c.req.param("id")), eq(introductions.status, "pending_review")))
      .limit(1);
    if (!row) throw new HttpError(404, "not_found", "Introduction not found.");

    const [updated] = await db.update(introductions)
      .set({
        // Curation is what protects the target's inbox: rejected requests never
        // become visible to them at all.
        status: input.approve ? "awaiting_target" : "rejected",
        reviewNote: input.note ?? null,
        facilitatorUserId: authUser.id,
        reviewedAt: new Date(),
      })
      .where(eq(introductions.id, row.id))
      .returning();
    return c.json({ status: updated.status });
  },
);

/** Attribution: what the introduction actually became. */
appRoutes.post(
  "/admin/introductions/:id/outcome",
  zValidator("json", z.object({
    outcome: z.enum(["unknown", "no_response", "met", "ongoing", "hired", "invested", "dead"]),
    note: z.string().trim().max(500).optional(),
  })),
  async (c) => {
    const { db } = await requireAdminUser(c);
    const input = c.req.valid("json");
    const [updated] = await db.update(introductions)
      .set({ outcome: input.outcome, outcomeNote: input.note ?? null })
      .where(eq(introductions.id, c.req.param("id")))
      .returning();
    if (!updated) throw new HttpError(404, "not_found", "Introduction not found.");
    return c.json({ outcome: updated.outcome });
  },
);

/** The scoreboard the intro product is actually judged by. */
appRoutes.get("/admin/introductions/funnel", async (c) => {
  const { db } = await requireAdminUser(c);
  const rows = await db
    .select({ status: introductions.status, outcome: introductions.outcome, n: sql<number>`count(*)::int` })
    .from(introductions)
    .groupBy(introductions.status, introductions.outcome);

  const byStatus: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.n;
    if (r.outcome !== "unknown") byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + r.n;
  }
  const [connections] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberConnections)
    .where(sql`${memberConnections.introductionId} IS NOT NULL`);

  return c.json({
    requested: Object.values(byStatus).reduce((a, b) => a + b, 0),
    by_status: byStatus,
    connections_from_intros: connections?.n ?? 0,
    outcomes: byOutcome,
  });
});



// ── Org claims: how a founder gets the authority the rules require (§4.6) ───


// ── Service requests: the phone-call pipeline (training cohort first) ────────

const serviceRequestSchema = z.object({
  kind: z.string().refine((k) => k in SERVICES, "Unknown service."),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(7).max(24).optional(),
  answers: z.record(z.string(), z.string().max(600)).default({}),
});

/**
 * Public on purpose — the leads come off the job board, logged out. A session
 * at submit time links the request to the member, nothing more.
 */
appRoutes.post("/service-requests", zValidator("json", serviceRequestSchema), async (c) => {
  const input = c.req.valid("json");
  const db = createDb(c.env);
  const service = SERVICES[input.kind];

  // Only the questions the service actually asks survive into the row.
  const answers = Object.fromEntries(
    Object.entries(input.answers).filter(([k]) => service.questions.includes(k)),
  );

  const session = await getAuthSession(c.env, c.req.raw).catch(() => null);
  let profileId: string | null = null;
  if (session?.user?.id) {
    const [p] = await db.select({ id: profiles.id }).from(profiles)
      .where(eq(profiles.ownerUserId, session.user.id)).limit(1);
    profileId = p?.id ?? null;
  }

  // Mashing submit — or applying twice in a week — must not stack queue rows.
  // A live request for the same service+email is THE request.
  const [existing] = await db.select().from(serviceRequests).where(and(
    eq(serviceRequests.kind, input.kind),
    sql`lower(${serviceRequests.email}) = ${input.email.toLowerCase()}`,
    inArray(serviceRequests.status, ["new", "called", "offered"]),
  )).limit(1);
  if (existing) return c.json({ request: { id: existing.id, status: existing.status }, duplicate: true });

  const [row] = await db.insert(serviceRequests).values({
    kind: input.kind,
    userId: session?.user?.id ?? null,
    profileId,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    answers,
  }).returning();

  // The alert races nothing: the row is already committed, so a mail failure
  // costs speed, never the lead.
  c.executionCtx.waitUntil(notifyServiceRequest(c.env, {
    kind: input.kind, name: row.name, email: row.email, phone: row.phone, answers,
  }).catch(() => undefined));

  return c.json({ request: { id: row.id, status: row.status } });
});

/**
 * A member's own live request — so the inline form can show "you're in the
 * queue" instead of a blank form that looks like the application vanished.
 */
appRoutes.get("/service-requests/mine", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const kind = c.req.query("kind");
  if (!kind || !(kind in SERVICES)) throw new HttpError(400, "bad_kind", "Unknown service.");
  const [row] = await db.select().from(serviceRequests).where(and(
    eq(serviceRequests.kind, kind),
    or(
      eq(serviceRequests.userId, authUser.id),
      sql`lower(${serviceRequests.email}) = ${authUser.email.toLowerCase()}`,
    ),
    inArray(serviceRequests.status, ["new", "called", "offered", "paid", "fulfilled"]),
  )).orderBy(desc(serviceRequests.createdAt)).limit(1);
  return c.json({
    request: row ? { id: row.id, status: row.status, created_at: row.createdAt.toISOString() } : null,
  });
});

appRoutes.get("/admin/service-requests", async (c) => {
  const { db } = await requireAdminUser(c);
  const kind = c.req.query("kind");
  const rows = await db
    .select({ req: serviceRequests, memberName: profiles.displayName })
    .from(serviceRequests)
    .leftJoin(profiles, eq(profiles.id, serviceRequests.profileId))
    .where(kind ? eq(serviceRequests.kind, kind) : undefined)
    .orderBy(desc(serviceRequests.createdAt))
    .limit(200);
  return c.json({
    requests: rows.map(({ req, memberName }) => ({
      id: req.id,
      kind: req.kind,
      service: SERVICES[req.kind]?.title ?? req.kind,
      name: req.name,
      email: req.email,
      phone: req.phone,
      answers: req.answers,
      status: req.status,
      offer_cents: req.offerCents,
      payment_link_url: req.paymentLinkUrl,
      note: req.note,
      member: req.profileId ? { profile_id: req.profileId, name: memberName } : null,
      called_at: req.calledAt?.toISOString() ?? null,
      paid_at: req.paidAt?.toISOString() ?? null,
      created_at: req.createdAt.toISOString(),
    })),
  });
});

const serviceRequestUpdateSchema = z.object({
  status: z.enum(["new", "called", "offered", "paid", "fulfilled", "passed"]).optional(),
  offer_cents: z.number().int().min(100).max(2_000_000).optional(),
  note: z.string().max(2000).optional(),
});

appRoutes.post(
  "/admin/service-requests/:id/update",
  zValidator("json", serviceRequestUpdateSchema),
  async (c) => {
    const { db } = await requireAdminUser(c);
    const input = c.req.valid("json");
    const [updated] = await db.update(serviceRequests).set({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.status === "called" ? { calledAt: new Date() } : {}),
      ...(input.offer_cents !== undefined ? { offerCents: input.offer_cents } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    }).where(eq(serviceRequests.id, c.req.param("id"))).returning();
    if (!updated) throw new HttpError(404, "not_found", "Request not found.");
    return c.json({ status: updated.status });
  },
);

/**
 * The close-on-the-call button. Generates a checkout link at the offer amount —
 * the grant is already baked into the number, so the lead sees one price, paid
 * in full. The link is stored so it can be re-copied or re-sent.
 */
appRoutes.post("/admin/service-requests/:id/payment-link", async (c) => {
  const { db } = await requireAdminUser(c);
  const [row] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.id, c.req.param("id"))).limit(1);
  if (!row) throw new HttpError(404, "not_found", "Request not found.");
  if (!row.offerCents) throw new HttpError(400, "no_offer", "Set the offer amount first.");

  const service = SERVICES[row.kind];
  const sessionOut = await createOneTimeCheckout(c.env, {
    amountCents: row.offerCents,
    productName: service?.productName ?? service?.title ?? row.kind,
    email: row.email,
    metadata: { service_request_id: row.id },
    successUrl: "https://atlantium.ai/training?enrolled=1",
    cancelUrl: "https://atlantium.ai/training",
  });

  await db.update(serviceRequests).set({
    status: "offered",
    paymentLinkUrl: sessionOut.url,
    stripeSessionId: sessionOut.id,
  }).where(eq(serviceRequests.id, row.id));

  return c.json({ url: sessionOut.url });
});

appRoutes.get("/me/org-requests", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const me = await ensureDefaultProfile(db, authUser);

  const [requests, memberships] = await Promise.all([
    db.select({ req: orgRequests, org: directoryEntries })
      .from(orgRequests)
      .leftJoin(directoryEntries, eq(directoryEntries.id, orgRequests.entryId))
      .where(eq(orgRequests.profileId, me.id))
      .orderBy(desc(orgRequests.createdAt)),
    db.select({ membership: orgMemberships, org: directoryEntries })
      .from(orgMemberships)
      .innerJoin(directoryEntries, eq(directoryEntries.id, orgMemberships.entryId))
      .where(and(eq(orgMemberships.profileId, me.id), eq(orgMemberships.isCurrent, true))),
  ]);

  return c.json({
    requests: requests.map(({ req, org }) => ({
      id: req.id,
      kind: req.kind,
      status: req.status,
      relationship: req.relationship,
      org_name: org?.name ?? (req.proposed as { name?: string }).name ?? "—",
      decision_note: req.decisionNote,
      created_at: req.createdAt.toISOString(),
    })),
    // What they already hold, so the UI can say "you're set" rather than
    // inviting a second claim on the same company.
    memberships: memberships.map(({ membership, org }) => ({
      id: membership.id,
      org: { id: org.id, name: org.name, slug: org.slug },
      relationship: membership.relationship,
      authority: membership.authority,
    })),
  });
});

appRoutes.post(
  "/org-requests",
  zValidator("json", z.object({
    entry_id: z.string().uuid().optional(),
    proposed_name: z.string().trim().min(2).max(120).optional(),
    proposed_website: z.string().trim().max(200).optional(),
    relationship: z.enum(["founder", "executive", "recruiter", "representative", "employee"]).default("founder"),
    evidence: z.string().trim().max(1000).optional(),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const me = await ensureDefaultProfile(db, authUser);
    const input = c.req.valid("json");

    if (!input.entry_id && !input.proposed_name) {
      throw new HttpError(400, "org_required", "Pick your company, or tell us its name so we can add it.");
    }

    if (input.entry_id) {
      const [entry] = await db.select({ id: directoryEntries.id })
        .from(directoryEntries).where(eq(directoryEntries.id, input.entry_id)).limit(1);
      if (!entry) throw new HttpError(404, "not_found", "That organization isn't in the directory.");

      const [already] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
        .where(and(
          eq(orgMemberships.profileId, me.id),
          eq(orgMemberships.entryId, input.entry_id),
          eq(orgMemberships.isCurrent, true),
          ne(orgMemberships.authority, "none"),
        )).limit(1);
      if (already) throw new HttpError(409, "already_claimed", "You already represent this organization.");
    }

    try {
      const [row] = await db.insert(orgRequests).values({
        kind: input.entry_id ? "claim" : "create",
        profileId: me.id,
        entryId: input.entry_id ?? null,
        proposed: input.entry_id ? {} : { name: input.proposed_name, website: input.proposed_website },
        relationship: input.relationship,
        evidence: input.evidence ?? null,
      }).returning();
      return c.json({ request: { id: row.id, status: row.status, kind: row.kind } });
    } catch {
      throw new HttpError(409, "already_requested", "You already have a request pending for this organization.");
    }
  },
);

appRoutes.get("/admin/org-requests", async (c) => {
  const { db } = await requireAdminUser(c);
  const rows = await db
    .select({ req: orgRequests, org: directoryEntries, profile: profiles })
    .from(orgRequests)
    .leftJoin(directoryEntries, eq(directoryEntries.id, orgRequests.entryId))
    .innerJoin(profiles, eq(profiles.id, orgRequests.profileId))
    .where(eq(orgRequests.status, "pending"))
    .orderBy(asc(orgRequests.createdAt))
    .limit(100);

  return c.json({
    requests: rows.map(({ req, org, profile }) => ({
      id: req.id,
      kind: req.kind,
      relationship: req.relationship,
      evidence: req.evidence,
      member: { profile_id: profile.id, name: profile.displayName },
      org: org ? { id: org.id, name: org.name, slug: org.slug } : null,
      proposed: req.proposed,
      created_at: req.createdAt.toISOString(),
    })),
  });
});

appRoutes.post(
  "/admin/org-requests/:id/decide",
  zValidator("json", z.object({
    approve: z.boolean(),
    // Employment is not authority (§4.4): approving a claim says what they may
    // DO, and that is an explicit choice rather than a default.
    authority: z.enum(["none", "page_editor", "hiring", "admin"]).default("admin"),
    note: z.string().trim().max(500).optional(),
  })),
  async (c) => {
    const { db, authUser } = await requireAdminUser(c);
    const input = c.req.valid("json");

    const [row] = await db.select().from(orgRequests)
      .where(and(eq(orgRequests.id, c.req.param("id")), eq(orgRequests.status, "pending")))
      .limit(1);
    if (!row) throw new HttpError(404, "not_found", "Request not found.");

    const now = new Date();
    if (!input.approve) {
      await db.update(orgRequests)
        .set({ status: "rejected", decidedBy: authUser.id, decidedAt: now, decisionNote: input.note ?? null })
        .where(eq(orgRequests.id, row.id));
      return c.json({ status: "rejected" });
    }

    // A 'create' request adds the organization the member named. Slugified so
    // it lands in the same namespace the scrapers use.
    let entryId = row.entryId;
    if (!entryId) {
      const proposed = row.proposed as { name?: string; website?: string };
      const name = proposed.name?.trim();
      if (!name) throw new HttpError(400, "missing_name", "That request has no organization name.");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      const [created] = await db.insert(directoryEntries).values({
        kind: "company",
        slug,
        name,
        website: proposed.website ?? null,
      }).onConflictDoNothing().returning();
      if (created) {
        entryId = created.id;
      } else {
        const [existing] = await db.select({ id: directoryEntries.id }).from(directoryEntries)
          .where(and(eq(directoryEntries.kind, "company"), eq(directoryEntries.slug, slug))).limit(1);
        entryId = existing?.id ?? null;
      }
      if (!entryId) throw new HttpError(500, "create_failed", "Couldn't create that organization.");
    }

    const [membership] = await db.insert(orgMemberships).values({
      profileId: row.profileId,
      entryId,
      relationship: row.relationship,
      authority: input.authority,
    }).onConflictDoNothing().returning();

    const resolved = membership ?? (await db.select().from(orgMemberships)
      .where(and(
        eq(orgMemberships.profileId, row.profileId),
        eq(orgMemberships.entryId, entryId),
        eq(orgMemberships.relationship, row.relationship),
      )).limit(1))[0];

    // Approving a claim IS the verification — record it as one so the grant has
    // an author, an evidence trail and a revocation path.
    if (resolved && input.authority !== "none") {
      await grantVerification(db, {
        subject: { orgMembershipId: resolved.id },
        verification: "org_authority",
        evidence: "admin_review",
        evidenceRef: row.evidence ?? null,
        grantedBy: authUser.id,
      });
    }

    await db.update(orgRequests)
      .set({ status: "approved", decidedBy: authUser.id, decidedAt: now, decisionNote: input.note ?? null })
      .where(eq(orgRequests.id, row.id));

    return c.json({ status: "approved", entry_id: entryId, authority: input.authority });
  },
);

appRoutes.post(
  "/profile/edit",
  zValidator("json", z.object({
    profile: z.record(z.string(), z.unknown()).default({}),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const activeProfile = await ensureDefaultProfile(db, authUser);
    const body = c.req.valid("json");
    const input = body.profile;
    const displayName = typeof input.display_name === "string" && input.display_name.trim()
      ? input.display_name.trim()
      : typeof input.first_name === "string" && input.first_name.trim()
        ? input.first_name.trim()
        : activeProfile.displayName;
    const avatarUrl = typeof input.avatar_url === "string" ? input.avatar_url : activeProfile.avatarUrl;
    const metadata = {
      ...(activeProfile.metadata || {}),
      ...(typeof input.bio === "string" ? { bio: input.bio } : {}),
      ...(typeof input.location === "string" ? { location: input.location } : {}),
      ...(typeof input.website_url === "string" ? { website_url: input.website_url } : {}),
      ...(typeof input.linkedin_url === "string" ? { linkedin_url: input.linkedin_url } : {}),
      ...(typeof input.username === "string" ? { username: input.username } : {}),
    };

    const incomingRegistration = input.registration_details
      && typeof input.registration_details === "object"
      && !Array.isArray(input.registration_details)
      ? input.registration_details as Record<string, unknown>
      : null;
    const registrationDetails = incomingRegistration
      ? { ...(activeProfile.registrationDetails || {}), ...incomingRegistration }
      : (activeProfile.registrationDetails || {});
    const isCompleted = (registrationDetails as Record<string, unknown>).is_completed === true;
    const onboardingCompletedAt = isCompleted
      ? (activeProfile.onboardingCompletedAt ?? new Date())
      : activeProfile.onboardingCompletedAt;

    // Completing the questionnaire is what grants access — there is no review
    // queue. Only ever flips approval on; an admin suspension is undone by an
    // admin, not by the member resubmitting the form.
    if (isCompleted && !authUser.isApproved && !activeProfile.onboardingCompletedAt) {
      await db
        .update(user)
        .set({ isApproved: true, updatedAt: new Date() })
        .where(eq(user.id, authUser.id));
    }

    // First completion is the moment they become a member — the founder's
    // welcome goes out once, here. The metadata flag (not the completion
    // column) is the once-guard, so an admin questionnaire reset doesn't
    // re-welcome someone on their second pass through the form.
    const firstCompletion = isCompleted && !activeProfile.onboardingCompletedAt;
    const alreadyWelcomed = Boolean(
      (activeProfile.metadata as Record<string, unknown> | null)?.welcome_email,
    );
    if (firstCompletion && !alreadyWelcomed) {
      const reg = registrationDetails as Record<string, unknown>;
      const profileId = activeProfile.id;
      c.executionCtx.waitUntil((async () => {
        try {
          const result = await sendWelcomeEmail(c.env, authUser.email, {
            name: displayName || authUser.name,
            branch: typeof reg.branch === "string" ? reg.branch : null,
            headline: typeof reg.headline === "string" ? reg.headline : null,
            needs: Array.isArray(reg.needs) ? (reg.needs as string[]) : [],
            seeking: typeof reg.seeking === "string" ? reg.seeking : null,
            orgNamed: Boolean(reg.org_entry_id || reg.org_proposed_name),
          });
          await db
            .update(profiles)
            .set({
              metadata: sql`${profiles.metadata} || ${JSON.stringify({
                welcome_email: { at: new Date().toISOString(), ...result },
              })}::jsonb`,
            })
            .where(eq(profiles.id, profileId));
        } catch (error) {
          // A lost welcome never blocks membership; it just stays unmarked so
          // there's something to find when someone asks why it didn't arrive.
          console.error("welcome email error", error);
        }
      })());
    }

    const [updated] = await db
      .update(profiles)
      .set({
        displayName,
        avatarUrl,
        metadata,
        registrationDetails,
        onboardingCompletedAt,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, activeProfile.id))
      .returning();

    return c.json(publicProfile(authUser, {
      ...updated,
      role: activeProfile.role,
      isActive: activeProfile.isActive,
    }));
  },
);

appRoutes.get("/subscription", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  return c.json({ success: true, subscription: await getMembership(db, authUser.id) });
});

appRoutes.get("/realtime/config", async (c) => {
  await requireAppUser(c);
  return c.json({ realtime_hash: "" });
});

appRoutes.get("/lobby", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  await ensureDefaultProfile(db, authUser);
  await ensureLobbySeed(db);

  const roomRows = await db
    .select()
    .from(lobbyRooms)
    .where(eq(lobbyRooms.isActive, true))
    .orderBy(asc(lobbyRooms.type), asc(lobbyRooms.name));
  const events = await getLobbyEventSummary(db);
  const membership = await getMembership(db, authUser.id);
  const moderatorRoomIds = await listModeratorRoomIds(db, authUser);
  const activePermissions = await getLobbyPermissions(
    db,
    authUser,
    membership,
    events.activeEvent,
    moderatorRoomIds,
  );

  return c.json({
    success: true,
    server_time: new Date().toISOString(),
    membership,
    rooms: roomRows.map(publicLobbyRoom),
    active_event: events.activeEvent ? publicLobbyEvent(events.activeEvent) : null,
    upcoming_events: events.upcomingEvents.map(publicLobbyEvent),
    permissions: activePermissions,
    moderator_room_ids: moderatorRoomIds,
  });
});

appRoutes.get("/lobby/rooms/:roomId/messages", async (c) => {
  const { db } = await requireAppUser(c);
  const room = await getLobbyRoomOrThrow(db, c.req.param("roomId"));
  const rawLimit = Number(c.req.query("limit") || "50");
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), LOBBY_MESSAGE_LIMIT);
  const rows = await db
    .select({
      message: lobbyMessages,
      sender: user,
      profile: profiles,
    })
    .from(lobbyMessages)
    .innerJoin(user, eq(user.id, lobbyMessages.userId))
    .leftJoin(profileMembers, and(eq(profileMembers.userId, user.id), eq(profileMembers.isActive, true)))
    .leftJoin(profiles, eq(profiles.id, profileMembers.profileId))
    .where(and(eq(lobbyMessages.roomId, room.id), isNull(lobbyMessages.deletedAt)))
    .orderBy(desc(lobbyMessages.createdAt))
    .limit(limit);

  return c.json({
    success: true,
    room_id: room.id,
    messages: rows.reverse().map((row) => publicLobbyMessage(row.message, row.sender, row.profile)),
  });
});

appRoutes.post(
  "/lobby/rooms/:roomId/messages",
  zValidator("json", lobbyMessageSchema),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const activeProfile = await ensureDefaultProfile(db, authUser);
    const room = await getLobbyRoomOrThrow(db, c.req.param("roomId"));
    const body = c.req.valid("json");
    const [message] = await db
      .insert(lobbyMessages)
      .values({
        roomId: room.id,
        userId: authUser.id,
        content: body.content,
      })
      .returning();

    return c.json({
      success: true,
      message: publicLobbyMessage(message, authUser, activeProfile),
    }, 201);
  },
);

appRoutes.post("/lobby/rooms/:roomId/livekit-token", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const room = await getLobbyRoomOrThrow(db, c.req.param("roomId"));
  const membership = await getMembership(db, authUser.id);
  const moderatorRoomIds = await listModeratorRoomIds(db, authUser);
  const isModerator = moderatorRoomIds.includes(room.id);
  const canPublish = isModerator || membership.has_club_access;
  const publishReason = isModerator ? "moderator" : membership.has_club_access ? "paid_member" : "watch_only";

  if (!c.env.LIVEKIT_URL || !c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
    throw new HttpError(503, "livekit_not_configured", "LiveKit is not configured for this environment.", {
      can_publish: canPublish,
    });
  }

  const token = await createLiveKitToken(c.env, {
    identity: authUser.id,
    name: activeProfile.displayName || authUser.email,
    roomName: room.livekitRoomName,
    ttlSeconds: 60 * 60 * 2,
    grant: {
      roomJoin: true,
      room: room.livekitRoomName,
      canSubscribe: true,
      canPublish,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    },
    metadata: {
      email: authUser.email,
      membership_tier: membership.membership_tier,
      is_moderator: isModerator,
      can_publish: canPublish,
      lobby_room: room.slug,
    },
  });

  return c.json({
    success: true,
    token,
    url: c.env.LIVEKIT_URL,
    room_name: room.livekitRoomName,
    permissions: {
      can_watch: true,
      can_publish: canPublish,
      publish_reason: publishReason,
      next_free_publish_at: null,
      is_moderator: isModerator,
    },
  });
});

appRoutes.post("/lobby/events/:eventId/livekit-token", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const event = await getLobbyEventOrThrow(db, c.req.param("eventId"));
  const now = new Date();
  if (!isEventLive(event, now)) {
    throw new HttpError(409, "office_hours_not_live", "Office hours are not live right now.");
  }

  const membership = await getMembership(db, authUser.id);
  const moderatorRoomIds = await listModeratorRoomIds(db, authUser);
  const isModerator = moderatorRoomIds.includes(event.roomId);
  const publish = await resolvePublishAccess(db, authUser.id, membership, event, isModerator, now);

  if (!c.env.LIVEKIT_URL || !c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
    throw new HttpError(503, "livekit_not_configured", "LiveKit is not configured for this environment.", {
      can_publish: publish.canPublish,
    });
  }

  await recordLobbyAttendance(db, event.id, authUser.id, publish.consumeFreePass);

  const token = await createLiveKitToken(c.env, {
    identity: authUser.id,
    name: activeProfile.displayName || authUser.email,
    roomName: event.livekitRoomName,
    ttlSeconds: 60 * 60 * 2,
    grant: {
      roomJoin: true,
      room: event.livekitRoomName,
      canSubscribe: true,
      canPublish: publish.canPublish,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    },
    metadata: {
      email: authUser.email,
      membership_tier: membership.membership_tier,
      is_moderator: isModerator,
      can_publish: publish.canPublish,
    },
  });

  return c.json({
    success: true,
    token,
    url: c.env.LIVEKIT_URL,
    room_name: event.livekitRoomName,
    permissions: {
      can_watch: true,
      can_publish: publish.canPublish,
      publish_reason: publish.reason,
      next_free_publish_at: publish.nextFreePublishAt,
      is_moderator: isModerator,
    },
  });
});

appRoutes.post("/lobby/events/:eventId/mod/mute-all", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const event = await getLobbyEventOrThrow(db, c.req.param("eventId"));
  await requireLobbyModerator(db, authUser, event.roomId);
  const result = await muteLiveKitRoom(c, event.livekitRoomName);
  return c.json({ success: true, ...result });
});

appRoutes.post(
  "/lobby/events/:eventId/mod/mute-user",
  zValidator("json", lobbyTargetSchema),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const event = await getLobbyEventOrThrow(db, c.req.param("eventId"));
    await requireLobbyModerator(db, authUser, event.roomId);
    const body = c.req.valid("json");
    const result = await muteLiveKitParticipant(c, event.livekitRoomName, body.target_user_id, body.track_type);
    return c.json({ success: true, ...result });
  },
);

appRoutes.post(
  "/lobby/events/:eventId/mod/remove-user",
  zValidator("json", lobbyTargetSchema.pick({ target_user_id: true })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const event = await getLobbyEventOrThrow(db, c.req.param("eventId"));
    await requireLobbyModerator(db, authUser, event.roomId);
    const body = c.req.valid("json");
    await callLiveKitRoomService(c, event.livekitRoomName, "RemoveParticipant", {
      room: event.livekitRoomName,
      identity: body.target_user_id,
    });
    return c.json({ success: true, removed_user_id: body.target_user_id });
  },
);

appRoutes.post(
  "/lobby/events/:eventId/mod/spotlight",
  zValidator("json", lobbySpotlightSchema),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const event = await getLobbyEventOrThrow(db, c.req.param("eventId"));
    await requireLobbyModerator(db, authUser, event.roomId);
    const body = c.req.valid("json");
    const metadata = {
      ...safeRecord(event.metadata),
      spotlightUserId: body.target_user_id || null,
      spotlightedAt: new Date().toISOString(),
    };
    const [updated] = await db
      .update(lobbyEvents)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(lobbyEvents.id, event.id))
      .returning();
    return c.json({ success: true, event: publicLobbyEvent(updated) });
  },
);

appRoutes.get("/auth/dev-code", async (c) => {
  if (!isDebugAuthCodes(c.env)) throw new HttpError(404, "not_found", "Route not found.");
  const email = c.req.query("email")?.trim().toLowerCase();
  if (!email) throw new HttpError(400, "email_required", "email is required.");
  const db = createDb(c.env);
  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, `sign-in-otp-${email}`))
    .limit(1);
  const code = row?.value?.split(":")[0] ?? null;
  return c.json({ code });
});

appRoutes.get("/profiles", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  await ensureDefaultProfile(db, authUser);
  return c.json({ profiles: await listProfiles(db, authUser.id) });
});

appRoutes.post(
  "/profiles",
  zValidator("json", z.object({
    displayName: z.string().trim().min(1),
    type: z.enum(["personal", "child", "team"]).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })),
  async (c) => {
    const { db, authUser } = await requireAppUser(c);
    const body = c.req.valid("json");
    const [profile] = await db
      .insert(profiles)
      .values({
        ownerUserId: authUser.id,
        displayName: body.displayName,
        slug: `${slugify(body.displayName)}-${crypto.randomUUID().slice(0, 8)}`,
        type: body.type ?? "personal",
        avatarUrl: body.avatarUrl ?? null,
        metadata: body.metadata,
      })
      .returning();
    await db.insert(profileMembers).values({
      profileId: profile.id,
      userId: authUser.id,
      role: body.type === "child" ? "guardian" : "owner",
      isActive: false,
    });
    return c.json({ profile }, 201);
  },
);

appRoutes.post("/profiles/:id/select", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const profile = await setActiveProfile(db, authUser.id, c.req.param("id"));
  if (!profile) throw new HttpError(404, "profile_not_found", "Profile not found.");
  return c.json({ profile });
});

appRoutes.get("/handoff/current-user", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  return c.json({
    externalUserId: profileExternalUserId(activeProfile),
    email: authUser.email,
    name: activeProfile.displayName,
    metadata: {
      atlantiumUserId: authUser.id,
      atlantiumProfileId: activeProfile.id,
      profileType: activeProfile.type,
    },
  });
});

// Public referral click-through — the one link affiliates share anywhere
// (Instagram bio, Telegram, Discord, email; any plain HTTP GET works, no JS).
// Records a link_clicks event against the member's referral code on Boomin,
// then 302s to the site with ?ref= so signups keep their attribution.
// Tracking must NEVER block the redirect.
appRoutes.get("/r/:code", async (c) => {
  const code = c.req.param("code").trim();
  const destination = new URL(c.env.REFERRAL_LANDING_URL || "https://atlantium.ai/");
  if (code) {
    destination.searchParams.set("ref", code);
    try {
      await recordReferralClick({
        issuer: BOOMIN_ISSUER,
        signingSecret: requireEnv(c.env, "HANDOFF_SIGNING_SECRET"),
        publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
        partnerRef: code,
        eventType: "referral_click",
        occurredAt: new Date().toISOString(),
        apiBase: boominConnectApiBase(c.env),
        metadata: {
          source: "referral_link",
          utm_source: c.req.query("utm_source") || null,
          utm_medium: c.req.query("utm_medium") || null,
          utm_campaign: c.req.query("utm_campaign") || null,
          referrer: c.req.header("referer") || null,
          user_agent: c.req.header("user-agent") || null,
        },
      });
    } catch {
      // Unknown code, Boomin outage, or signature drift — the visitor still
      // lands on the site; the click is just not counted.
    }
  }
  return c.redirect(destination.toString(), 302);
});

appRoutes.get("/handoff/boomin/join", async (c) => {
  const mode = c.req.query("mode") || "redirect";
  const { redirectUri, options } = await buildHandoffOptions(c);
  const apiBase = boominConnectApiBase(c.env);

  try {
    const result = await postHandoff(options);
    if (mode === "json") {
      return jsonWithStatus({ success: true, targetUrl: `${apiBase}/handoff`, boomin: result }, 200);
    }
    const authUrl = typeof result.authUrl === "string"
      ? result.authUrl
      : typeof result.auth_url === "string" ? result.auth_url : null;
    if (authUrl) return c.redirect(authUrl);
    return c.redirect(withBoominParams(redirectUri, {
      boomin_status: String(result.status || "pending_approval"),
      boomin_session_id: String(result.sessionId || result.session_id || ""),
      boomin_username: getNestedString(result, ["instagram", "username"]) || "",
    }));
  } catch (error) {
    const sdkError = error as BoominSdkError;
    const status = sdkError.status || 502;
    const body = sdkError.response || { code: sdkError.code, message: sdkError.message };
    if (mode === "json") {
      return jsonWithStatus({ success: false, targetUrl: `${apiBase}/handoff`, boomin: body }, status);
    }
    return c.redirect(withBoominParams(redirectUri, {
      boomin_status: "failed",
      boomin_error: String(sdkError.code || "handoff_failed"),
      boomin_error_detail: String(sdkError.message || "Boomin could not start the partner handoff."),
    }));
  }
});

appRoutes.get("/handoff/boomin/status", async (c) => {
  const { options } = await buildHandoffOptions(c);
  try {
    const result = await postHandoff(options);
    return jsonWithStatus({ success: true, boomin: result }, 200);
  } catch (error) {
    const sdkError = error as BoominSdkError;
    const body = sdkError.response || { code: sdkError.code, message: sdkError.message };
    return jsonWithStatus({ success: false, boomin: body }, sdkError.status || 502);
  }
});

// MEMBER endpoint: scoped to the caller's OWN standing row. Without an
// externalUserId the signed standing call returns the whole program roster,
// which any approved member could read — that full view belongs only to the
// admin endpoint below. Boomin's standing response passes through verbatim
// (see @boomin/server getPartnerStanding), so each partner row carries the
// evergreen `referral` object and the additive `deployments[]` campaign links.
appRoutes.get("/dashboard/creators", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  return creatorStandingResponse(c, profileExternalUserId(activeProfile));
});

appRoutes.get("/admin/partnerships/creators", async (c) => {
  await requireAdminUser(c);
  return creatorStandingResponse(c);
});

appRoutes.post("/dashboard/creators/test-click", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const partnerRef = profileExternalUserId(activeProfile);
  const metricOptions = buildMetricOptions(c, partnerRef, "link_clicks");
  const standingOptions = buildStandingOptions(c, partnerRef);

  let event: Record<string, unknown> = {};
  let eventOk = true;
  let eventStatus = 200;
  try {
    event = await recordReferralClick(metricOptions);
  } catch (error) {
    const sdkError = error as BoominSdkError;
    eventOk = false;
    eventStatus = sdkError.status || 502;
    event = sdkError.response || { code: sdkError.code, message: sdkError.message };
  }

  let standing: Record<string, unknown> = {};
  let standingOk = true;
  let standingStatus = 200;
  try {
    standing = await getPartnerStanding(standingOptions);
  } catch (error) {
    const sdkError = error as BoominSdkError;
    standingOk = false;
    standingStatus = sdkError.status || 502;
    standing = sdkError.response || { code: sdkError.code, message: sdkError.message };
  }

  const success = eventOk && standingOk;
  const status = success ? 200 : eventOk ? standingStatus : eventStatus;
  return jsonWithStatus({ success, event, ...standing }, status);
});

appRoutes.post("/admin/partnerships/creators/test-click", async (c) => {
  const { db, authUser } = await requireAdminUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const partnerRef = profileExternalUserId(activeProfile);
  const metricOptions = buildMetricOptions(c, partnerRef, "link_clicks");
  const standingOptions = buildStandingOptions(c, partnerRef);

  let event: Record<string, unknown> = {};
  let eventOk = true;
  let eventStatus = 200;
  try {
    event = await recordReferralClick(metricOptions);
  } catch (error) {
    const sdkError = error as BoominSdkError;
    eventOk = false;
    eventStatus = sdkError.status || 502;
    event = sdkError.response || { code: sdkError.code, message: sdkError.message };
  }

  let standing: Record<string, unknown> = {};
  let standingOk = true;
  let standingStatus = 200;
  try {
    standing = await getPartnerStanding(standingOptions);
  } catch (error) {
    const sdkError = error as BoominSdkError;
    standingOk = false;
    standingStatus = sdkError.status || 502;
    standing = sdkError.response || { code: sdkError.code, message: sdkError.message };
  }

  const success = eventOk && standingOk;
  if (!success) {
    const fallback = await localBoominAppStanding(c).catch(() => null);
    if (fallback) {
      return jsonWithStatus({
        success: true,
        event: eventOk ? event : { skipped: true, reason: event },
        ...fallback,
      }, 200);
    }
  }
  const status = success ? 200 : eventOk ? standingStatus : eventStatus;
  return jsonWithStatus({ success, event, ...standing }, status);
});

// ── Job postings (scraped Atlanta AI/tech board, public read) ───────────────
const jobPostingWriteSchema = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  location: z.string().trim().min(1),
  workplace_type: z.string().trim().nullish(),
  seniority: z.string().trim().nullish(),
  salary_min: z.number().int().nullish(),
  salary_max: z.number().int().nullish(),
  apply_url: z.string().trim().url(),
  status: z.string().trim().optional(),
  posted_at: z.string().datetime({ offset: true }).nullish(),
  content: z.record(z.string(), z.unknown()).nullish(),
});

function publicJobPosting(row: typeof jobPostings.$inferSelect, hasBenefits = false) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    company: row.company,
    location: row.location,
    workplace_type: row.workplaceType,
    seniority: row.seniority,
    salary_min: row.salaryMin,
    salary_max: row.salaryMax,
    apply_url: hasBenefits ? row.applyUrl : null,
    apply_gated: !hasBenefits,
    status: row.status,
    posted_at: row.postedAt?.toISOString() ?? null,
    content: row.content ?? {},
    review: publicReview(row.review as Record<string, unknown> | null),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

// Public slice of the AI review — verification signal only, never the
// internal notes/flags.
function publicReview(review: Record<string, unknown> | null) {
  if (!review) return null;
  return {
    verified_at: typeof review.verified_at === "string" ? review.verified_at : null,
    status: typeof review.status === "string" ? review.status : null,
    degree_required: typeof review.degree_required === "string" ? review.degree_required : null,
  };
}

function jobSlug(title: string, company: string) {
  const base = slugify(`${company} ${title}`);
  const salt = crypto.randomUUID().slice(0, 8);
  return `${base}-${salt}`;
}

// Manual trigger for the weekly cron rescrape (same code path). Runs inline
// so the response carries the sync counts.
appRoutes.post("/admin/jobs/rescrape", async (c) => {
  await requireAdminUser(c);
  const result = await syncJobPostings(c.env);
  return c.json({ success: true, ...result });
});

// ── AI job review ───────────────────────────────────────────────────────────

// Manually run one review cycle (poll finished batches, submit next shard) —
// the same code path the 30-min cron runs.
appRoutes.post("/admin/review/run", async (c) => {
  await requireAdminUser(c);
  const result = await runReviewCycle(c.env);
  return c.json({ success: true, ...result });
});

appRoutes.get("/admin/review/status", async (c) => {
  await requireAdminUser(c);
  const status = await reviewStatus(c.env);
  return c.json(status);
});

// ── Weekly digest ───────────────────────────────────────────────────────────

// Signed one-click unsubscribe — must work logged-out from an email client.
appRoutes.get("/email/unsubscribe", async (c) => {
  const email = c.req.query("email")?.trim().toLowerCase();
  const sig = c.req.query("sig") ?? "";
  if (!email || !(await verifyUnsubscribeSig(c.env, email, sig))) {
    throw new HttpError(400, "invalid_link", "This unsubscribe link is invalid or expired.");
  }
  const db = createDb(c.env);
  await db
    .insert(digestSuppressions)
    .values({ email, reason: "unsubscribed" })
    .onConflictDoNothing({ target: digestSuppressions.email });
  return c.html(
    `<!doctype html><body style="font-family:system-ui;background:#0b1220;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
      <div style="text-align:center;max-width:420px;padding:24px;">
        <h1 style="font-size:22px;">You're unsubscribed</h1>
        <p style="color:#94a3b8;line-height:1.6;">${email} won't get the weekly report anymore. Changed your mind? Sign in at atlantium.ai and rejoin from the jobs page.</p>
      </div>
    </body>`,
  );
});

// RFC 8058 one-click unsubscribe (mail clients POST here).
appRoutes.post("/email/unsubscribe", async (c) => {
  const email = c.req.query("email")?.trim().toLowerCase();
  const sig = c.req.query("sig") ?? "";
  if (!email || !(await verifyUnsubscribeSig(c.env, email, sig))) {
    throw new HttpError(400, "invalid_link", "Invalid unsubscribe link.");
  }
  const db = createDb(c.env);
  await db
    .insert(digestSuppressions)
    .values({ email, reason: "unsubscribed" })
    .onConflictDoNothing({ target: digestSuppressions.email });
  return c.json({ success: true });
});

// Admin: send the digest. {test:true} → only to the calling admin's inbox;
// {force:true} → bypass the week run-lock (e.g. re-send after a fix).
appRoutes.post(
  "/admin/digest/send",
  zValidator("json", z.object({ test: z.boolean().optional(), force: z.boolean().optional() }).optional()),
  async (c) => {
    const { authUser: adminUser } = await requireAdminUser(c);
    const body = c.req.valid("json") ?? {};
    const result = await sendWeeklyDigest(c.env, {
      testTo: body.test === false ? undefined : adminUser.email,
      force: body.force,
    });
    return c.json({ success: true, ...result });
  },
);

// Dev-only rendered preview (guarded by the debug-codes flag, never on in prod).
appRoutes.get("/digest/preview", async (c) => {
  if (!isDebugAuthCodes(c.env)) {
    throw new HttpError(404, "not_found", "Route not found.");
  }
  const db = createDb(c.env);
  const sections = await buildSections(db);
  const unsub = await unsubscribeUrl(c.env, "preview@example.com");
  return c.html(renderDigest(sections, unsub));
});

appRoutes.get("/job_postings", async (c) => {
  const db = createDb(c.env);
  const status = c.req.query("status") ?? "active";
  const workplaceType = c.req.query("workplace_type");
  const seniority = c.req.query("seniority");
  const q = c.req.query("q")?.trim();
  const conditions = [eq(jobPostings.status, status)];
  if (workplaceType) conditions.push(eq(jobPostings.workplaceType, workplaceType));
  if (seniority) conditions.push(eq(jobPostings.seniority, seniority));
  if (q) {
    const like = `%${q}%`;
    const search = or(
      ilike(jobPostings.title, like),
      ilike(jobPostings.company, like),
      sql`${jobPostings.content}->>'tech_stack' ILIKE ${like}`,
    );
    if (search) conditions.push(search);
  }
  if (c.req.query("no_degree") === "1") {
    conditions.push(
      sql`${jobPostings.review}->>'degree_required' in ('not_required','equivalent_accepted')`,
    );
  }
  const where = and(...conditions);
  // Stable order: created_at ties within a scrape batch, so id is the tiebreak.
  const order = [
    sql`${jobPostings.postedAt} DESC NULLS LAST`,
    desc(jobPostings.createdAt),
    asc(jobPostings.id),
  ];

  const listHasBenefits = await hasMemberBenefits(c);

  if (c.req.query("format") !== "paged") {
    // Legacy bare-array shape for older bundles/scripts — newest 500.
    const rows = await db.select().from(jobPostings).where(where).orderBy(...order).limit(500);
    return c.json(rows.map((row) => publicJobPosting(row, listHasBenefits)));
  }

  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 60, 1), 200);
  const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // 48h, not 24h: the daily scrape can slip and a 24h window would read empty.
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [rows, totals] = await Promise.all([
    db.select().from(jobPostings).where(where).orderBy(...order).limit(limit).offset(offset),
    db
      .select({
        total: sql<number>`count(*)::int`,
        remote: sql<number>`count(*) filter (where ${jobPostings.workplaceType} = 'Remote')::int`,
        hybrid: sql<number>`count(*) filter (where ${jobPostings.workplaceType} = 'Hybrid')::int`,
        newThisWeek: sql<number>`count(*) filter (where coalesce(${jobPostings.postedAt}, ${jobPostings.createdAt}) > ${weekAgo})::int`,
        new48h: sql<number>`count(*) filter (where coalesce(${jobPostings.postedAt}, ${jobPostings.createdAt}) > ${twoDaysAgo})::int`,
        noDegree: sql<number>`count(*) filter (where ${jobPostings.review}->>'degree_required' in ('not_required','equivalent_accepted'))::int`,
      })
      .from(jobPostings)
      .where(where),
  ]);
  const t = totals[0];
  return c.json({
    jobs: rows.map((row) => publicJobPosting(row, listHasBenefits)),
    total: t?.total ?? 0,
    counts: {
      remote: t?.remote ?? 0,
      hybrid: t?.hybrid ?? 0,
      new_this_week: t?.newThisWeek ?? 0,
      new_48h: t?.new48h ?? 0,
      no_degree: t?.noDegree ?? 0,
    },
    limit,
    offset,
  });
});

appRoutes.get("/job_postings/:slug", async (c) => {
  const db = createDb(c.env);
  const row = await db.query.jobPostings.findFirst({
    where: eq(jobPostings.slug, c.req.param("slug")),
  });
  if (!row) throw new HttpError(404, "not_found", "Job posting not found.");
  return c.json(publicJobPosting(row, await hasMemberBenefits(c)));
});

// The official application link — the one thing on a job page that needs a
// free account. Everything else stays public so the posting is shareable.
appRoutes.get("/job_postings/:slug/apply", async (c) => {
  await ensureMemberInGoodStanding(c);
  const { db, authUser } = await requireAppUser(c);
  const row = await db.query.jobPostings.findFirst({
    where: eq(jobPostings.slug, c.req.param("slug")),
  });
  if (!row) throw new HttpError(404, "not_found", "Job posting not found.");
  await captureEvent(db, "job_apply_revealed", authUser.id, null, {
    slug: row.slug,
    company: row.company,
  });
  return c.json({ apply_url: row.applyUrl });
});

appRoutes.post(
  "/job_postings/create",
  zValidator("json", jobPostingWriteSchema),
  async (c) => {
    const { db } = await requireAdminUser(c);
    const body = c.req.valid("json");
    const [row] = await db
      .insert(jobPostings)
      .values({
        slug: jobSlug(body.title, body.company),
        title: body.title,
        company: body.company,
        location: body.location,
        workplaceType: body.workplace_type ?? null,
        seniority: body.seniority ?? null,
        salaryMin: body.salary_min ?? null,
        salaryMax: body.salary_max ?? null,
        applyUrl: body.apply_url,
        status: body.status ?? "active",
        postedAt: body.posted_at ? new Date(body.posted_at) : null,
        content: body.content ?? {},
      })
      .onConflictDoNothing({ target: jobPostings.applyUrl })
      .returning();
    if (!row) throw new HttpError(409, "duplicate", "A posting with this apply_url already exists.");
    return c.json(publicJobPosting(row));
  },
);

appRoutes.post(
  "/job_postings/:jobId/update",
  zValidator("json", jobPostingWriteSchema.partial()),
  async (c) => {
    const { db } = await requireAdminUser(c);
    const body = c.req.valid("json");
    const [row] = await db
      .update(jobPostings)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.company !== undefined && { company: body.company }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.workplace_type !== undefined && { workplaceType: body.workplace_type }),
        ...(body.seniority !== undefined && { seniority: body.seniority }),
        ...(body.salary_min !== undefined && { salaryMin: body.salary_min }),
        ...(body.salary_max !== undefined && { salaryMax: body.salary_max }),
        ...(body.apply_url !== undefined && { applyUrl: body.apply_url }),
        ...(body.status !== undefined && { status: body.status ?? "active" }),
        ...(body.posted_at !== undefined && { postedAt: body.posted_at ? new Date(body.posted_at) : null }),
        ...(body.content !== undefined && { content: body.content ?? {} }),
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, c.req.param("jobId")))
      .returning();
    if (!row) throw new HttpError(404, "not_found", "Job posting not found.");
    return c.json({ success: true, job: publicJobPosting(row) });
  },
);

appRoutes.post("/job_postings/:jobId/delete", async (c) => {
  const { db } = await requireAdminUser(c);
  const [row] = await db
    .delete(jobPostings)
    .where(eq(jobPostings.id, c.req.param("jobId")))
    .returning();
  if (!row) throw new HttpError(404, "not_found", "Job posting not found.");
  return c.json({ success: true, message: "Job posting deleted." });
});

async function creatorStandingResponse(c: Context<{ Bindings: Env }>, externalUserId?: string) {
  const options = buildStandingOptions(c, externalUserId);
  try {
    const result = await getPartnerStanding(options);
    return jsonWithStatus({ success: true, ...result }, 200);
  } catch (error) {
    const fallback = await localBoominAppStanding(c, externalUserId).catch(() => null);
    if (fallback) return jsonWithStatus({ success: true, ...fallback }, 200);

    const sdkError = error as BoominSdkError;
    const body = sdkError.response || { code: sdkError.code, message: sdkError.message };
    return jsonWithStatus({ success: false, ...body }, sdkError.status || 502);
  }
}

async function localBoominAppStanding(c: Context<{ Bindings: Env }>, externalUserId?: string) {
  if (!isDebugAuthCodes(c.env)) return null;
  const apiBase = c.env.BOOMIN_APP_API_BASE?.replace(/\/+$/, "");
  const email = c.env.BOOMIN_APP_STANDING_EMAIL?.trim().toLowerCase();
  const programId = c.env.BOOMIN_APP_STANDING_PROGRAM_ID || c.env.BOOMIN_CONNECT_PROGRAM_ID;
  if (!apiBase || !email || !programId) return null;

  const otpResponse = await fetch(`${apiBase}/auth/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const otp = await otpResponse.json().catch(() => ({})) as { code?: string; message?: string };
  if (!otpResponse.ok) throw new Error(otp.message || "Could not request local Boomin standing OTP.");

  const verifyResponse = await fetch(`${apiBase}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: otp.code || "123456" }),
  });
  const verified = await verifyResponse.json().catch(() => ({})) as { auth_token?: string; message?: string };
  if (!verifyResponse.ok || !verified.auth_token) {
    throw new Error(verified.message || "Could not verify local Boomin standing OTP.");
  }

  const standingResponse = await fetch(`${apiBase}/programs/${programId}/standing`, {
    headers: { Authorization: `Bearer ${verified.auth_token}` },
  });
  const standing = await standingResponse.json().catch(() => ({})) as {
    partners?: LocalBoominAppMember[];
    message?: string;
  };
  if (!standingResponse.ok || !Array.isArray(standing.partners)) {
    throw new Error(standing.message || "Could not load local Boomin app standing.");
  }

  const partners = standing.partners
    .filter(isAtlantiumHandoffPartner)
    // Same scoping contract as the signed standing call: when the caller is a
    // member (externalUserId set), only their own enrollment may come back.
    .filter((row) => !externalUserId || localPartnerExternalUserId(row) === externalUserId)
    .map((row) => normalizeLocalBoominPartner(c.env, row));
  return {
    source: "local_boomin_app",
    partners,
    totals: standingTotals(partners),
  };
}

function isAtlantiumHandoffPartner(row: LocalBoominAppMember) {
  const connectMetadata = getRecord(row, "connectMetadata") || getRecord(row, "connect_metadata");
  const partnerMetadata = getRecord(row.partner, "metadata");
  return getString(connectMetadata, "issuer") === BOOMIN_ISSUER
    || getString(connectMetadata, "handoffIssuer") === BOOMIN_ISSUER
    || getString(partnerMetadata, "handoffIssuer") === BOOMIN_ISSUER;
}

function normalizeLocalBoominPartner(env: Env, row: LocalBoominAppMember) {
  const {
    partner,
    instagram,
    partnerConnection,
    tier,
    qualification,
    rollups = [],
    ...member
  } = row;
  const referralCode = getString(member, "referralCode") || getString(member, "referral_code");
  const referralBase = `${env.APP_BASE_URL || "https://atlantium.ai"}/creator-program`;

  return {
    member: {
      ...member,
      approvalStatus: getString(member, "approvalStatus") || getString(member, "approval_status") || "pending",
      qualificationStatus: getString(member, "qualificationStatus") || getString(member, "qualification_status") || getNestedStatus(qualification) || "pending",
      referralCode,
    },
    partner,
    externalIdentity: {
      name: getString(partner, "name") || getString(member, "name"),
      email: getString(partner, "email") || getString(member, "email"),
    },
    instagram,
    partnerConnection,
    tier,
    qualification,
    rollups,
    referralCode,
    referral: referralCode
      ? { code: referralCode, url: `${referralBase}?ref=${encodeURIComponent(referralCode)}` }
      : null,
    metrics: metricsFromRollups(rollups),
  };
}

function standingTotals(partners: Array<ReturnType<typeof normalizeLocalBoominPartner>>) {
  return partners.reduce((totals, partner) => {
    const approval = getString(partner.member, "approvalStatus") || getString(partner.member, "approval_status");
    const qualification = getString(partner.member, "qualificationStatus") || getString(partner.member, "qualification_status");
    const connected = getString(partner.partnerConnection, "status") === "connected" || Boolean(partner.instagram);
    totals.total += 1;
    if (approval === "pending") totals.pending += 1;
    if (approval === "approved") totals.approved += 1;
    if (approval === "rejected") totals.rejected += 1;
    if (qualification === "qualified") totals.qualified += 1;
    if (qualification === "grace") totals.grace += 1;
    if (qualification === "not_qualified") totals.notQualified += 1;
    if (connected) totals.connected += 1;
    return totals;
  }, {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    qualified: 0,
    grace: 0,
    notQualified: 0,
    connected: 0,
  });
}

function metricsFromRollups(rollups: Array<Record<string, unknown>>) {
  const metrics = new Map(rollups.map((rollup) => [
    getString(rollup, "metricKey") || getString(rollup, "metric_key"),
    Number(rollup.total || 0),
  ]));
  return {
    linkClicks: metrics.get("link_clicks") || 0,
    signups: metrics.get("referral_count") || 0,
    sales: metrics.get("sales_count") || 0,
    gmvCents: metrics.get("gmv_cents") || 0,
    productUsage: metrics.get("product_usage_count") || 0,
  };
}

function getNestedStatus(value: Record<string, unknown> | null | undefined) {
  return getString(value, "status");
}

async function buildHandoffOptions(c: Context<{ Bindings: Env }>) {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const redirectUri = c.env.BOOMIN_HANDOFF_REDIRECT_URI
    || `${c.env.APP_BASE_URL || "https://atlantium.ai"}/creator-program`;
  const options = {
    issuer: BOOMIN_ISSUER,
    audience: BOOMIN_AUDIENCE,
    publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
    redirectUri,
    externalUserId: profileExternalUserId(activeProfile),
    email: authUser.email,
    name: activeProfile.displayName,
    metadata: {
      atlantiumUserId: authUser.id,
      atlantiumProfileId: activeProfile.id,
      profileType: activeProfile.type,
    },
    signingSecret: requireEnv(c.env, "HANDOFF_SIGNING_SECRET"),
    expiresInSeconds: BOOMIN_HANDOFF_EXPIRES_IN,
    apiBase: boominConnectApiBase(c.env),
  };
  return { redirectUri, options, activeProfile };
}

function buildStandingOptions(c: Context<{ Bindings: Env }>, externalUserId?: string) {
  return {
    issuer: BOOMIN_ISSUER,
    audience: BOOMIN_AUDIENCE,
    publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
    signingSecret: requireEnv(c.env, "HANDOFF_SIGNING_SECRET"),
    expiresInSeconds: BOOMIN_HANDOFF_EXPIRES_IN,
    apiBase: boominConnectApiBase(c.env),
    ...(externalUserId ? { externalUserId } : {}),
  };
}

function buildMetricOptions(c: Context<{ Bindings: Env }>, partnerRef: string, metricKey: string) {
  return {
    issuer: BOOMIN_ISSUER,
    signingSecret: requireEnv(c.env, "HANDOFF_SIGNING_SECRET"),
    publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
    partnerRef,
    eventType: "atlantium_dashboard_test",
    occurredAt: new Date().toISOString(),
    apiBase: boominConnectApiBase(c.env),
    metadata: {
      source: "atlantium_dashboard_test",
      metric_key: metricKey,
    },
  };
}

function boominConnectApiBase(env: Env) {
  return (env.BOOMIN_CONNECT_API_BASE || "https://api.boomin.ai/v1/connect").replace(/\/+$/, "");
}

function withBoominParams(base: string, params: Record<string, string>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function getNestedString(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
}

function jsonWithStatus(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getMembership(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  const tier = row?.tier ?? "free";
  const status = row?.status ?? null;
  const paidTier = tier === "club" || tier === "club_annual";
  const hasClubAccess = paidTier && (!status || ["active", "trialing", "past_due"].includes(status));
  return {
    membership_tier: tier,
    subscription_status: status,
    has_club_access: hasClubAccess,
    current_period_end: toIso(row?.currentPeriodEnd),
    cancel_at_period_end: row?.cancelAtPeriodEnd ?? false,
    grace_period_end: toIso(row?.gracePeriodEnd),
    payment_method: row?.paymentMethod ?? null,
  };
}

async function ensureLobbySeed(db: Db) {
  await db
    .insert(lobbyRooms)
    .values([
      {
        slug: "lounge",
        name: "Lobby Lounge",
        type: "lounge",
        livekitRoomName: "atlantium-lobby-lounge",
        description: "Always-on member lobby chat and hangout space.",
        metadata: { seeded: true },
      },
      {
        slug: "office-hours",
        name: "Office Hours",
        type: "office_hours",
        livekitRoomName: "atlantium-office-hours",
        description: "Daily live office hours room.",
        metadata: { seeded: true },
      },
    ])
    .onConflictDoNothing({ target: lobbyRooms.slug });

  await db.execute(sql`
    INSERT INTO "lobby_events" ("room_id", "title", "description", "starts_at", "ends_at", "timezone", "status", "livekit_room_name", "metadata")
    SELECT
      room.id,
      'Daily Office Hours',
      'Open technical help, project review, and live collaboration for Atlantium members.',
      office_hour.starts_at,
      office_hour.starts_at + interval '1 hour',
      'America/New_York',
      'scheduled',
      'atlantium-office-hours-' || to_char(office_hour.starts_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD'),
      '{"seeded": true, "recurrence": "daily", "local_start": "12:00"}'::jsonb
    FROM "lobby_rooms" room
    CROSS JOIN LATERAL (
      SELECT ((date_trunc('day', now() AT TIME ZONE 'America/New_York') + (day_offset * interval '1 day') + time '12:00') AT TIME ZONE 'America/New_York') AS starts_at
      FROM generate_series(0, 29) AS day_offset
    ) office_hour
    WHERE room.slug = 'office-hours'
    ON CONFLICT ("livekit_room_name") DO NOTHING
  `);
}

async function getLobbyEventSummary(db: Db) {
  const now = new Date();
  const visibleStatuses = or(eq(lobbyEvents.status, "scheduled"), eq(lobbyEvents.status, "live"));
  const [activeEvent] = await db
    .select()
    .from(lobbyEvents)
    .where(and(lte(lobbyEvents.startsAt, now), gte(lobbyEvents.endsAt, now), visibleStatuses))
    .orderBy(desc(lobbyEvents.startsAt))
    .limit(1);
  const upcomingEvents = await db
    .select()
    .from(lobbyEvents)
    .where(and(gte(lobbyEvents.endsAt, now), visibleStatuses))
    .orderBy(asc(lobbyEvents.startsAt))
    .limit(14);
  return { activeEvent: activeEvent ?? null, upcomingEvents };
}

async function getLobbyRoomOrThrow(db: Db, roomIdOrSlug: string) {
  const where = isUuid(roomIdOrSlug)
    ? eq(lobbyRooms.id, roomIdOrSlug)
    : eq(lobbyRooms.slug, roomIdOrSlug);
  const [room] = await db.select().from(lobbyRooms).where(where).limit(1);
  if (!room || !room.isActive) throw new HttpError(404, "lobby_room_not_found", "Lobby room not found.");
  return room;
}

async function getLobbyEventOrThrow(db: Db, eventId: string) {
  if (!isUuid(eventId)) throw new HttpError(404, "lobby_event_not_found", "Lobby event not found.");
  const [event] = await db.select().from(lobbyEvents).where(eq(lobbyEvents.id, eventId)).limit(1);
  if (!event || event.status === "cancelled") {
    throw new HttpError(404, "lobby_event_not_found", "Lobby event not found.");
  }
  return event;
}

async function listModeratorRoomIds(db: Db, authUser: typeof user.$inferSelect) {
  if (authUser.isAdmin) {
    const rooms = await db
      .select({ id: lobbyRooms.id })
      .from(lobbyRooms)
      .where(eq(lobbyRooms.isActive, true));
    return rooms.map((room) => room.id);
  }
  const rows = await db
    .select({ roomId: lobbyRoomRoles.roomId })
    .from(lobbyRoomRoles)
    .innerJoin(lobbyRooms, eq(lobbyRooms.id, lobbyRoomRoles.roomId))
    .where(and(
      eq(lobbyRoomRoles.userId, authUser.id),
      eq(lobbyRoomRoles.role, "moderator"),
      eq(lobbyRooms.isActive, true),
    ));
  return rows.map((row) => row.roomId);
}

async function requireLobbyModerator(db: Db, authUser: typeof user.$inferSelect, roomId: string) {
  const roomIds = await listModeratorRoomIds(db, authUser);
  if (!roomIds.includes(roomId)) throw new HttpError(403, "forbidden", "Lobby moderator access required.");
}

async function getLobbyPermissions(
  db: Db,
  authUser: typeof user.$inferSelect,
  membership: Awaited<ReturnType<typeof getMembership>>,
  activeEvent: typeof lobbyEvents.$inferSelect | null,
  moderatorRoomIds: string[],
) {
  if (!activeEvent) {
    const canPublishInLounge = moderatorRoomIds.length > 0 || membership.has_club_access;
    return {
      can_chat: true,
      can_watch: true,
      can_publish_now: canPublishInLounge,
      publish_reason: moderatorRoomIds.length > 0
        ? "moderator"
        : membership.has_club_access
          ? "paid_member"
          : "office_hours_not_live",
      next_free_publish_at: canPublishInLounge ? null : await getNextFreePublishAt(db, authUser.id),
      is_moderator: moderatorRoomIds.length > 0,
    };
  }
  const publish = await resolvePublishAccess(
    db,
    authUser.id,
    membership,
    activeEvent,
    moderatorRoomIds.includes(activeEvent.roomId),
    new Date(),
  );
  return {
    can_chat: true,
    can_watch: true,
    can_publish_now: publish.canPublish,
    publish_reason: publish.reason,
    next_free_publish_at: publish.nextFreePublishAt,
    is_moderator: moderatorRoomIds.includes(activeEvent.roomId),
  };
}

async function resolvePublishAccess(
  db: Db,
  userId: string,
  membership: Awaited<ReturnType<typeof getMembership>>,
  event: typeof lobbyEvents.$inferSelect,
  isModerator: boolean,
  now: Date,
) {
  if (isModerator) {
    return { canPublish: true, reason: "moderator", nextFreePublishAt: null as string | null, consumeFreePass: false };
  }
  if (membership.has_club_access) {
    return { canPublish: true, reason: "paid_member", nextFreePublishAt: null as string | null, consumeFreePass: false };
  }

  const [currentEventPass] = await db
    .select()
    .from(lobbyEventAttendance)
    .where(and(
      eq(lobbyEventAttendance.userId, userId),
      eq(lobbyEventAttendance.eventId, event.id),
      eq(lobbyEventAttendance.publishGranted, true),
    ))
    .limit(1);
  if (currentEventPass) {
    return { canPublish: true, reason: "free_pass_current_event", nextFreePublishAt: null as string | null, consumeFreePass: false };
  }

  const [lastGrant] = await db
    .select()
    .from(lobbyEventAttendance)
    .where(and(eq(lobbyEventAttendance.userId, userId), eq(lobbyEventAttendance.publishGranted, true)))
    .orderBy(desc(lobbyEventAttendance.joinedAt))
    .limit(1);
  if (!lastGrant) {
    return { canPublish: true, reason: "free_pass_available", nextFreePublishAt: null as string | null, consumeFreePass: true };
  }

  const availableAt = addDays(lastGrant.joinedAt, FREE_PUBLISH_COOLDOWN_DAYS);
  if (availableAt <= now) {
    return { canPublish: true, reason: "free_pass_available", nextFreePublishAt: null as string | null, consumeFreePass: true };
  }
  return {
    canPublish: false,
    reason: "free_pass_cooldown",
    nextFreePublishAt: availableAt.toISOString(),
    consumeFreePass: false,
  };
}

async function getNextFreePublishAt(db: Db, userId: string) {
  const [lastGrant] = await db
    .select()
    .from(lobbyEventAttendance)
    .where(and(eq(lobbyEventAttendance.userId, userId), eq(lobbyEventAttendance.publishGranted, true)))
    .orderBy(desc(lobbyEventAttendance.joinedAt))
    .limit(1);
  return lastGrant ? addDays(lastGrant.joinedAt, FREE_PUBLISH_COOLDOWN_DAYS).toISOString() : null;
}

async function recordLobbyAttendance(db: Db, eventId: string, userId: string, publishGranted: boolean) {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(lobbyEventAttendance)
    .where(and(eq(lobbyEventAttendance.eventId, eventId), eq(lobbyEventAttendance.userId, userId)))
    .limit(1);
  if (existing) {
    await db
      .update(lobbyEventAttendance)
      .set({
        publishGranted: existing.publishGranted || publishGranted,
        joinedAt: existing.joinedAt ?? now,
        updatedAt: now,
      })
      .where(eq(lobbyEventAttendance.id, existing.id));
    return;
  }
  await db.insert(lobbyEventAttendance).values({
    eventId,
    userId,
    publishGranted,
    joinedAt: now,
  });
}

function publicLobbyRoom(room: typeof lobbyRooms.$inferSelect) {
  return {
    id: room.id,
    slug: room.slug,
    name: room.name,
    type: room.type,
    description: room.description,
    is_active: room.isActive,
  };
}

function publicLobbyEvent(event: typeof lobbyEvents.$inferSelect) {
  const metadata = safeRecord(event.metadata);
  return {
    id: event.id,
    room_id: event.roomId,
    title: event.title,
    description: event.description,
    starts_at: toIso(event.startsAt),
    ends_at: toIso(event.endsAt),
    timezone: event.timezone,
    status: event.status,
    is_live: isEventLive(event, new Date()),
    spotlight_user_id: typeof metadata.spotlightUserId === "string" ? metadata.spotlightUserId : null,
  };
}

function publicLobbyMessage(
  message: typeof lobbyMessages.$inferSelect,
  sender: typeof user.$inferSelect,
  profile: Pick<typeof profiles.$inferSelect, "displayName" | "avatarUrl" | "slug"> | null,
) {
  const displayName = profile?.displayName || sender.name || sender.email.split("@")[0];
  return {
    id: message.id,
    room_id: message.roomId,
    sender_id: sender.id,
    sender_username: profile?.slug || sender.email.split("@")[0],
    sender_display_name: displayName,
    sender_avatar: profile?.avatarUrl || sender.image || null,
    content: message.content,
    created_at: toIso(message.createdAt),
    updated_at: toIso(message.updatedAt),
  };
}

function isEventLive(event: typeof lobbyEvents.$inferSelect, now: Date) {
  return event.status !== "cancelled" && event.startsAt <= now && event.endsAt > now;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

type LiveKitGrant = {
  roomJoin: boolean;
  room: string;
  canSubscribe?: boolean;
  canPublish?: boolean;
  canPublishData?: boolean;
  canUpdateOwnMetadata?: boolean;
  roomAdmin?: boolean;
};

async function createLiveKitToken(
  env: Env,
  options: {
    identity: string;
    name: string;
    roomName: string;
    ttlSeconds: number;
    grant: LiveKitGrant;
    metadata?: Record<string, unknown>;
  },
) {
  const apiKey = requireEnv(env, "LIVEKIT_API_KEY");
  const apiSecret = requireEnv(env, "LIVEKIT_API_SECRET");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: apiKey,
    sub: options.identity,
    name: options.name,
    nbf: now - 10,
    exp: now + options.ttlSeconds,
    video: options.grant,
    metadata: JSON.stringify(options.metadata || {}),
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function callLiveKitRoomService(
  c: Context<{ Bindings: Env }>,
  roomName: string,
  method: "ListParticipants" | "MutePublishedTrack" | "RemoveParticipant",
  body: Record<string, unknown>,
) {
  const url = liveKitHttpUrl(c.env.LIVEKIT_URL);
  if (!url || !c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
    throw new HttpError(503, "livekit_not_configured", "LiveKit is not configured for this environment.");
  }
  const token = await createLiveKitToken(c.env, {
    identity: "atlantium-api",
    name: "Atlantium API",
    roomName,
    ttlSeconds: 60,
    grant: {
      roomJoin: true,
      room: roomName,
      roomAdmin: true,
      canSubscribe: true,
      canPublish: false,
    },
  });
  const response = await fetch(`${url}/twirp/livekit.RoomService/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as Record<string, unknown> : {};
  if (!response.ok) {
    throw new HttpError(response.status, "livekit_service_error", "LiveKit service call failed.", { method, data });
  }
  return data;
}

async function muteLiveKitRoom(c: Context<{ Bindings: Env }>, roomName: string) {
  const listed = await callLiveKitRoomService(c, roomName, "ListParticipants", { room: roomName });
  const participants = Array.isArray(listed.participants) ? listed.participants as Array<Record<string, unknown>> : [];
  let mutedTracks = 0;
  for (const participant of participants) {
    const identity = String(participant.identity || "");
    const tracks = Array.isArray(participant.tracks) ? participant.tracks as Array<Record<string, unknown>> : [];
    for (const track of tracks) {
      if (!isAudioTrack(track)) continue;
      const trackSid = String(track.sid || track.trackSid || "");
      if (!identity || !trackSid) continue;
      await callLiveKitRoomService(c, roomName, "MutePublishedTrack", {
        room: roomName,
        identity,
        trackSid,
        muted: true,
      });
      mutedTracks += 1;
    }
  }
  return { muted_tracks: mutedTracks };
}

async function muteLiveKitParticipant(
  c: Context<{ Bindings: Env }>,
  roomName: string,
  identity: string,
  trackType: "audio" | "video" = "audio",
) {
  const listed = await callLiveKitRoomService(c, roomName, "ListParticipants", { room: roomName });
  const participants = Array.isArray(listed.participants) ? listed.participants as Array<Record<string, unknown>> : [];
  const participant = participants.find((row) => row.identity === identity);
  if (!participant) throw new HttpError(404, "participant_not_found", "LiveKit participant not found.");
  const tracks = Array.isArray(participant.tracks) ? participant.tracks as Array<Record<string, unknown>> : [];
  const matchingTracks = tracks.filter((track) => trackType === "audio" ? isAudioTrack(track) : isVideoTrack(track));
  let mutedTracks = 0;
  for (const track of matchingTracks) {
    const trackSid = String(track.sid || track.trackSid || "");
    if (!trackSid) continue;
    await callLiveKitRoomService(c, roomName, "MutePublishedTrack", {
      room: roomName,
      identity,
      trackSid,
      muted: true,
    });
    mutedTracks += 1;
  }
  return { muted_tracks: mutedTracks, target_user_id: identity, track_type: trackType };
}

function isAudioTrack(track: Record<string, unknown>) {
  return track.source === "MICROPHONE" || track.type === "AUDIO" || track.kind === "audio";
}

function isVideoTrack(track: Record<string, unknown>) {
  return track.source === "CAMERA" || track.source === "SCREEN_SHARE" || track.type === "VIDEO" || track.kind === "video";
}

function liveKitHttpUrl(rawUrl: string | undefined) {
  if (!rawUrl) return null;
  const url = new URL(rawUrl);
  if (url.protocol === "wss:") url.protocol = "https:";
  if (url.protocol === "ws:") url.protocol = "http:";
  return url.toString().replace(/\/+$/, "");
}

function base64UrlJson(value: unknown) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function requireAppUser(c: Context<{ Bindings: Env }>) {
  const session = await getAuthSession(c.env, c.req.raw);
  if (!session?.user?.id) throw new HttpError(401, "unauthorized", "Sign in required.");
  const db = createDb(c.env);
  const [authUser] = await db.query.user.findMany({
    where: (table, { eq }) => eq(table.id, session.user.id),
    limit: 1,
  });
  if (!authUser) throw new HttpError(401, "unauthorized", "Sign in required.");
  return { db, authUser, session };
}

async function requireAdminUser(c: Context<{ Bindings: Env }>) {
  const context = await requireAppUser(c);
  if (!context.authUser.isAdmin) {
    throw new HttpError(403, "forbidden", "Admin access required.");
  }
  return context;
}

async function forceDebugOtp(env: Env, email: string) {
  const db = createDb(env);
  const identifier = `sign-in-otp-${email}`;
  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .limit(1);
  if (!row) return;
  const [, ...rest] = row.value.split(":");
  await db
    .update(verification)
    .set({
      value: ["123456", ...rest].join(":"),
      updatedAt: new Date(),
    })
    .where(eq(verification.id, row.id));
}

async function getStoredOtp(env: Env, email: string) {
  const db = createDb(env);
  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, `sign-in-otp-${email}`))
    .limit(1);
  return row?.value?.split(":")[0] || null;
}

function publicProfile(
  authUser: typeof user.$inferSelect,
  activeProfile: Awaited<ReturnType<typeof ensureDefaultProfile>>,
) {
  const metadata = activeProfile.metadata || {};
  const username = typeof metadata.username === "string" ? metadata.username : activeProfile.slug;
  const storedRegistration = (activeProfile.registrationDetails ?? {}) as Record<string, unknown>;
  const isCompleted = Boolean(activeProfile.onboardingCompletedAt) || storedRegistration.is_completed === true;
  return {
    id: activeProfile.id,
    user_id: authUser.id,
    username,
    display_name: activeProfile.displayName,
    first_name: activeProfile.displayName.split(" ")[0] || activeProfile.displayName,
    last_name: activeProfile.displayName.split(" ").slice(1).join(" ") || undefined,
    bio: typeof metadata.bio === "string" ? metadata.bio : undefined,
    avatar_url: activeProfile.avatarUrl || undefined,
    location: typeof metadata.location === "string" ? metadata.location : undefined,
    website_url: typeof metadata.website_url === "string" ? metadata.website_url : undefined,
    linkedin_url: typeof metadata.linkedin_url === "string" ? metadata.linkedin_url : undefined,
    registration_details: { ...storedRegistration, is_completed: isCompleted },
    onboarding_completed_at: activeProfile.onboardingCompletedAt?.toISOString?.() ?? null,
    created_at: activeProfile.createdAt?.toISOString?.() ?? activeProfile.createdAt,
    updated_at: activeProfile.updatedAt?.toISOString?.() ?? activeProfile.updatedAt,
  };
}

async function proxyAuthRequest(
  c: Context<{ Bindings: Env }>,
  path: string,
  body: Record<string, unknown>,
) {
  const url = new URL(c.req.url);
  url.pathname = path;
  url.search = "";
  const request = new Request(url, {
    method: "POST",
    headers: c.req.raw.headers,
    body: JSON.stringify(body),
  });
  return createAuth(c.env, getExecutionCtx(c)).handler(request);
}

function withCopiedCookies(source: Response, target: Response) {
  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") target.headers.append("Set-Cookie", value);
  });
  return target;
}

function getExecutionCtx(c: Context<{ Bindings: Env }>) {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}
