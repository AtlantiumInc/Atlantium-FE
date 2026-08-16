import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { createDb } from "../db/client";
import type { Db } from "../db/client";
import {
  contentCollections,
  contentDocuments,
  directoryContacts,
  directoryEntries,
  directoryEntrySources,
  directoryExportEvents,
  directorySources,
  funnelEvents,
  grantDetails,
  jobPostings,
  profiles,
  resourceDetails,
  threadMessages,
  threads,
  user,
} from "../db/schema";
import type { Env } from "../env";
import { getAuthSession } from "../lib/auth";
import { documentJsonLd, publicAuthor, publicDocumentDetail, publicDocumentSummary } from "../lib/content";
import { generateCoverImage } from "../lib/cover-image";
import { publicDirectoryEntry } from "../lib/directory";
import {
  addContact, burnReveal, countLiveContacts, hasRevealed, nextRefreshAt,
  readContacts, revealQuota, revealsUsed, suppressContact, type ContactState,
} from "../lib/contacts";
import { hasEntitlement } from "../lib/entitlements";
import { syncCompaniesFromJobs, mergeQueue } from "../lib/companies-sync";
import { syncGrants } from "../lib/grants-sync";
import { HttpError } from "../lib/http";

export const contentRoutes = new Hono<{ Bindings: Env }>();

const FUNNEL_EVENT_NAMES = new Set([
  "content_gate_viewed",
  "content_gate_signup_started",
  "signup_completed",
  "directory_reveal_clicked",
  "directory_reveal_completed",
  "reveal_quota_exhausted",
  "upgrade_clicked",
  "upgrade_completed",
  "comment_posted",
  "job_apply_revealed",
  "job_apply_clicked",
]);

const COMMENT_RATE_LIMIT_PER_MINUTE = 10;

// ── auth helpers (local to this router; app.ts keeps its own) ───────────────

async function sessionUser(c: Context<{ Bindings: Env }>) {
  const session = await getAuthSession(c.env, c.req.raw);
  if (!session?.user?.id) return null;
  const db = createDb(c.env);
  const [authUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  return authUser ? { db, authUser } : null;
}

async function requireMember(c: Context<{ Bindings: Env }>) {
  const ctx = await sessionUser(c);
  if (!ctx) throw new HttpError(401, "unauthorized", "Sign in required.");
  return ctx;
}

/**
 * A member who has finished the questionnaire. Membership itself is open (no
 * admin review), so this is the gate on everything that costs us something to
 * give away: contact reveals, apply links, the lab.
 */
async function requireOnboardedMember(c: Context<{ Bindings: Env }>) {
  const ctx = await requireMember(c);
  if (ctx.authUser.isAdmin) return ctx;
  if (!ctx.authUser.isApproved) {
    throw new HttpError(403, "account_suspended", "This account has been suspended.");
  }
  const [profile] = await ctx.db
    .select({
      onboardingCompletedAt: profiles.onboardingCompletedAt,
      registrationDetails: profiles.registrationDetails,
    })
    .from(profiles)
    .where(eq(profiles.ownerUserId, ctx.authUser.id))
    .limit(1);
  const reg = (profile?.registrationDetails ?? {}) as Record<string, unknown>;
  if (!(Boolean(profile?.onboardingCompletedAt) || reg.is_completed === true)) {
    throw new HttpError(403, "onboarding_required", "Complete your member questionnaire to continue.");
  }
  return ctx;
}

async function requireAdmin(c: Context<{ Bindings: Env }>) {
  const ctx = await requireMember(c);
  if (!ctx.authUser.isAdmin) throw new HttpError(403, "forbidden", "Admin access required.");
  return ctx;
}

/** Same rule as the app routes: authenticate before validating a body. */
contentRoutes.use("/admin/*", async (c, next) => {
  await requireAdmin(c);
  await next();
});

// ── public: collections ─────────────────────────────────────────────────────

contentRoutes.get("/content/collections", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select({
      id: contentCollections.id,
      slug: contentCollections.slug,
      title: contentCollections.title,
      description: contentCollections.description,
      sortOrder: contentCollections.sortOrder,
      publishedCount: sql<number>`count(${contentDocuments.id}) filter (where ${contentDocuments.status} = 'published')::int`,
    })
    .from(contentCollections)
    .leftJoin(contentDocuments, eq(contentDocuments.collectionId, contentCollections.id))
    .groupBy(contentCollections.id)
    .orderBy(asc(contentCollections.sortOrder), asc(contentCollections.title));
  return c.json({
    collections: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      sort_order: r.sortOrder,
      published_count: r.publishedCount,
    })),
  });
});

// ── public: documents list (excerpt-level only, published only) ─────────────

contentRoutes.get("/content/documents", async (c) => {
  const db = createDb(c.env);
  const q = c.req.query();
  const limit = Math.min(Number(q.limit) || 20, 100);
  const offset = Math.max(Number(q.offset) || 0, 0);

  const where = [eq(contentDocuments.status, "published" as const)];
  if (q.type === "doc" || q.type === "post") where.push(eq(contentDocuments.type, q.type));
  if (q.format === "article" || q.format === "guide" || q.format === "reference" || q.format === "document") {
    where.push(eq(contentDocuments.format, q.format));
  }
  if (q.tag) where.push(sql`${q.tag} = any(${contentDocuments.tags})`);
  if (q.collection) where.push(eq(contentCollections.slug, q.collection));
  if (q.q) {
    const needle = `%${q.q.trim()}%`;
    const search = or(ilike(contentDocuments.title, needle), ilike(contentDocuments.excerpt, needle));
    if (search) where.push(search);
  }

  const rows = await db
    .select({
      doc: contentDocuments,
      author: profiles,
      collectionSlug: contentCollections.slug,
    })
    .from(contentDocuments)
    .leftJoin(profiles, eq(contentDocuments.authorProfileId, profiles.id))
    .leftJoin(contentCollections, eq(contentDocuments.collectionId, contentCollections.id))
    .where(and(...where))
    .orderBy(
      asc(contentDocuments.sortOrder),
      sql`${contentDocuments.publishedAt} desc nulls last`,
    )
    .limit(limit)
    .offset(offset);

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contentDocuments)
    .leftJoin(contentCollections, eq(contentDocuments.collectionId, contentCollections.id))
    .where(and(...where));

  return c.json({
    documents: rows.map((r) => publicDocumentSummary(r.doc, r.author, r.collectionSlug)),
    total,
    limit,
    offset,
  });
});

// ── public: document detail with the gate applied ───────────────────────────

contentRoutes.get("/content/documents/:type/:slug", async (c) => {
  const type = c.req.param("type");
  if (type !== "doc" && type !== "post") {
    throw new HttpError(404, "not_found", "Document not found.");
  }
  const db = createDb(c.env);
  const session = await getAuthSession(c.env, c.req.raw);
  const hasSession = Boolean(session?.user?.id);

  const [row] = await db
    .select({ doc: contentDocuments, author: profiles, collectionSlug: contentCollections.slug })
    .from(contentDocuments)
    .leftJoin(profiles, eq(contentDocuments.authorProfileId, profiles.id))
    .leftJoin(contentCollections, eq(contentDocuments.collectionId, contentCollections.id))
    .where(and(
      eq(contentDocuments.type, type),
      eq(contentDocuments.slug, c.req.param("slug")),
      eq(contentDocuments.status, "published"),
    ))
    .limit(1);
  if (!row) throw new HttpError(404, "not_found", "Document not found.");

  return c.json({
    document: publicDocumentDetail(row.doc, hasSession, row.author, row.collectionSlug),
    json_ld: documentJsonLd(row.doc, row.author, c.env.APP_BASE_URL || "https://atlantium.ai"),
  });
});

// ── comments: subject visibility first, always (plan §4.4) ──────────────────

async function resolveVisibleSubject(db: Db, subjectType: string, subjectId: string) {
  if (subjectType !== "document") {
    // directory_entry comments are deliberately not enabled at launch (§7.6)
    throw new HttpError(404, "not_found", "Not found.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(subjectId)) throw new HttpError(404, "not_found", "Not found.");
  const [doc] = await db
    .select()
    .from(contentDocuments)
    .where(and(eq(contentDocuments.id, subjectId), eq(contentDocuments.status, "published")))
    .limit(1);
  // 404, not 403: invisible subjects don't exist (tenant-wall convention)
  if (!doc) throw new HttpError(404, "not_found", "Not found.");
  return doc;
}

function publicComment(
  message: typeof threadMessages.$inferSelect,
  author: typeof profiles.$inferSelect | null,
) {
  const deleted = Boolean(message.deletedAt);
  return {
    id: message.id,
    body: deleted ? "[removed]" : message.body,
    deleted,
    parent_message_id: message.parentMessageId,
    author: deleted ? null : publicAuthor(author),
    created_at: message.createdAt.toISOString(),
  };
}

contentRoutes.get("/threads/:subjectType/:subjectId/messages", async (c) => {
  const db = createDb(c.env);
  await resolveVisibleSubject(db, c.req.param("subjectType"), c.req.param("subjectId"));

  const [thread] = await db
    .select()
    .from(threads)
    .where(and(
      eq(threads.kind, "comments"),
      eq(threads.subjectType, "document"),
      eq(threads.subjectId, c.req.param("subjectId")),
    ))
    .limit(1);
  if (!thread) return c.json({ messages: [], total: 0 });

  const rows = await db
    .select({ message: threadMessages, author: profiles })
    .from(threadMessages)
    .leftJoin(user, eq(threadMessages.authorUserId, user.id))
    .leftJoin(profiles, eq(profiles.ownerUserId, user.id))
    .where(eq(threadMessages.threadId, thread.id))
    .orderBy(asc(threadMessages.createdAt))
    .limit(500);

  return c.json({
    messages: rows.map((r) => publicComment(r.message, r.author)),
    total: rows.length,
  });
});

contentRoutes.post(
  "/threads/:subjectType/:subjectId/messages",
  zValidator("json", z.object({
    body: z.string().trim().min(1).max(5000),
    parent_message_id: z.string().uuid().optional(),
  })),
  async (c) => {
    const { db, authUser } = await requireMember(c);
    const subject = await resolveVisibleSubject(db, c.req.param("subjectType"), c.req.param("subjectId"));
    const input = c.req.valid("json");

    const [{ recent } = { recent: 0 }] = await db
      .select({ recent: sql<number>`count(*)::int` })
      .from(threadMessages)
      .where(and(
        eq(threadMessages.authorUserId, authUser.id),
        gte(threadMessages.createdAt, sql`now() - interval '1 minute'`),
      ));
    if (recent >= COMMENT_RATE_LIMIT_PER_MINUTE) {
      throw new HttpError(429, "rate_limited", "Too many comments — slow down a little.");
    }

    // auto-create the comments thread (partial unique index makes this race-safe)
    let [thread] = await db
      .insert(threads)
      .values({ kind: "comments", subjectType: "document", subjectId: subject.id, createdBy: authUser.id })
      .onConflictDoNothing()
      .returning();
    if (!thread) {
      [thread] = await db
        .select()
        .from(threads)
        .where(and(
          eq(threads.kind, "comments"),
          eq(threads.subjectType, "document"),
          eq(threads.subjectId, subject.id),
        ))
        .limit(1);
    }
    if (!thread) throw new HttpError(500, "thread_create_failed", "Could not open the discussion.");

    if (input.parent_message_id) {
      const [parent] = await db
        .select()
        .from(threadMessages)
        .where(and(eq(threadMessages.id, input.parent_message_id), eq(threadMessages.threadId, thread.id)))
        .limit(1);
      if (!parent) throw new HttpError(400, "bad_parent", "Reply target not found in this discussion.");
      if (parent.parentMessageId) {
        throw new HttpError(400, "too_deep", "Replies are one level deep — reply to the top-level comment.");
      }
    }

    const [message] = await db
      .insert(threadMessages)
      .values({
        threadId: thread.id,
        authorUserId: authUser.id,
        body: input.body,
        parentMessageId: input.parent_message_id ?? null,
      })
      .returning();

    await captureEvent(db, "comment_posted", authUser.id, null, { subject_type: "document", subject_id: subject.id });

    const [profile] = await db.select().from(profiles).where(eq(profiles.ownerUserId, authUser.id)).limit(1);
    return c.json({ message: publicComment(message, profile ?? null) }, 201);
  },
);

contentRoutes.delete("/thread_messages/:id", async (c) => {
  const { db, authUser } = await requireMember(c);
  const [message] = await db
    .select()
    .from(threadMessages)
    .where(eq(threadMessages.id, c.req.param("id")))
    .limit(1);
  if (!message) throw new HttpError(404, "not_found", "Not found.");
  if (message.authorUserId !== authUser.id && !authUser.isAdmin) {
    throw new HttpError(403, "forbidden", "You can only remove your own comments.");
  }
  await db
    .update(threadMessages)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(threadMessages.id, message.id));
  return c.json({ success: true });
});

// ── funnel events (client capture; server events call captureEvent directly) ─

export async function captureEvent(
  db: Db,
  event: string,
  userId: string | null,
  anonId: string | null,
  props: Record<string, unknown>,
) {
  try {
    await db.insert(funnelEvents).values({ event, userId, anonId, props });
  } catch (error) {
    console.error("funnel event capture failed", event, error);
  }
}

contentRoutes.post(
  "/events",
  zValidator("json", z.object({
    event: z.string(),
    anon_id: z.string().max(64).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
  })),
  async (c) => {
    const input = c.req.valid("json");
    if (!FUNNEL_EVENT_NAMES.has(input.event)) {
      throw new HttpError(400, "unknown_event", "Unknown event name.");
    }
    const session = await getAuthSession(c.env, c.req.raw);
    const db = createDb(c.env);
    await captureEvent(db, input.event, session?.user?.id ?? null, input.anon_id ?? null, input.props ?? {});
    return c.json({ ok: true });
  },
);

// ── sitemap (proxied to atlantium.ai/sitemap.xml by the meta worker) ────────

contentRoutes.get("/content/sitemap.xml", async (c) => {
  const db = createDb(c.env);
  const appBase = c.env.APP_BASE_URL || "https://atlantium.ai";
  const docs = await db
    .select({
      type: contentDocuments.type,
      slug: contentDocuments.slug,
      updatedAt: contentDocuments.updatedAt,
    })
    .from(contentDocuments)
    .where(eq(contentDocuments.status, "published"))
    .orderBy(desc(contentDocuments.updatedAt))
    .limit(5000);

  const directoryRows = await db
    .select({ kind: directoryEntries.kind, slug: directoryEntries.slug, updatedAt: directoryEntries.updatedAt })
    .from(directoryEntries)
    .where(eq(directoryEntries.status, "active"))
    .limit(2000);

  const staticUrls = ["", "/jobs", "/blog", "/docs", "/grants", "/training", "/services", "/creator-program"];
  const urls = [
    ...staticUrls.map((path) => ({ loc: `${appBase}${path}`, lastmod: null as string | null })),
    ...docs.map((d) => ({
      loc: `${appBase}${d.type === "post" ? "/blog" : "/docs"}/${d.slug}`,
      lastmod: d.updatedAt.toISOString(),
    })),
    ...directoryRows.map((e) => ({
      loc: `${appBase}/directory/${e.kind}/${e.slug}`,
      lastmod: e.updatedAt.toISOString(),
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
  return c.body(xml, 200, { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" });
});

// ── admin CRUD ──────────────────────────────────────────────────────────────

const documentInput = z.object({
  type: z.enum(["doc", "post"]),
  format: z.enum(["article", "guide", "reference", "document"]).default("article"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(3).max(120),
  title: z.string().trim().min(1).max(300),
  excerpt: z.string().trim().max(500).optional().nullable(),
  body_md: z.string().default(""),
  cover_image_url: z.string().url().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).default([]),
  collection_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  gate: z.enum(["public", "preview", "member"]).default("public"),
  meta: z.record(z.string(), z.unknown()).default({}),
});

contentRoutes.get("/admin/content/documents", async (c) => {
  const { db } = await requireAdmin(c);
  const rows = await db
    .select({ doc: contentDocuments, collectionSlug: contentCollections.slug })
    .from(contentDocuments)
    .leftJoin(contentCollections, eq(contentDocuments.collectionId, contentCollections.id))
    .orderBy(desc(contentDocuments.updatedAt))
    .limit(500);
  return c.json({
    documents: rows.map((r) => ({
      ...publicDocumentSummary(r.doc, null, r.collectionSlug),
      status: r.doc.status,
      gate: r.doc.gate,
      collection_id: r.doc.collectionId,
      body_md: r.doc.bodyMd,
      author_profile_id: r.doc.authorProfileId,
    })),
  });
});

contentRoutes.post("/admin/content/documents", zValidator("json", documentInput), async (c) => {
  const { db, authUser } = await requireAdmin(c);
  const input = c.req.valid("json");
  const [authorProfile] = await db.select().from(profiles).where(eq(profiles.ownerUserId, authUser.id)).limit(1);
  const [doc] = await db
    .insert(contentDocuments)
    .values({
      type: input.type,
      format: input.format,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyMd: input.body_md,
      coverImageUrl: input.cover_image_url ?? null,
      tags: input.tags,
      authorProfileId: authorProfile?.id ?? null,
      collectionId: input.collection_id ?? null,
      sortOrder: input.sort_order,
      status: input.status,
      gate: input.gate,
      publishedAt: input.status === "published" ? new Date() : null,
      meta: input.meta,
    })
    .returning();
  return c.json({ document: doc }, 201);
});

contentRoutes.patch("/admin/content/documents/:id", zValidator("json", documentInput.partial()), async (c) => {
  const { db } = await requireAdmin(c);
  const input = c.req.valid("json");
  const [existing] = await db
    .select()
    .from(contentDocuments)
    .where(eq(contentDocuments.id, c.req.param("id")))
    .limit(1);
  if (!existing) throw new HttpError(404, "not_found", "Document not found.");

  const [doc] = await db
    .update(contentDocuments)
    .set({
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.format !== undefined ? { format: input.format } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.body_md !== undefined ? { bodyMd: input.body_md } : {}),
      ...(input.cover_image_url !== undefined ? { coverImageUrl: input.cover_image_url } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.collection_id !== undefined ? { collectionId: input.collection_id } : {}),
      ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.gate !== undefined ? { gate: input.gate } : {}),
      ...(input.meta !== undefined ? { meta: input.meta } : {}),
      // first transition to published stamps published_at; re-publishing keeps the original date
      ...(input.status === "published" && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(contentDocuments.id, existing.id))
    .returning();
  return c.json({ document: doc });
});

contentRoutes.delete("/admin/content/documents/:id", async (c) => {
  const { db } = await requireAdmin(c);
  const deleted = await db
    .delete(contentDocuments)
    .where(eq(contentDocuments.id, c.req.param("id")))
    .returning({ id: contentDocuments.id });
  if (!deleted.length) throw new HttpError(404, "not_found", "Document not found.");
  return c.json({ success: true });
});

contentRoutes.post(
  "/admin/content/documents/:id/cover",
  zValidator("json", z.object({ subject: z.string().trim().min(3).max(400).optional() })),
  async (c) => {
    const { db } = await requireAdmin(c);
    const [doc] = await db
      .select()
      .from(contentDocuments)
      .where(eq(contentDocuments.id, c.req.param("id")))
      .limit(1);
    if (!doc) throw new HttpError(404, "not_found", "Document not found.");

    const subject = c.req.valid("json").subject
      ?? `${doc.title}. ${doc.excerpt ?? ""}`.trim();
    const url = await generateCoverImage(c.env, new URL(c.req.url).origin, subject, doc.slug);
    if (!url) throw new HttpError(502, "cover_failed", "Image generation failed — try again.");

    const [updated] = await db
      .update(contentDocuments)
      .set({ coverImageUrl: url, updatedAt: new Date() })
      .where(eq(contentDocuments.id, doc.id))
      .returning();
    return c.json({ cover_image_url: updated.coverImageUrl });
  },
);

const collectionInput = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(80),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional().nullable(),
  sort_order: z.number().int().default(0),
});

contentRoutes.post("/admin/content/collections", zValidator("json", collectionInput), async (c) => {
  const { db } = await requireAdmin(c);
  const input = c.req.valid("json");
  const [collection] = await db
    .insert(contentCollections)
    .values({
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      sortOrder: input.sort_order,
    })
    .returning();
  return c.json({ collection }, 201);
});

contentRoutes.patch("/admin/content/collections/:id", zValidator("json", collectionInput.partial()), async (c) => {
  const { db } = await requireAdmin(c);
  const input = c.req.valid("json");
  const [collection] = await db
    .update(contentCollections)
    .set({
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
      updatedAt: new Date(),
    })
    .where(eq(contentCollections.id, c.req.param("id")))
    .returning();
  if (!collection) throw new HttpError(404, "not_found", "Collection not found.");
  return c.json({ collection });
});

contentRoutes.delete("/admin/content/collections/:id", async (c) => {
  const { db } = await requireAdmin(c);
  const deleted = await db
    .delete(contentCollections)
    .where(eq(contentCollections.id, c.req.param("id")))
    .returning({ id: contentCollections.id });
  if (!deleted.length) throw new HttpError(404, "not_found", "Collection not found.");
  return c.json({ success: true });
});

// ── Directory: grants & municipal resources (plan §4.1) ─────────────────────
// Contacts are NEVER joined here — the base repository has no access to them.

contentRoutes.get("/directory", async (c) => {
  const db = createDb(c.env);
  const q = c.req.query();
  const limit = Math.min(Number(q.limit) || 40, 100);
  const offset = Math.max(Number(q.offset) || 0, 0);

  const where = [eq(directoryEntries.status, (q.status === "expired" ? "expired" : "active") as "active" | "expired")];
  if (q.kind === "grant" || q.kind === "resource" || q.kind === "company" || q.kind === "person" || q.kind === "investor") {
    where.push(eq(directoryEntries.kind, q.kind));
  }
  if (q.category) where.push(eq(resourceDetails.category, q.category));
  if (q.tag) where.push(sql`${q.tag} = any(${directoryEntries.tags})`);
  if (q.q) {
    const needle = `%${q.q.trim()}%`;
    // Browsing wants summaries searched too; picking a specific org by name does
    // not — a summary hit buries the company you actually typed.
    const search = q.name_only === "1"
      ? ilike(directoryEntries.name, needle)
      : or(ilike(directoryEntries.name, needle), ilike(directoryEntries.summary, needle));
    if (search) where.push(search);
  }

  const rows = await db
    .select({ entry: directoryEntries, grant: grantDetails, resource: resourceDetails })
    .from(directoryEntries)
    .leftJoin(grantDetails, eq(grantDetails.entryId, directoryEntries.id))
    .leftJoin(resourceDetails, eq(resourceDetails.entryId, directoryEntries.id))
    .where(and(...where))
    // Deadline-sorted: closing soonest first, undated programs last.
    .orderBy(
      sql`coalesce(${grantDetails.deadlineAt}, ${grantDetails.deadlineDate}::timestamptz) asc nulls last`,
      asc(directoryEntries.name),
    )
    .limit(limit)
    .offset(offset);

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(directoryEntries)
    .leftJoin(resourceDetails, eq(resourceDetails.entryId, directoryEntries.id))
    .where(and(...where));

  const counts = await db
    .select({ kind: directoryEntries.kind, n: sql<number>`count(*)::int` })
    .from(directoryEntries)
    .where(eq(directoryEntries.status, "active"))
    .groupBy(directoryEntries.kind);

  return c.json({
    entries: rows.map((r) => publicDirectoryEntry(r.entry, { grant: r.grant, resource: r.resource })),
    total,
    limit,
    offset,
    counts: Object.fromEntries(counts.map((c2) => [c2.kind, c2.n])),
  });
});

contentRoutes.get("/directory/:kind/:slug", async (c) => {
  const kind = c.req.param("kind");
  if (!["grant", "resource", "company", "person", "investor"].includes(kind)) {
    throw new HttpError(404, "not_found", "Not found.");
  }
  const db = createDb(c.env);
  const [row] = await db
    .select({ entry: directoryEntries, grant: grantDetails, resource: resourceDetails })
    .from(directoryEntries)
    .leftJoin(grantDetails, eq(grantDetails.entryId, directoryEntries.id))
    .leftJoin(resourceDetails, eq(resourceDetails.entryId, directoryEntries.id))
    .where(and(
      eq(directoryEntries.kind, kind as "grant"),
      eq(directoryEntries.slug, c.req.param("slug")),
    ))
    .limit(1);
  if (!row || row.entry.status === "hidden") throw new HttpError(404, "not_found", "Not found.");

  const sources = await db
    .select({ source: directoryEntrySources.source, sourceUrl: directoryEntrySources.sourceUrl, lastSeenAt: directoryEntrySources.lastSeenAt })
    .from(directoryEntrySources)
    .where(eq(directoryEntrySources.entryId, row.entry.id));

  // A company's open roles are the whole point of its page. Matched on the
  // canonical name the board scraped (the alias table resolves the entry).
  const openJobs = row.entry.kind === "company"
    ? await db
        .select({
          slug: jobPostings.slug,
          title: jobPostings.title,
          location: jobPostings.location,
          workplaceType: jobPostings.workplaceType,
          seniority: jobPostings.seniority,
          salaryMin: jobPostings.salaryMin,
          salaryMax: jobPostings.salaryMax,
          postedAt: jobPostings.postedAt,
        })
        .from(jobPostings)
        .where(and(eq(jobPostings.company, row.entry.name), eq(jobPostings.status, "active")))
        .orderBy(sql`${jobPostings.postedAt} desc nulls last`)
        .limit(25)
    : [];

  return c.json({
    entry: publicDirectoryEntry(row.entry, { grant: row.grant, resource: row.resource }),
    jobs: openJobs.map((j) => ({
      slug: j.slug,
      title: j.title,
      location: j.location,
      workplace_type: j.workplaceType,
      seniority: j.seniority,
      salary_min: j.salaryMin,
      salary_max: j.salaryMax,
      posted_at: j.postedAt?.toISOString() ?? null,
    })),
    provenance: sources.map((s) => ({
      source: s.source,
      source_url: s.sourceUrl,
      last_seen_at: s.lastSeenAt.toISOString(),
    })),
  });
});

// ── Admin: sync + source registry ───────────────────────────────────────────

contentRoutes.post("/admin/directory/sync", async (c) => {
  await requireAdmin(c);
  const stats = await syncGrants(c.env);
  return c.json({ success: true, ...stats });
});

contentRoutes.get("/admin/directory/sources", async (c) => {
  const { db } = await requireAdmin(c);
  const rows = await db.select().from(directorySources).orderBy(asc(directorySources.id));
  return c.json({
    sources: rows.map((s) => ({
      id: s.id,
      display_name: s.displayName,
      base_url: s.baseUrl,
      enabled: s.enabled,
      last_sync_at: s.lastSyncAt?.toISOString() ?? null,
    })),
  });
});

contentRoutes.patch(
  "/admin/directory/sources/:id",
  zValidator("json", z.object({ enabled: z.boolean() })),
  async (c) => {
    const { db } = await requireAdmin(c);
    const [row] = await db
      .update(directorySources)
      .set({ enabled: c.req.valid("json").enabled, updatedAt: new Date() })
      .where(eq(directorySources.id, c.req.param("id")))
      .returning();
    if (!row) throw new HttpError(404, "not_found", "Source not found.");
    return c.json({ id: row.id, enabled: row.enabled });
  },
);

// ── Contact metering (plan §5.2–5.3) ────────────────────────────────────────
// Regular list/detail endpoints above never carry contacts for ANY tier.
// These three routes are the only paths that can emit contact values.

async function contactStateFor(
  c: Context<{ Bindings: Env }>,
  db: Db,
  entryId: string,
): Promise<{ state: ContactState; revealsAvailable: number | null; refreshesAt: string | null }> {
  const liveContacts = await countLiveContacts(db, entryId);
  if (liveContacts === 0) return { state: "none", revealsAvailable: null, refreshesAt: null };

  const ctx = await sessionUser(c);
  if (!ctx) return { state: "hidden", revealsAvailable: null, refreshesAt: null };

  if (await hasEntitlement(ctx.db, ctx.authUser.id, "directory.contacts.unlimited")) {
    return { state: "revealed", revealsAvailable: null, refreshesAt: null };
  }
  if (await hasRevealed(ctx.db, ctx.authUser.id, entryId)) {
    return { state: "revealed", revealsAvailable: null, refreshesAt: null };
  }
  const quota = revealQuota(c.env);
  const used = await revealsUsed(ctx.db, ctx.authUser.id);
  const available = Math.max(quota - used, 0);
  return {
    state: available > 0 ? "revealable" : "upgrade_required",
    revealsAvailable: available,
    refreshesAt: available > 0 ? null : await nextRefreshAt(ctx.db, ctx.authUser.id),
  };
}

contentRoutes.get("/directory/:kind/:slug/state", async (c) => {
  const db = createDb(c.env);
  const [entry] = await db
    .select()
    .from(directoryEntries)
    .where(and(
      eq(directoryEntries.kind, c.req.param("kind") as "company"),
      eq(directoryEntries.slug, c.req.param("slug")),
    ))
    .limit(1);
  if (!entry) throw new HttpError(404, "not_found", "Not found.");
  const state = await contactStateFor(c, db, entry.id);
  return c.json({
    contact_state: state.state,
    reveals_available: state.revealsAvailable,
    refreshes_at: state.refreshesAt,
  });
});

contentRoutes.post("/directory/entries/:id/reveal", async (c) => {
  const { db, authUser } = await requireOnboardedMember(c);
  const entryId = c.req.param("id");
  const [entry] = await db.select().from(directoryEntries).where(eq(directoryEntries.id, entryId)).limit(1);
  if (!entry) throw new HttpError(404, "not_found", "Not found.");

  // Entitled members never burn quota.
  if (await hasEntitlement(db, authUser.id, "directory.contacts.unlimited")) {
    await captureEvent(db, "directory_reveal_completed", authUser.id, null, {
      entry_id: entryId, kind: entry.kind, entitled: true,
    });
    return c.json({
      contacts: await readContacts(db, entryId),
      contact_state: "revealed",
      reveals_available: null,
    });
  }

  const quota = revealQuota(c.env);
  const outcome = await burnReveal(db, authUser.id, entryId, quota);

  if (outcome === "exhausted") {
    await captureEvent(db, "reveal_quota_exhausted", authUser.id, null, { entry_id: entryId, kind: entry.kind });
    return c.json(
      {
        code: "quota_exhausted",
        message: `You've used all ${quota} reveals in the last 30 days.`,
        upgrade_url: "/pricing",
        refreshes_at: await nextRefreshAt(db, authUser.id),
        contact_state: "upgrade_required",
        reveals_available: 0,
      },
      402,
    );
  }

  const used = await revealsUsed(db, authUser.id);
  await captureEvent(db, "directory_reveal_completed", authUser.id, null, {
    entry_id: entryId,
    kind: entry.kind,
    reveals_remaining: Math.max(quota - used, 0),
    re_reveal: outcome === "already",
  });

  return c.json({
    contacts: await readContacts(db, entryId),
    contact_state: "revealed",
    reveals_available: Math.max(quota - used, 0),
    refreshes_at: await nextRefreshAt(db, authUser.id),
  });
});

/** Privileged read: entitlement OR a prior reveal. */
contentRoutes.get("/directory/entries/:id/contacts", async (c) => {
  const { db, authUser } = await requireMember(c);
  const entryId = c.req.param("id");
  const entitled = await hasEntitlement(db, authUser.id, "directory.contacts.unlimited");
  if (!entitled && !(await hasRevealed(db, authUser.id, entryId))) {
    throw new HttpError(403, "not_revealed", "Reveal this entry first.");
  }
  return c.json({ contacts: await readContacts(db, entryId) });
});

/** Privileged export: audited, rate-limited, entitlement-gated. */
contentRoutes.get("/directory/export", async (c) => {
  const { db, authUser } = await requireMember(c);
  if (!(await hasEntitlement(db, authUser.id, "directory.contacts.export"))) {
    throw new HttpError(403, "upgrade_required", "Exporting the directory requires a paid membership.");
  }

  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(directoryExportEvents)
    .where(sql`${directoryExportEvents.userId} = ${authUser.id} and ${directoryExportEvents.createdAt} > now() - interval '1 day'`);
  if ((recent?.n ?? 0) >= 4) {
    throw new HttpError(429, "rate_limited", "Export is limited to 4 downloads per day.");
  }

  const kindParam = c.req.query("kind");
  const where = [eq(directoryEntries.status, "active" as const)];
  if (kindParam === "company" || kindParam === "investor" || kindParam === "grant" || kindParam === "resource" || kindParam === "person") {
    where.push(eq(directoryEntries.kind, kindParam));
  }

  const rows = await db
    .select({ entry: directoryEntries, contact: directoryContacts })
    .from(directoryEntries)
    .leftJoin(directoryContacts, and(
      eq(directoryContacts.entryId, directoryEntries.id),
      isNull(directoryContacts.suppressedAt),
    ))
    .where(and(...where))
    .limit(5000);

  const csv = [
    "name,kind,location,website,contact_type,contact_value,contact_label",
    ...rows.map((r) => [
      r.entry.name,
      r.entry.kind,
      r.entry.location ?? "",
      r.entry.website ?? "",
      r.contact?.contactType ?? "",
      r.contact?.value ?? "",
      r.contact?.label ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  await db.insert(directoryExportEvents).values({
    userId: authUser.id,
    kind: (kindParam as "company") ?? null,
    rowCount: rows.length,
  });
  await captureEvent(db, "upgrade_completed", authUser.id, null, { action: "directory_export", rows: rows.length });

  return c.body(csv, 200, {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="atlantium-directory-${kindParam ?? "all"}.csv"`,
  });
});

// ── Admin: contacts, suppression, company sync, merge queue ─────────────────

contentRoutes.post(
  "/admin/directory/entries/:id/contacts",
  zValidator("json", z.object({
    contact_type: z.string().trim().min(2).max(32),
    value: z.string().trim().min(3).max(300),
    label: z.string().trim().max(80).optional(),
    source_url: z.string().url().optional(),
  })),
  async (c) => {
    const { db } = await requireAdmin(c);
    const input = c.req.valid("json");
    const result = await addContact(db, {
      entryId: c.req.param("id"),
      contactType: input.contact_type,
      value: input.value,
      label: input.label ?? null,
      sourceUrl: input.source_url ?? null,
    });
    if ("skipped" in result) {
      throw new HttpError(409, "suppressed", "That contact was suppressed by a takedown and cannot be re-added.");
    }
    return c.json({ contact: { id: result.contact.id } }, 201);
  },
);

contentRoutes.delete(
  "/admin/directory/contacts/:id",
  async (c) => {
    const { db, authUser } = await requireAdmin(c);
    const reason = c.req.query("reason") ?? "takedown_request";
    const hash = await suppressContact(db, c.req.param("id"), reason, authUser.email);
    if (!hash) throw new HttpError(404, "not_found", "Contact not found.");
    return c.json({ success: true, suppressed: true });
  },
);

contentRoutes.post("/admin/directory/sync-companies", async (c) => {
  await requireAdmin(c);
  const stats = await syncCompaniesFromJobs(c.env);
  return c.json({ success: true, ...stats });
});

contentRoutes.get("/admin/directory/merge-queue", async (c) => {
  const { db } = await requireAdmin(c);
  return c.json({ ambiguous: await mergeQueue(db) });
});
