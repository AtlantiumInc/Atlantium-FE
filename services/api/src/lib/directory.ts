import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  directoryEntries,
  directoryEntrySources,
  directorySources,
  directorySyncRuns,
  grantDetails,
  resourceDetails,
} from "../db/schema";

type EntryRow = typeof directoryEntries.$inferSelect;
type GrantRow = typeof grantDetails.$inferSelect;
type ResourceRow = typeof resourceDetails.$inferSelect;

/**
 * Deadline semantics (plan §3.2): an exact instant wins when a source gives
 * one; a date-only deadline stays open through the END of that day in the
 * program's timezone. A grant is never closed hours early because a scraper
 * stamped midnight UTC.
 */
export function grantClosesAt(grant: Pick<GrantRow, "deadlineAt" | "deadlineDate" | "deadlineTimezone">): Date | null {
  if (grant.deadlineAt) return grant.deadlineAt;
  if (!grant.deadlineDate) return null;
  const tz = grant.deadlineTimezone || "America/New_York";
  // A `date` column can surface as "YYYY-MM-DD" or a full ISO string depending
  // on the driver path; take the date part either way.
  const [y, m, d] = grant.deadlineDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  // End of the deadline day as WALL time in the program's zone → instant.
  // Never parse with `new Date("...T23:59:59")`: that reads the server's local
  // zone, which on a worker is UTC and closes Atlanta grants 4 hours early.
  return zonedWallTimeToInstant(y, m, d, 23, 59, 59, tz);
}

/** Convert a wall-clock time in `tz` to the UTC instant it represents. */
function zonedWallTimeToInstant(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  tz: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // Offset of the zone at (approximately) that instant, DST included.
  const offsetMs = zoneOffsetMs(new Date(naiveUtc), tz);
  return new Date(naiveUtc - offsetMs);
}

/** Zone offset in ms at `date` (America/New_York in August → -14400000). */
function zoneOffsetMs(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour === "24" ? "00" : parts.hour), Number(parts.minute), Number(parts.second),
  );
  return asUtc - date.getTime();
}

export function isGrantClosed(grant: Pick<GrantRow, "deadlineAt" | "deadlineDate" | "deadlineTimezone">, now = new Date()) {
  const closes = grantClosesAt(grant);
  return closes ? closes.getTime() < now.getTime() : false;
}

export function daysUntilClose(grant: Pick<GrantRow, "deadlineAt" | "deadlineDate" | "deadlineTimezone">, now = new Date()) {
  const closes = grantClosesAt(grant);
  if (!closes) return null;
  return Math.ceil((closes.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Public serialization. The base directory repository has NO join to
 * directory_contacts — list and detail responses physically cannot emit
 * contact values for any tier (plan §4.3).
 */
export function publicDirectoryEntry(
  entry: EntryRow,
  facets?: { grant?: GrantRow | null; resource?: ResourceRow | null },
  contactState: "none" | "hidden" | "revealable" | "revealed" | "upgrade_required" = "none",
) {
  const grant = facets?.grant;
  const resource = facets?.resource;
  return {
    id: entry.id,
    kind: entry.kind,
    slug: entry.slug,
    name: entry.name,
    summary: entry.summary,
    website: entry.website,
    location: entry.location,
    tags: entry.tags,
    status: entry.status,
    attributes: entry.attributes,
    verified_at: entry.verifiedAt?.toISOString() ?? null,
    contact_state: contactState,
    updated_at: entry.updatedAt.toISOString(),
    ...(grant
      ? {
          grant: {
            funder: grant.funder,
            amount_min: grant.amountMin,
            amount_max: grant.amountMax,
            deadline_date: grant.deadlineDate,
            deadline_at: grant.deadlineAt?.toISOString() ?? null,
            deadline_timezone: grant.deadlineTimezone,
            closes_at: grantClosesAt(grant)?.toISOString() ?? null,
            days_until_close: daysUntilClose(grant),
            recurring: grant.recurring,
            eligibility: grant.eligibility,
            application_url: grant.applicationUrl,
          },
        }
      : {}),
    ...(resource
      ? {
          resource: {
            category: resource.category,
            eligibility: resource.eligibility,
            application_url: resource.applicationUrl,
          },
        }
      : {}),
  };
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

/** Registry check — scrapers must call this BEFORE fetching anything. */
export async function sourceEnabled(db: Db, sourceId: string) {
  const [row] = await db.select().from(directorySources).where(eq(directorySources.id, sourceId)).limit(1);
  return Boolean(row?.enabled);
}

export type UpsertInput = {
  kind: "grant" | "resource" | "company" | "person" | "investor";
  name: string;
  summary?: string | null;
  website?: string | null;
  location?: string | null;
  tags?: string[];
  attributes?: Record<string, unknown>;
  source: string;
  externalId: string;
  sourceUrl?: string | null;
  sourceData?: Record<string, unknown>;
  grant?: {
    funder?: string | null;
    amountMin?: number | null;
    amountMax?: number | null;
    deadlineDate?: string | null;
    deadlineAt?: Date | null;
    deadlineTimezone?: string | null;
    recurring?: boolean;
    eligibility?: string[];
    applicationUrl?: string | null;
  };
  resource?: {
    category: string;
    eligibility?: string[];
    applicationUrl?: string | null;
  };
};

/**
 * Upsert by SOURCE identity, not by name: entries are created/merged from
 * (source, external_id), so renames upstream update rather than duplicate.
 */
export async function upsertEntry(db: Db, input: UpsertInput) {
  const [existingSource] = await db
    .select()
    .from(directoryEntrySources)
    .where(and(
      eq(directoryEntrySources.source, input.source),
      eq(directoryEntrySources.externalId, input.externalId),
    ))
    .limit(1);

  let entryId = existingSource?.entryId;
  let created = false;

  if (entryId) {
    await db
      .update(directoryEntries)
      .set({
        name: input.name,
        summary: input.summary ?? null,
        website: input.website ?? null,
        location: input.location ?? null,
        tags: input.tags ?? [],
        attributes: input.attributes ?? {},
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(directoryEntries.id, entryId));
  } else {
    // Slug collisions across sources are possible; suffix until it lands.
    let slug = slugify(input.name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const [clash] = await db
        .select({ id: directoryEntries.id })
        .from(directoryEntries)
        .where(and(eq(directoryEntries.kind, input.kind), eq(directoryEntries.slug, slug)))
        .limit(1);
      if (!clash) break;
      slug = `${slugify(input.name)}-${attempt + 2}`;
    }
    const [entry] = await db
      .insert(directoryEntries)
      .values({
        kind: input.kind,
        slug,
        name: input.name,
        summary: input.summary ?? null,
        website: input.website ?? null,
        location: input.location ?? null,
        tags: input.tags ?? [],
        attributes: input.attributes ?? {},
      })
      .returning();
    entryId = entry.id;
    created = true;
  }

  await db
    .insert(directoryEntrySources)
    .values({
      entryId,
      source: input.source,
      externalId: input.externalId,
      sourceUrl: input.sourceUrl ?? null,
      sourceData: input.sourceData ?? {},
    })
    .onConflictDoUpdate({
      target: [directoryEntrySources.source, directoryEntrySources.externalId],
      set: {
        entryId,
        sourceUrl: input.sourceUrl ?? null,
        sourceData: input.sourceData ?? {},
        lastSeenAt: new Date(),
      },
    });

  if (input.grant) {
    await db
      .insert(grantDetails)
      .values({
        entryId,
        funder: input.grant.funder ?? null,
        amountMin: input.grant.amountMin ?? null,
        amountMax: input.grant.amountMax ?? null,
        deadlineDate: input.grant.deadlineDate ?? null,
        deadlineAt: input.grant.deadlineAt ?? null,
        deadlineTimezone: input.grant.deadlineTimezone ?? "America/New_York",
        recurring: input.grant.recurring ?? false,
        eligibility: input.grant.eligibility ?? [],
        applicationUrl: input.grant.applicationUrl ?? null,
      })
      .onConflictDoUpdate({
        target: grantDetails.entryId,
        set: {
          funder: input.grant.funder ?? null,
          amountMin: input.grant.amountMin ?? null,
          amountMax: input.grant.amountMax ?? null,
          deadlineDate: input.grant.deadlineDate ?? null,
          deadlineAt: input.grant.deadlineAt ?? null,
          deadlineTimezone: input.grant.deadlineTimezone ?? "America/New_York",
          recurring: input.grant.recurring ?? false,
          eligibility: input.grant.eligibility ?? [],
          applicationUrl: input.grant.applicationUrl ?? null,
        },
      });
  }

  if (input.resource) {
    await db
      .insert(resourceDetails)
      .values({
        entryId,
        category: input.resource.category,
        eligibility: input.resource.eligibility ?? [],
        applicationUrl: input.resource.applicationUrl ?? null,
      })
      .onConflictDoUpdate({
        target: resourceDetails.entryId,
        set: {
          category: input.resource.category,
          eligibility: input.resource.eligibility ?? [],
          applicationUrl: input.resource.applicationUrl ?? null,
        },
      });
  }

  return { entryId, created };
}

/**
 * Expire grants whose deadline has passed in their own timezone. Runs from
 * the daily cron; returns the slugs it closed.
 */
export async function expireClosedGrants(db: Db) {
  const rows = await db
    .select({ entry: directoryEntries, grant: grantDetails })
    .from(directoryEntries)
    .innerJoin(grantDetails, eq(grantDetails.entryId, directoryEntries.id))
    .where(eq(directoryEntries.status, "active"));

  const closed: string[] = [];
  for (const row of rows) {
    if (isGrantClosed(row.grant)) {
      await db
        .update(directoryEntries)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(directoryEntries.id, row.entry.id));
      closed.push(row.entry.slug);
    }
  }
  return closed;
}

export async function recordSyncRun(
  db: Db,
  kind: "grant" | "resource",
  source: string,
  stats: Record<string, number>,
) {
  await db.insert(directorySyncRuns).values({
    kind,
    source,
    finishedAt: new Date(),
    stats,
  });
}
