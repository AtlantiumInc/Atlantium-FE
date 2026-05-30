import { zValidator } from "@hono/zod-validator";
import { getPartnerStanding, postHandoff, recordReferralClick } from "@boomin/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { createDb } from "../db/client";
import { profileMembers, profiles, verification } from "../db/schema";
import type { Env } from "../env";
import { isDebugAuthCodes, requireEnv } from "../env";
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

appRoutes.post(
  "/auth/otp",
  zValidator("json", z.object({ email: emailSchema })),
  async (c) => {
    const body = c.req.valid("json");
    const response = await proxyAuthRequest(c, "/api/auth/email-otp/send-verification-otp", {
      email: body.email,
      type: "sign-in",
    });
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
    const signInResponse = await proxyAuthRequest(c, "/api/auth/sign-in/email-otp", {
      email: body.email,
      otp: body.code,
      name: body.name ?? body.email.split("@")[0],
    });
    const payload = await signInResponse.clone().json().catch(() => null) as { user?: { id?: string } } | null;
    if (!signInResponse.ok || !payload?.user?.id) return signInResponse;
    const signedInUserId = payload.user.id;

    const db = createDb(c.env);
    const [freshUser] = await db.query.user.findMany({
      where: (table, { eq }) => eq(table.id, signedInUserId),
      limit: 1,
    });
    if (!freshUser) {
      return signInResponse;
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
  const options = buildStandingOptions(c);
  try {
    const result = await getPartnerStanding(options);
    return jsonWithStatus({ success: true, ...result }, 200);
  } catch (error) {
    const sdkError = error as BoominSdkError;
    const body = sdkError.response || { code: sdkError.code, message: sdkError.message };
    return jsonWithStatus({ success: false, ...body }, sdkError.status || 502);
  }
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
