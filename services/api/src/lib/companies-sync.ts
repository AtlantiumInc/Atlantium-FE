import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
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
export async function syncCompaniesFromJobs(env: Env, opts: { createCap?: number } = {}) {
  // Creations cost ~4 queries each (upsertEntry), and a Workers invocation has
  // a hard subrequest budget — so new entries are capped per run and the rest
  // deferred to the next daily tick. Existing entries cost nothing per-row:
  // alias resolution happens in memory and the refreshes are batched.
  const createCap = opts.createCap ?? 150;
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
    return { skipped: "source_disabled" as const, created: 0, updated: 0, ambiguous: 0, deferred: 0 };
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
    .orderBy(sql`count(*) desc`);

  // The whole alias table for companies, resolved in memory. A normalized name
  // mapping to several entries is ambiguity and routes to the merge queue.
  const aliasRows = await db
    .select({ entryId: directoryEntryAliases.entryId, name: directoryEntryAliases.nameNormalized })
    .from(directoryEntryAliases)
    .innerJoin(directoryEntries, eq(directoryEntries.id, directoryEntryAliases.entryId))
    .where(eq(directoryEntries.kind, "company"));
  const byName = new Map<string, Set<string>>();
  for (const a of aliasRows) {
    const set = byName.get(a.name) ?? new Set<string>();
    set.add(a.entryId);
    byName.set(a.name, set);
  }

  const stats = { created: 0, updated: 0, ambiguous: 0, linked: 0, deferred: 0 };
  const hiringEntryIds: string[] = [];
  const newAliases: Array<{ entryId: string; nameNormalized: string }> = [];
  let createBudget = createCap;

  for (const row of companies) {
    const normalized = normalizeCompanyName(row.company);
    if (!normalized) continue;

    const matches = byName.get(normalized);
    if (matches && matches.size > 1) {
      stats.ambiguous += 1;
      continue;
    }
    if (matches && matches.size === 1) {
      hiringEntryIds.push([...matches][0]);
      stats.updated += 1;
      continue;
    }

    if (createBudget <= 0) {
      stats.deferred += 1;
      continue;
    }
    createBudget -= 1;

    const { entryId } = await upsertEntry(db, {
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
    stats.created += 1;
    hiringEntryIds.push(entryId);
    newAliases.push({ entryId, nameNormalized: normalized });
    byName.set(normalized, new Set([entryId]));
  }

  if (newAliases.length > 0) {
    await db
      .insert(directoryEntryAliases)
      .values(newAliases.map((a) => ({ ...a, verified: false })))
      .onConflictDoNothing();
    await db
      .insert(companyDetails)
      .values(newAliases.map((a) => ({ entryId: a.entryId, isHiring: true })))
      .onConflictDoNothing();
  }

  if (hiringEntryIds.length > 0) {
    await db
      .update(companyDetails)
      .set({ isHiring: true })
      .where(inArray(companyDetails.entryId, hiringEntryIds));
    // The flip matters as much as the flag: a company whose postings all
    // closed must stop advertising "hiring" the same day.
    await db
      .update(companyDetails)
      .set({ isHiring: false })
      .where(and(
        eq(companyDetails.isHiring, true),
        notInArray(companyDetails.entryId, hiringEntryIds),
      ));
  }
  stats.linked = hiringEntryIds.length;

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
