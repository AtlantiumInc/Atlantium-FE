import { zValidator } from "@hono/zod-validator";
import { getPartnerStanding, postHandoff, recordReferralClick } from "@boomin/server";
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { createDb } from "../db/client";
import type { Db } from "../db/client";
import {
  lobbyEventAttendance,
  lobbyEvents,
  lobbyMessages,
  lobbyRoomRoles,
  lobbyRooms,
  memberships,
  profileMembers,
  profiles,
  user,
  verification,
} from "../db/schema";
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
