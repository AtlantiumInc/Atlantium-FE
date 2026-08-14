import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  primaryKey,
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
  isApproved: boolean("is_approved").notNull().default(false),
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
  registrationDetails: jsonb("registration_details").$type<Record<string, unknown>>().notNull().default({}),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
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
  /** Stripe is the source of truth; these tie our projection back to it. */
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
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

// Scraped Atlanta AI/tech job postings (sourced from hiring.cafe, seeded via
// services/api/scripts/seed-jobs.ts). Public read; admin-only writes.
export const jobPostings = pgTable("job_postings", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  workplaceType: text("workplace_type"),
  seniority: text("seniority"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  applyUrl: text("apply_url").notNull(),
  /** Feed identity. Each sync may only expire jobs from its own source. */
  source: text("source").notNull().default("hiring_cafe"),
  status: text("status").notNull().default("active"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  content: jsonb("content"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  review: jsonb("review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugUnique: uniqueIndex("job_postings_slug_unique").on(table.slug),
  applyUrlUnique: uniqueIndex("job_postings_apply_url_unique").on(table.applyUrl),
  statusPostedIdx: index("job_postings_status_posted_idx").on(table.status, table.postedAt),
  statusReviewedIdx: index("job_postings_status_reviewed_idx").on(table.status, table.reviewedAt),
}));

export const reviewBatches = pgTable("review_batches", {
  batchId: text("batch_id").primaryKey(),
  status: text("status").notNull().default("in_progress"),
  jobCount: integer("job_count").notNull().default(0),
  jobIds: jsonb("job_ids").$type<string[]>().notNull().default([]),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  usage: jsonb("usage").$type<Record<string, number>>().notNull().default({}),
  results: jsonb("results").$type<Record<string, number>>().notNull().default({}),
});

export const digestSuppressions = pgTable("digest_suppressions", {
  email: text("email").primaryKey(),
  reason: text("reason").notNull().default("unsubscribed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const digestRuns = pgTable("digest_runs", {
  periodKey: text("period_key").primaryKey(),
  kind: text("kind").notNull().default("weekly"),
  recipients: integer("recipients").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  sections: jsonb("sections").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Content rail (plan §3.1) ────────────────────────────────────────────────
export const documentType = pgEnum("document_type", ["doc", "post"]);
export const documentFormat = pgEnum("document_format", ["article", "guide", "reference", "document"]);
export const documentStatus = pgEnum("document_status", ["draft", "published", "archived"]);
export const documentGate = pgEnum("document_gate", ["public", "preview", "member"]);

export const contentCollections = pgTable("content_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentDocuments = pgTable("content_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: documentType("type").notNull(),
  format: documentFormat("format").notNull().default("article"),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  bodyMd: text("body_md").notNull().default(""),
  coverImageUrl: text("cover_image_url"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  authorProfileId: uuid("author_profile_id").references(() => profiles.id, { onDelete: "set null" }),
  collectionId: uuid("collection_id").references(() => contentCollections.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: documentStatus("status").notNull().default("draft"),
  gate: documentGate("gate").notNull().default("public"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  typeSlugUq: uniqueIndex("content_documents_type_slug_uq").on(table.type, table.slug),
  typeStatusPubIdx: index("content_documents_type_status_pub_idx").on(table.type, table.status, table.publishedAt),
  collectionIdx: index("content_documents_collection_idx").on(table.collectionId, table.sortOrder),
}));

// ── Conversation rail (plan §3.3) ───────────────────────────────────────────
export const threadKind = pgEnum("thread_kind", ["comments", "dm", "group"]);
export const threadSubjectType = pgEnum("thread_subject_type", ["document", "directory_entry"]);

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: threadKind("kind").notNull(),
  subjectType: threadSubjectType("subject_type"),
  subjectId: uuid("subject_id"),
  title: text("title"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const threadParticipants = pgTable("thread_participants", {
  threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const threadMessages = pgTable("thread_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  parentMessageId: uuid("parent_message_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  threadTimeIdx: index("thread_messages_thread_time_idx").on(table.threadId, table.createdAt),
}));

// ── Directory rail (plan §3.2) ──────────────────────────────────────────────
export const directoryKind = pgEnum("directory_kind", ["company", "person", "investor", "grant", "resource"]);
export const directoryStatus = pgEnum("directory_status", ["active", "expired", "hidden"]);

export const directorySources = pgTable("directory_sources", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  baseUrl: text("base_url"),
  enabled: boolean("enabled").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const directoryEntries = pgTable("directory_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: directoryKind("kind").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  summary: text("summary"),
  website: text("website"),
  location: text("location"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  status: directoryStatus("status").notNull().default("active"),
  attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  review: jsonb("review").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  kindSlugUq: uniqueIndex("directory_entries_kind_slug_uq").on(table.kind, table.slug),
  kindStatusIdx: index("directory_entries_kind_status_idx").on(table.kind, table.status, table.updatedAt),
}));

export const grantDetails = pgTable("grant_details", {
  entryId: uuid("entry_id").primaryKey().references(() => directoryEntries.id, { onDelete: "cascade" }),
  funder: text("funder"),
  amountMin: integer("amount_min"),
  amountMax: integer("amount_max"),
  // Date-safe deadlines: most grants publish a DATE, not an instant.
  deadlineDate: text("deadline_date"),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  deadlineTimezone: text("deadline_timezone").default("America/New_York"),
  recurring: boolean("recurring").notNull().default(false),
  eligibility: text("eligibility").array().notNull().default(sql`'{}'::text[]`),
  applicationUrl: text("application_url"),
});

export const resourceDetails = pgTable("resource_details", {
  entryId: uuid("entry_id").primaryKey().references(() => directoryEntries.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  eligibility: text("eligibility").array().notNull().default(sql`'{}'::text[]`),
  applicationUrl: text("application_url"),
});

export const companyDetails = pgTable("company_details", {
  entryId: uuid("entry_id").primaryKey().references(() => directoryEntries.id, { onDelete: "cascade" }),
  stage: text("stage"),
  headcountBand: text("headcount_band"),
  foundedYear: integer("founded_year"),
  fundingTotalUsd: integer("funding_total_usd"),
  isHiring: boolean("is_hiring").notNull().default(false),
});

export const directoryEntrySources = pgTable("directory_entry_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => directoryEntries.id, { onDelete: "cascade" }),
  source: text("source").notNull().references(() => directorySources.id),
  externalId: text("external_id").notNull(),
  sourceUrl: text("source_url"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
}, (table) => ({
  sourceExternalUq: uniqueIndex("directory_entry_sources_source_external_uq").on(table.source, table.externalId),
  entryIdx: index("directory_entry_sources_entry_idx").on(table.entryId),
}));

export const investorDetails = pgTable("investor_details", {
  entryId: uuid("entry_id").primaryKey().references(() => directoryEntries.id, { onDelete: "cascade" }),
  firm: text("firm"),
  checkMinUsd: integer("check_min_usd"),
  checkMaxUsd: integer("check_max_usd"),
  stages: text("stages").array().notNull().default(sql`'{}'::text[]`),
  thesis: text("thesis"),
});

export const directoryEntryAliases = pgTable("directory_entry_aliases", {
  entryId: uuid("entry_id").notNull().references(() => directoryEntries.id, { onDelete: "cascade" }),
  nameNormalized: text("name_normalized").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("directory_entry_aliases_name_idx").on(table.nameNormalized),
}));

export const directoryContacts = pgTable("directory_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => directoryEntries.id, { onDelete: "cascade" }),
  contactType: text("contact_type").notNull(),
  value: text("value"),
  valueHash: text("value_hash").notNull(),
  label: text("label"),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  suppressedAt: timestamp("suppressed_at", { withTimezone: true }),
  suppressionReason: text("suppression_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  entryIdx: index("directory_contacts_entry_idx").on(table.entryId),
}));

export const directorySuppressions = pgTable("directory_suppressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  valueHash: text("value_hash").notNull().unique(),
  reason: text("reason").notNull(),
  requestedBy: text("requested_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const directoryReveals = pgTable("directory_reveals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => directoryEntries.id, { onDelete: "cascade" }),
  revealedAt: timestamp("revealed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userTimeIdx: index("directory_reveals_user_time_idx").on(table.userId, table.revealedAt),
}));

export const directoryRevealBudgets = pgTable("directory_reveal_budgets", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  used: integer("used").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const directoryExportEvents = pgTable("directory_export_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: directoryKind("kind"),
  rowCount: integer("row_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const directorySyncRuns = pgTable("directory_sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: directoryKind("kind").notNull(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
});

// ── Funnel instrumentation (plan §7.5) ──────────────────────────────────────
export const funnelEvents = pgTable("funnel_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  event: text("event").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  anonId: text("anon_id"),
  props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  eventTimeIdx: index("funnel_events_event_time_idx").on(table.event, table.createdAt),
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

// ── P0A: identity (plan §3.2) ───────────────────────────────────────────────
// Persona, affiliation and status as three separate axes. Verification is a
// fourth, orthogonal concern and lands in P0B.

export const memberRole = pgEnum("member_role", ["investor", "professional", "founder", "advisor"]);
export const roleSource = pgEnum("role_source", ["self_declared", "inferred", "admin_assigned"]);
export const seekingStatus = pgEnum("seeking_status", ["not_seeking", "open", "actively_looking"]);
export const seekingVisibility = pgEnum("seeking_visibility", [
  "private",
  "matched_only",
  "verified_employers",
  "all_members",
]);

export const memberRoles = pgTable("member_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull(),
  /** Affiliation — the org this persona is held at, when known. */
  entryId: uuid("entry_id").references(() => directoryEntries.id, { onDelete: "set null" }),
  title: text("title"),
  isPrimary: boolean("is_primary").notNull().default(false),
  /** `inferred` is never treated as the member's own assertion (§5.3). */
  source: roleSource("source").notNull().default("self_declared"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  profileIdx: index("member_roles_profile_idx").on(table.profileId),
  entryIdx: index("member_roles_entry_idx").on(table.entryId),
  roleIdx: index("member_roles_role_idx").on(table.role),
}));

export const professionalPreferences = pgTable("professional_preferences", {
  roleId: uuid("role_id").primaryKey().references(() => memberRoles.id, { onDelete: "cascade" }),
  seeking: seekingStatus("seeking").notNull().default("not_seeking"),
  seekingUpdatedAt: timestamp("seeking_updated_at", { withTimezone: true }),
  /**
   * The load-bearing privacy control (§3.4, §8.7). `matched_only` means
   * Atlantium may act on the signal but nobody may query, list or receive it.
   * Never read `seeking` without it.
   */
  visibility: seekingVisibility("visibility").notNull().default("matched_only"),
  targetTitles: text("target_titles").array().notNull().default(sql`'{}'::text[]`),
  seniority: text("seniority"),
  stack: text("stack").array().notNull().default(sql`'{}'::text[]`),
  minSalary: integer("min_salary"),
  remotePref: text("remote_pref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const introAppetite = pgEnum("intro_appetite", ["none", "some", "all"]);
export const advisorAvailability = pgEnum("advisor_availability", ["open", "intro_only", "closed"]);

/**
 * The founder / investor / advisor / recruiter branch answers.
 *
 * professional_preferences covers the professional branch; this covers the
 * rest. Every column here either routes a member to someone or gates a
 * capability — anything that merely decorates a profile stays in
 * `profiles.registration_details` and does not earn a column.
 */
export const roleDetails = pgTable("role_details", {
  roleId: uuid("role_id").primaryKey().references(() => memberRoles.id, { onDelete: "cascade" }),

  ventureStage: text("venture_stage"),
  needs: text("needs").array().notNull().default(sql`'{}'::text[]`),

  checkMin: integer("check_min"),
  checkMax: integer("check_max"),
  focusStages: text("focus_stages").array().notNull().default(sql`'{}'::text[]`),
  /** Whether the curation queue may point founders at this investor at all. */
  introAppetite: introAppetite("intro_appetite").notNull().default("none"),

  domains: text("domains").array().notNull().default(sql`'{}'::text[]`),
  engagement: text("engagement").array().notNull().default(sql`'{}'::text[]`),
  availability: advisorAvailability("availability").notNull().default("intro_only"),

  hiringRoles: text("hiring_roles").array().notNull().default(sql`'{}'::text[]`),
  hiringContact: text("hiring_contact"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberRoleRelations = relations(memberRoles, ({ one }) => ({
  profile: one(profiles, { fields: [memberRoles.profileId], references: [profiles.id] }),
  entry: one(directoryEntries, { fields: [memberRoles.entryId], references: [directoryEntries.id] }),
  professional: one(professionalPreferences, {
    fields: [memberRoles.id],
    references: [professionalPreferences.roleId],
  }),
  details: one(roleDetails, { fields: [memberRoles.id], references: [roleDetails.roleId] }),
}));

// ── P0B: trust primitives (plan §4.2, §4.3, §4.5) ───────────────────────────

export const orgRelationship = pgEnum("org_relationship", [
  "employee", "founder", "executive", "recruiter", "representative",
]);
export const orgAuthority = pgEnum("org_authority", ["none", "page_editor", "hiring", "admin"]);
export const verificationType = pgEnum("verification_type", [
  "identity", "employment", "org_authority", "investor", "advisor", "domain",
]);
export const evidenceType = pgEnum("evidence_type", [
  "email_domain_otp", "admin_review", "member_vouch", "external_profile", "document", "payment_instrument",
]);

export const orgMemberships = pgTable("org_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => directoryEntries.id, { onDelete: "cascade" }),
  relationship: orgRelationship("relationship").notNull(),
  /** Employment is not authority: proving you work there ≠ speaking for them. */
  authority: orgAuthority("authority").notNull().default("none"),
  isCurrent: boolean("is_current").notNull().default(true),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  entryIdx: index("org_memberships_entry_idx").on(table.entryId, table.authority),
  profileIdx: index("org_memberships_profile_idx").on(table.profileId),
}));

export const orgDomains = pgTable("org_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull().references(() => directoryEntries.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  domainIdx: index("org_domains_domain_idx").on(table.domain),
}));

/**
 * Verification is a grant, not an enum: it records who verified what, against
 * which evidence, when it expires and whether it was revoked. Read it through
 * `isVerified()` in src/lib/verification.ts — never by selecting rows directly,
 * which is how expiry and revocation get forgotten.
 */
export const verificationGrants = pgTable("verification_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  memberRoleId: uuid("member_role_id").references(() => memberRoles.id, { onDelete: "cascade" }),
  orgMembershipId: uuid("org_membership_id").references(() => orgMemberships.id, { onDelete: "cascade" }),
  directoryEntryId: uuid("directory_entry_id").references(() => directoryEntries.id, { onDelete: "cascade" }),
  verification: verificationType("verification").notNull(),
  evidence: evidenceType("evidence").notNull(),
  evidenceRef: text("evidence_ref"),
  grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: text("revoked_reason"),
});

export const workEmailVerifications = pgTable("work_email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  domain: text("domain").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── P1: the network loop (plan §8, §8A) ─────────────────────────────────────

export const connectionStatus = pgEnum("connection_status", ["pending", "accepted", "declined", "removed"]);
export const connectionSource = pgEnum("connection_source", ["direct", "atlantium_intro", "member_intro"]);
export const dmRequestStatus = pgEnum("dm_request_status", ["pending", "accepted", "declined", "expired"]);

/** A relationship two members acknowledge — NOT the fact that they talked. */
export const memberConnections = pgTable("member_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterProfileId: uuid("requester_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  recipientProfileId: uuid("recipient_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: connectionStatus("status").notNull().default("pending"),
  /** Provenance: how this relationship came to exist (§8A.7). */
  source: connectionSource("source").notNull().default("direct"),
  introducedByProfileId: uuid("introduced_by_profile_id").references(() => profiles.id, { onDelete: "set null" }),
  /** WHICH introduction created this edge — source alone can't reconstruct it. */
  introductionId: uuid("introduction_id"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
}, (table) => ({
  requesterIdx: index("member_connections_requester_idx").on(table.requesterProfileId, table.status),
  recipientIdx: index("member_connections_recipient_idx").on(table.recipientProfileId, table.status),
}));

/** Standalone primitive: blockable without ever having been connected. */
export const memberBlocks = pgTable("member_blocks", {
  blockerProfileId: uuid("blocker_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  blockedProfileId: uuid("blocked_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.blockerProfileId, table.blockedProfileId] }),
}));

export const dmPolicies = pgTable("dm_policies", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  accepts: text("accepts").notNull().default("members"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dmRequests = pgTable("dm_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromProfileId: uuid("from_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  toProfileId: uuid("to_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  /** Which persona the sender is acting as — rights come only from this. */
  actingRoleId: uuid("acting_role_id").references(() => memberRoles.id, { onDelete: "set null" }),
  actingOrgId: uuid("acting_org_id").references(() => directoryEntries.id, { onDelete: "set null" }),
  purpose: text("purpose").notNull(),
  body: text("body").notNull(),
  status: dmRequestStatus("status").notNull().default("pending"),
  threadId: uuid("thread_id").references(() => threads.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  toIdx: index("dm_requests_to_idx").on(table.toProfileId, table.status),
  fromIdx: index("dm_requests_from_created_idx").on(table.fromProfileId),
}));

/**
 * Webhook idempotency. Stripe retries on any slow or failed response, so every
 * event is recorded before it is acted on; the primary key makes replay a no-op.
 */
export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  error: text("error"),
});

/**
 * Directly granted capabilities — comps. Separate from `memberships` on
 * purpose: a comp is not a subscription, and faking a paid tier would corrupt
 * every revenue figure derived from it.
 */
export const entitlementGrants = pgTable("entitlement_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  entitlement: text("entitlement").notNull(),
  reason: text("reason").notNull(),
  grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: text("revoked_reason"),
});

// ── P1 S5: curated introductions (plan §8.3, §8A.7) ─────────────────────────

export const introductionStatus = pgEnum("introduction_status", [
  "pending_review", "rejected", "awaiting_target", "accepted", "declined", "withdrawn", "expired",
]);
export const introductionOutcome = pgEnum("introduction_outcome", [
  "unknown", "no_response", "met", "ongoing", "hired", "invested", "dead",
]);

export const introductions = pgTable("introductions", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterProfileId: uuid("requester_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  targetProfileId: uuid("target_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  /** NULL = Atlantium itself rather than a member vouching. */
  facilitatorUserId: text("facilitator_user_id").references(() => user.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  status: introductionStatus("status").notNull().default("pending_review"),
  reviewNote: text("review_note"),
  outcome: introductionOutcome("outcome").notNull().default("unknown"),
  outcomeNote: text("outcome_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (table) => ({
  statusIdx: index("introductions_status_idx").on(table.status, table.createdAt),
  targetIdx: index("introductions_target_idx").on(table.targetProfileId, table.status),
}));

// ── Org claims (plan §4.6) ──────────────────────────────────────────────────

export const orgRequestKind = pgEnum("org_request_kind", ["claim", "create"]);
export const orgRequestStatus = pgEnum("org_request_status", ["pending", "approved", "rejected", "withdrawn"]);

/** How a member gets the authority that founder/rep features require. */
export const orgRequests = pgTable("org_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: orgRequestKind("kind").notNull(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").references(() => directoryEntries.id, { onDelete: "cascade" }),
  proposed: jsonb("proposed").$type<Record<string, unknown>>().notNull().default({}),
  relationship: orgRelationship("relationship").notNull().default("founder"),
  evidence: text("evidence"),
  status: orgRequestStatus("status").notNull().default("pending"),
  decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("org_requests_status_idx").on(table.status, table.createdAt),
}));

// ── Service requests: the phone-call sales pipeline (training cohort first) ──

export const serviceRequestStatus = pgEnum("service_request_status", [
  "new", "called", "offered", "paid", "fulfilled", "passed",
]);

/**
 * One pipeline for everything sold over a call. `kind` is text validated
 * against the code registry in lib/service-requests.ts — adding a service is a
 * registry entry, never a migration. Answers are display-only jsonb; the
 * pipeline is typed because the queue filters on it.
 */
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
  status: serviceRequestStatus("status").notNull().default("new"),
  offerCents: integer("offer_cents"),
  paymentLinkUrl: text("payment_link_url"),
  stripeSessionId: text("stripe_session_id"),
  note: text("note"),
  calledAt: timestamp("called_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  queueIdx: index("service_requests_queue_idx").on(table.kind, table.status, table.createdAt),
}));
