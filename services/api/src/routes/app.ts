import { zValidator } from "@hono/zod-validator";
import { getPartnerStanding, postHandoff, recordReferralClick } from "@boomin/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { createDb } from "../db/client";
import { profileMembers, profiles, user, verification } from "../db/schema";
import type { Env } from "../env";
import { adminEmails, isDebugAuthCodes, requireEnv } from "../env";
import { createAuth, getAuthSession } from "../lib/auth";
import { HttpError } from "../lib/http";
import {
  ensureDefaultProfile,
  listProfiles,
  publicUser,
  setActiveProfile,
  slugify,
} from "../lib/profiles";

export const appRoutes = new Hono<{ Bindings: Env }>();

const emailSchema = z.string().email().transform((value) => value.trim().toLowerCase());

const BOOMIN_ISSUER = "atlantium.ai";
const BOOMIN_AUDIENCE = "boomin.ai";
const BOOMIN_HANDOFF_EXPIRES_IN = 5 * 60;

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
    return withCopiedCookies(signInResponse, c.json({
      success: true,
      auth_token: null,
      user: publicUser(freshUser, activeProfile),
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
  return c.json(publicUser(authUser, activeProfile));
});

appRoutes.get("/profile/me", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  return c.json(publicProfile(authUser, activeProfile));
});

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
      ...(typeof input.username === "string" ? { username: input.username } : {}),
    };

    const [updated] = await db
      .update(profiles)
      .set({
        displayName,
        avatarUrl,
        metadata,
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
  await requireAppUser(c);
  return c.json({
    subscription: {
      membership_tier: "free",
      subscription_status: null,
      has_club_access: false,
      current_period_end: null,
      cancel_at_period_end: false,
      grace_period_end: null,
      payment_method: null,
    },
  });
});

appRoutes.get("/realtime/config", async (c) => {
  await requireAppUser(c);
  return c.json({ realtime_hash: "" });
});

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
    externalUserId: `atlantium_profile_${activeProfile.id}`,
    email: authUser.email,
    name: activeProfile.displayName,
    metadata: {
      atlantiumUserId: authUser.id,
      atlantiumProfileId: activeProfile.id,
      profileType: activeProfile.type,
    },
  });
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

appRoutes.get("/dashboard/creators", async (c) => {
  await requireAppUser(c);
  return creatorStandingResponse(c);
});

appRoutes.get("/admin/partnerships/creators", async (c) => {
  await requireAdminUser(c);
  return creatorStandingResponse(c);
});

appRoutes.post("/dashboard/creators/test-click", async (c) => {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const partnerRef = `atlantium_profile_${activeProfile.id}`;
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
  const partnerRef = `atlantium_profile_${activeProfile.id}`;
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

async function creatorStandingResponse(c: Context<{ Bindings: Env }>) {
  const options = buildStandingOptions(c);
  try {
    const result = await getPartnerStanding(options);
    return jsonWithStatus({ success: true, ...result }, 200);
  } catch (error) {
    const fallback = await localBoominAppStanding(c).catch(() => null);
    if (fallback) return jsonWithStatus({ success: true, ...fallback }, 200);

    const sdkError = error as BoominSdkError;
    const body = sdkError.response || { code: sdkError.code, message: sdkError.message };
    return jsonWithStatus({ success: false, ...body }, sdkError.status || 502);
  }
}

async function localBoominAppStanding(c: Context<{ Bindings: Env }>) {
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

function getRecord(value: Record<string, unknown> | null | undefined, key: string) {
  const result = value?.[key];
  return result && typeof result === "object" && !Array.isArray(result)
    ? result as Record<string, unknown>
    : null;
}

function getString(value: Record<string, unknown> | null | undefined, key: string) {
  const result = value?.[key];
  return typeof result === "string" && result ? result : null;
}

async function buildHandoffOptions(c: Context<{ Bindings: Env }>) {
  const { db, authUser } = await requireAppUser(c);
  const activeProfile = await ensureDefaultProfile(db, authUser);
  const redirectUri = c.env.BOOMIN_HANDOFF_REDIRECT_URI
    || `${c.env.APP_BASE_URL || "https://atlantium.ai"}/creator-program`;
  const options = {
    issuer: BOOMIN_ISSUER,
    audience: BOOMIN_AUDIENCE,
    publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_demo_brand_partner_program",
    redirectUri,
    externalUserId: `atlantium_profile_${activeProfile.id}`,
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
    publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_demo_brand_partner_program",
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
    publicKey: c.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_demo_brand_partner_program",
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
