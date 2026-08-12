import { and, eq, sql } from "drizzle-orm";
import { createDb } from "../db/client";
import type { Db } from "../db/client";
import {
  companyDetails,
  directoryEntries,
  directoryEntryAliases,
  directorySources,
  jobPostings,
} from "../db/schema";
import type { Env } from "../env";
import { recordSyncRun, slugify, sourceEnabled, upsertEntry } from "./directory";

export const JOBS_SOURCE = "jobs_board";

/**
 * Normalize a company name for entity resolution. Strips legal suffixes and
 * punctuation so "Cognizant US Corporation" and "Cognizant" collapse — but
 * matching is done through directory_entry_aliases, never by name equality
 * at query time (staff review: name joins produce entity-resolution garbage).
 */
export function normalizeCompanyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|plc|group|holdings|technologies|technology|solutions|services|systems|us|usa)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MIN_POSTINGS_FOR_ENTRY = 2;

/**
 * Seed the company directory from our own verified job board: a company with
 * live postings is, by definition, a hiring Atlanta tech employer. Ambiguous
 * normalized names (already claimed by a different entry) are left for the
 * manual merge queue rather than guessed.
 */
export async function syncCompaniesFromJobs(env: Env) {
  const db = createDb(env);

  await db
    .insert(directorySources)
    .values({
      id: JOBS_SOURCE,
      displayName: "Atlantium Job Board",
      baseUrl: "https://atlantium.ai/jobs",
    })
    .onConflictDoNothing();

  if (!(await sourceEnabled(db, JOBS_SOURCE))) {
    return { skipped: "source_disabled" as const, created: 0, updated: 0, ambiguous: 0 };
  }

  const companies = await db
    .select({
      company: jobPostings.company,
      postings: sql<number>`count(*)::int`,
      remote: sql<number>`count(*) filter (where ${jobPostings.workplaceType} = 'Remote')::int`,
      location: sql<string>`min(${jobPostings.location})`,
    })
    .from(jobPostings)
    .where(eq(jobPostings.status, "active"))
    .groupBy(jobPostings.company)
    .having(sql`count(*) >= ${MIN_POSTINGS_FOR_ENTRY}`)
    .orderBy(sql`count(*) desc`)
    .limit(400);

  const stats = { created: 0, updated: 0, ambiguous: 0, linked: 0 };

  for (const row of companies) {
    const normalized = normalizeCompanyName(row.company);
    if (!normalized) continue;

    // Entity resolution through the alias table. A normalized name MAY map to
    // several candidates — that ambiguity routes to the merge queue.
    const aliasMatches = await db
      .select({ entryId: directoryEntryAliases.entryId })
      .from(directoryEntryAliases)
      .innerJoin(directoryEntries, eq(directoryEntries.id, directoryEntryAliases.entryId))
      .where(and(
        eq(directoryEntryAliases.nameNormalized, normalized),
        eq(directoryEntries.kind, "company"),
      ));

    if (aliasMatches.length > 1) {
      stats.ambiguous += 1;
      continue;
    }

    const { entryId, created } = await upsertEntry(db, {
      kind: "company",
      name: row.company,
      summary: `Hiring in Atlanta tech — ${row.postings} open ${row.postings === 1 ? "role" : "roles"} on the Atlantium job board.`,
      location: row.location ?? "Atlanta, GA",
      tags: ["hiring", ...(row.remote > 0 ? ["remote-friendly"] : [])],
      source: JOBS_SOURCE,
      externalId: slugify(row.company),
      sourceUrl: `https://atlantium.ai/jobs?q=${encodeURIComponent(row.company)}`,
      sourceData: { postings: row.postings, remote: row.remote },
    });

    if (created) stats.created += 1;
    else stats.updated += 1;

    await db
      .insert(directoryEntryAliases)
      .values({ entryId, nameNormalized: normalized, verified: false })
      .onConflictDoNothing();

    await db
      .insert(companyDetails)
      .values({ entryId, isHiring: true })
      .onConflictDoUpdate({ target: companyDetails.entryId, set: { isHiring: true } });

    stats.linked += 1;
  }

  await db
    .update(directorySources)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(directorySources.id, JOBS_SOURCE));
  await recordSyncRun(db, "company" as never, JOBS_SOURCE, stats);

  return stats;
}

/** Companies whose normalized name is claimed by more than one entry. */
export async function mergeQueue(db: Db) {
  const rows = await db
    .select({
      nameNormalized: directoryEntryAliases.nameNormalized,
      n: sql<number>`count(*)::int`,
    })
    .from(directoryEntryAliases)
    .groupBy(directoryEntryAliases.nameNormalized)
    .having(sql`count(*) > 1`);
  return rows;
}
