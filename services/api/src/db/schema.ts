import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profileType = pgEnum("profile_type", ["personal", "child", "team"]);
export const profileRole = pgEnum("profile_role", ["owner", "guardian", "member"]);
export const membershipTier = pgEnum("membership_tier", ["free", "club", "club_annual"]);
export const membershipStatus = pgEnum("membership_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
]);
export const lobbyRoomType = pgEnum("lobby_room_type", ["lounge", "office_hours"]);
export const lobbyEventStatus = pgEnum("lobby_event_status", ["scheduled", "live", "cancelled", "ended"]);
export const lobbyRoomRole = pgEnum("lobby_room_role", ["moderator"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailUnique: uniqueIndex("user_email_unique").on(sql`lower(${table.email})`),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  tokenUnique: uniqueIndex("session_token_unique").on(table.token),
  userIdx: index("session_user_idx").on(table.userId),
}));

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("account_user_idx").on(table.userId),
  providerAccountIdx: index("account_provider_account_idx").on(table.providerId, table.accountId),
}));

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  identifierIdx: index("verification_identifier_idx").on(table.identifier),
}));

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull(),
  type: profileType("type").notNull().default("personal"),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index("profiles_owner_user_idx").on(table.ownerUserId),
  slugUnique: uniqueIndex("profiles_slug_unique").on(table.slug),
}));

export const profileMembers = pgTable("profile_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: profileRole("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  profileUserUnique: uniqueIndex("profile_members_profile_user_unique").on(table.profileId, table.userId),
  userIdx: index("profile_members_user_idx").on(table.userId),
  activeIdx: index("profile_members_user_active_idx").on(table.userId, table.isActive),
}));

export const memberships = pgTable("memberships", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  tier: membershipTier("membership_tier").notNull().default("free"),
  status: membershipStatus("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  gracePeriodEnd: timestamp("grace_period_end", { withTimezone: true }),
  paymentMethod: jsonb("payment_method").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tierIdx: index("memberships_tier_idx").on(table.tier),
  statusIdx: index("memberships_status_idx").on(table.status),
}));

export const lobbyRooms = pgTable("lobby_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  type: lobbyRoomType("type").notNull(),
  livekitRoomName: text("livekit_room_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugUnique: uniqueIndex("lobby_rooms_slug_unique").on(table.slug),
  livekitRoomUnique: uniqueIndex("lobby_rooms_livekit_room_unique").on(table.livekitRoomName),
  activeIdx: index("lobby_rooms_active_idx").on(table.isActive),
}));

export const lobbyEvents = pgTable("lobby_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => lobbyRooms.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  status: lobbyEventStatus("status").notNull().default("scheduled"),
  livekitRoomName: text("livekit_room_name").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roomStartsIdx: index("lobby_events_room_starts_idx").on(table.roomId, table.startsAt),
  startsIdx: index("lobby_events_starts_idx").on(table.startsAt),
  livekitRoomUnique: uniqueIndex("lobby_events_livekit_room_unique").on(table.livekitRoomName),
}));

export const lobbyMessages = pgTable("lobby_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => lobbyRooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  roomCreatedIdx: index("lobby_messages_room_created_idx").on(table.roomId, table.createdAt),
  userCreatedIdx: index("lobby_messages_user_created_idx").on(table.userId, table.createdAt),
}));

export const lobbyEventAttendance = pgTable("lobby_event_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => lobbyEvents.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  publishGranted: boolean("publish_granted").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  eventUserUnique: uniqueIndex("lobby_event_attendance_event_user_unique").on(table.eventId, table.userId),
  userJoinedIdx: index("lobby_event_attendance_user_joined_idx").on(table.userId, table.joinedAt),
  userPublishIdx: index("lobby_event_attendance_user_publish_idx").on(table.userId, table.publishGranted, table.joinedAt),
}));

export const lobbyRoomRoles = pgTable("lobby_room_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => lobbyRooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: lobbyRoomRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roomUserRoleUnique: uniqueIndex("lobby_room_roles_room_user_role_unique").on(table.roomId, table.userId, table.role),
  userRoleIdx: index("lobby_room_roles_user_role_idx").on(table.userId, table.role),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  profiles: many(profileMembers),
  lobbyMessages: many(lobbyMessages),
  lobbyRoles: many(lobbyRoomRoles),
}));

export const profileRelations = relations(profiles, ({ one, many }) => ({
  owner: one(user, { fields: [profiles.ownerUserId], references: [user.id] }),
  members: many(profileMembers),
}));
