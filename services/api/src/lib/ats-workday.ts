/**
 * ats-workday.ts — direct Workday pulls for directory companies.
 *
 * Discovery (scripts/discover-workday.ts) stores each company's working CXS
 * endpoint in directory_entries.attributes.workday. This sync reads those,
 * searches each board for Atlanta/Georgia postings via the CXS API's
 * searchText, and ingests matches as source='workday' — their lifecycle is
 * per-company board presence, never the hiring.cafe feed.
 *
 * Worker-budget note: everything here is a subrequest (CXS calls AND neon
 * queries), so the nightly cron processes a rotating slice of companies
 * (attributes.workday.last_polled, oldest first) instead of all ~150 at once.
 * The local backfill script runs it with a big limit where no budget applies.
 */
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { createDb } from "../db/client";
import { jobPostings, directoryEntries } from "../db/schema";
import type { Env } from "../env";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 AtlantiumBot/0.1";
const SEARCH_TERMS = ["Atlanta", "Georgia"];
const PAGE_LIMIT = 20; // CXS max
const MAX_PAGES_PER_TERM = 10;
const ATL_RE = /(atlanta|georgia|\bga\b)/i;

type WorkdayConfig = { tenant: string; base: string; cxs: string; last_polled?: string };
type CxsPosting = { title?: string; externalPath?: string; locationsText?: string; postedOn?: string };

function parsePostedOn(text: string | undefined): Date | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const now = Date.now();
  if (t.includes("today")) return new Date(now);
  if (t.includes("yesterday")) return new Date(now - 86400e3);
  const m = t.match(/(\d+)\+?\s*days?/);
  if (m) return new Date(now - Number(m[1]) * 86400e3);
  return null;
}

function inferWorkplace(title?: string, locationsText?: string): string {
  const t = `${title ?? ""} ${locationsText ?? ""}`;
  if (/(remote|virtual|work from home|wfh)/i.test(t)) return "Remote";
  if (/hybrid/i.test(t)) return "Hybrid";
  return "Onsite";
}

/** "GEORGIA - VIRTUAL - GA01" → "Georgia (Remote)"; "Atlanta, GA" stays. */
function cleanLocation(text?: string): string | null {
  if (!text) return null;
  const virtual = /(virtual|remote)/i.test(text);
  let t = text
    .replace(/\s*-\s*(virtual|remote)\s*/gi, " ")
    .replace(/\s*-\s*[A-Z]{2,4}\d{2,4}\s*$/g, "")
    .replace(/\s*-\s*/g, ", ")
    .trim().replace(/,\s*$/, "");
  if (/^[A-Z\s,]+$/.test(t)) t = t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return virtual ? `${t} (Remote)` : t || null;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "job";
}

async function pullBoard(cfg: WorkdayConfig): Promise<Map<string, CxsPosting> | null> {
  const byPath = new Map<string, CxsPosting>();
  for (const term of SEARCH_TERMS) {
    for (let page = 0; page < MAX_PAGES_PER_TERM; page++) {
      let res: Response;
      try {
        res = await fetch(cfg.cxs, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
          body: JSON.stringify({ appliedFacets: {}, limit: PAGE_LIMIT, offset: page * PAGE_LIMIT, searchText: term }),
        });
      } catch {
        return null; // network failure → caller must NOT expire anything
      }
      if (!res.ok) return null;
      const data = (await res.json()) as { jobPostings?: CxsPosting[] };
      const hits = data?.jobPostings ?? [];
      for (const h of hits) {
        if (!h.externalPath) continue;
        if (!ATL_RE.test(h.locationsText ?? "")) continue; // text filter: GA only, no remote-anywhere floods
        byPath.set(h.externalPath, h);
      }
      if (hits.length < PAGE_LIMIT) break;
    }
  }
  return byPath;
}

export type WorkdaySyncResult = {
  companies: number;
  pulled: number;
  created: number;
  reactivated: number;
  expired: number;
  failed: number;
};

export async function syncWorkdayJobs(env: Env, maxCompanies = 40): Promise<WorkdaySyncResult> {
  const db = createDb(env);
  const entries = await db
    .select({ id: directoryEntries.id, name: directoryEntries.name, attributes: directoryEntries.attributes })
    .from(directoryEntries)
    .where(and(
      eq(directoryEntries.kind, "company"),
      eq(directoryEntries.status, "active"),
      sql`${directoryEntries.attributes} ? 'workday'`,
    ))
    .orderBy(sql`coalesce(${directoryEntries.attributes}->'workday'->>'last_polled', '1970') asc`)
    .limit(maxCompanies);

  const out: WorkdaySyncResult = { companies: entries.length, pulled: 0, created: 0, reactivated: 0, expired: 0, failed: 0 };

  for (const entry of entries) {
    const cfg = (entry.attributes as Record<string, unknown>).workday as WorkdayConfig;
    const board = await pullBoard(cfg);
    if (board === null) { out.failed++; continue; } // fetch failed: skip company, keep its jobs
    const jobs = [...board.values()].map((h) => ({
      slug: `${slugify(`${entry.name} ${h.title ?? "role"}`)}-${crypto.randomUUID().slice(0, 8)}`,
      title: h.title ?? "Untitled",
      company: entry.name,
      location: cleanLocation(h.locationsText) ?? "Atlanta, Georgia, United States",
      // Workday spells remote many ways: "VIRTUAL", "Remote", a (Remote)
      // title suffix; "hybrid" occasionally appears in either.
      workplaceType: inferWorkplace(h.title, h.locationsText),
      seniority: null as string | null,
      salaryMin: null as number | null,
      salaryMax: null as number | null,
      applyUrl: `${cfg.base}${h.externalPath}`,
      status: "active",
      postedAt: parsePostedOn(h.postedOn),
      source: "workday",
      content: { workday: true, company_website: undefined } as Record<string, unknown>,
    }));
    out.pulled += jobs.length;

    const urls = jobs.map((j) => j.applyUrl);
    if (jobs.length > 0) {
      const inserted = await db
        .insert(jobPostings)
        .values(jobs)
        .onConflictDoNothing({ target: jobPostings.applyUrl })
        .returning({ id: jobPostings.id });
      out.created += inserted.length;

      const react = await db
        .update(jobPostings)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(
          eq(jobPostings.status, "expired"),
          eq(jobPostings.source, "workday"),
          inArray(jobPostings.applyUrl, urls),
        ))
        .returning({ id: jobPostings.id });
      out.reactivated += react.length;
    }

    // Per-company, per-source expiry: only THIS company's workday jobs, and
    // only after a successful pull (an empty board is a real signal here —
    // pullBoard returned non-null, so the API answered).
    const gone = await db
      .update(jobPostings)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(
        eq(jobPostings.status, "active"),
        eq(jobPostings.source, "workday"),
        eq(jobPostings.company, entry.name),
        urls.length > 0 ? notInArray(jobPostings.applyUrl, urls) : sql`true`,
      ))
      .returning({ id: jobPostings.id });
    out.expired += gone.length;

    await db
      .update(directoryEntries)
      .set({
        attributes: sql`${directoryEntries.attributes} || jsonb_build_object('workday', (${directoryEntries.attributes}->'workday') || jsonb_build_object('last_polled', ${new Date().toISOString()}::text))`,
        updatedAt: new Date(),
      })
      .where(eq(directoryEntries.id, entry.id));
  }
  return out;
}
