/**
 * jobs-sync.ts — Weekly hiring.cafe rescrape, run inside the worker.
 *
 * Same pipeline as atlantium_web/scripts/scrape-jobs.mjs + scripts/seed-jobs.ts,
 * ported so the cron trigger keeps the board fresh without a laptop involved:
 * scrape hiring.cafe's Next.js data route → keep newest ≤30 days (cap 500) →
 * upsert keyed by apply_url (stable slugs) → re-activate returners → expire
 * rows that vanished from the feed.
 *
 * Safety: if the scrape yields suspiciously few jobs (site redesign, block,
 * outage) we abort before touching rows, so a bad run can't wipe the board.
 */

import { eq, and, inArray, notInArray } from "drizzle-orm";
import { createDb } from "../db/client";
import { jobPostings } from "../db/schema";
import type { Env } from "../env";

const BASE = "https://hiringcafe.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const MAX_PAGES = 60;
const PAGE_DELAY_MS = 500;
// Abort (no expiry, no inserts) when a scrape looks broken rather than empty.
const MIN_SANE_JOBS = 50;

// Same search the /jobs page advertises: Atlanta + 50mi, plus remote-in-Georgia,
// across the tech/growth departments.
const SEARCH_STATE = {
  locations: [
    {
      id: "xhk1yZQBoEtHp_8Ur67o",
      types: ["locality"],
      address_components: [
        { long_name: "Atlanta", short_name: "Atlanta", types: ["locality"] },
        { long_name: "Georgia", short_name: "GA", types: ["administrative_area_level_1"] },
        { long_name: "United States", short_name: "US", types: ["country"] },
      ],
      geometry: { location: { lat: 33.749, lon: -84.38798 } },
      formatted_address: "Atlanta, GA, US",
      population: 463878,
      workplace_types: [],
      options: { radius: 50, radius_unit: "miles", ignore_radius: false },
    },
    {
      types: ["administrative_area_level_1"],
      formatted_address: "Georgia, United States",
      address_components: [
        { long_name: "Georgia", short_name: "GA", types: ["administrative_area_level_1"] },
        { long_name: "United States", short_name: "US", types: ["country"] },
      ],
      workplace_types: ["Remote"],
      options: {},
      id: "Georgia, United Statesadministrative_area_level_1",
    },
  ],
  departments: [
    "Engineering",
    "Software Development",
    "Information Technology",
    "Data and Analytics",
    "Marketing",
    "Business Development",
  ],
};

type ScrapedJob = {
  title: string;
  company: string;
  location: string;
  workplace_type: string | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string;
  posted_at: string | null;
  content: Record<string, unknown>;
};

export type JobsSyncResult = {
  buildId: string;
  scraped: number;
  kept: number;
  created: number;
  reactivated: number;
  expired: number;
};

async function getBuildId(): Promise<string> {
  const res = await fetch(BASE, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`hiring.cafe homepage fetch failed: ${res.status}`);
  const html = await res.text();
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error("Could not find Next.js buildId in hiring.cafe homepage");
  return m[1];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHit(h: any): ScrapedJob {
  const pd = h.v5_processed_job_data ?? {};
  const cd = h.enriched_company_data ?? {};
  return {
    title: pd.core_job_title || h.job_information?.title || "Untitled",
    company: pd.company_name || cd.name || "Unknown",
    location: pd.formatted_workplace_location || "Atlanta, Georgia, United States",
    workplace_type: pd.workplace_type || null,
    seniority: pd.seniority_level || null,
    salary_min: pd.yearly_min_compensation != null ? Math.round(pd.yearly_min_compensation) : null,
    salary_max: pd.yearly_max_compensation != null ? Math.round(pd.yearly_max_compensation) : null,
    apply_url: h.apply_url,
    posted_at: pd.estimated_publish_date || null,
    content: {
      requirements_summary: pd.requirements_summary || null,
      tech_stack: pd.technical_tools || [],
      yoe: pd.min_industry_and_role_yoe ?? null,
      commitment: pd.commitment || null,
      company_size: cd.nb_employees ?? null,
      company_website: pd.company_website || cd.homepage_uri || null,
      security_clearance: pd.security_clearance || "None",
      visa_sponsorship: pd.visa_sponsorship ?? false,
      hiring_cafe_url: h.objectID
        ? `https://hiring.cafe/viewjob/${encodeURIComponent(h.objectID)}`
        : null,
    },
  };
}

async function fetchPage(buildId: string, page: number) {
  const qs = new URLSearchParams({ searchState: JSON.stringify(SEARCH_STATE) });
  if (page > 0) qs.set("page", String(page));
  const res = await fetch(`${BASE}/_next/data/${buildId}/index.json?${qs}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`hiring.cafe page ${page} failed: ${res.status}`);
  const data = (await res.json()) as { pageProps?: { ssrHits?: unknown[] } };
  return data?.pageProps?.ssrHits ?? [];
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "job"
  );
}

export async function syncJobPostings(env: Env): Promise<JobsSyncResult> {
  const buildId = await getBuildId();

  const byUrl = new Map<string, ScrapedJob>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const hits = await fetchPage(buildId, page);
    if (hits.length === 0) break;
    let fresh = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const h of hits as any[]) {
      if (!h.apply_url || h.is_expired) continue;
      if (!byUrl.has(h.apply_url)) {
        byUrl.set(h.apply_url, mapHit(h));
        fresh++;
      }
    }
    if (fresh === 0) break;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  // Keep everything the feed returns — the board is uncapped; the list API
  // paginates, so table size no longer costs page-load weight.
  const kept = [...byUrl.values()].sort(
    (a, b) => new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime(),
  );

  if (kept.length < MIN_SANE_JOBS) {
    throw new Error(
      `jobs-sync aborted: only ${kept.length} jobs scraped (min ${MIN_SANE_JOBS}) — leaving the board untouched`,
    );
  }

  const db = createDb(env);
  const urls = kept.map((j) => j.apply_url);

  let created = 0;
  const CHUNK = 100;
  for (let i = 0; i < kept.length; i += CHUNK) {
    const rows = kept.slice(i, i + CHUNK).map((j) => ({
      slug: `${slugify(`${j.company} ${j.title}`)}-${crypto.randomUUID().slice(0, 8)}`,
      title: j.title,
      company: j.company,
      location: j.location,
      workplaceType: j.workplace_type,
      seniority: j.seniority,
      salaryMin: j.salary_min,
      salaryMax: j.salary_max,
      applyUrl: j.apply_url,
      status: "active",
      postedAt: j.posted_at ? new Date(j.posted_at) : null,
      content: j.content,
    }));
    const inserted = await db
      .insert(jobPostings)
      .values(rows)
      .onConflictDoNothing({ target: jobPostings.applyUrl })
      .returning({ id: jobPostings.id });
    created += inserted.length;
  }

  // A job that dropped out of the feed one week and returned the next should
  // come back to life rather than stay expired behind the apply_url conflict.
  const reactivated = await db
    .update(jobPostings)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(jobPostings.status, "expired"), inArray(jobPostings.applyUrl, urls)))
    .returning({ id: jobPostings.id });

  const expired = await db
    .update(jobPostings)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(jobPostings.status, "active"), notInArray(jobPostings.applyUrl, urls)))
    .returning({ id: jobPostings.id });

  return {
    buildId,
    scraped: byUrl.size,
    kept: kept.length,
    created,
    reactivated: reactivated.length,
    expired: expired.length,
  };
}
