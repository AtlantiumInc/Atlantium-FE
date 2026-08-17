/**
 * ats-usajobs.ts — federal jobs for the Atlanta board, straight from the
 * official USAJOBS Search API.
 *
 * Why it earns a place: cleared/federal cyber and IT roles (CDC, FBI Atlanta,
 * Army Cyber at Fort Eisenhower, VA, CMS contractors) barely surface in
 * aggregator feeds — this inventory is near-exclusive. The API is free but
 * keyed (register at developer.usajobs.gov; key + registered email go in
 * USAJOBS_API_KEY / USAJOBS_USER_AGENT).
 *
 * Scope: Georgia, tech-relevant OPM occupational series only —
 *   2210 IT Management (the cyber/IT catch-all), 1550 Computer Science,
 *   0854 Computer Engineering, 1560 Data Science, 0855 Electronics Eng,
 *   1102/0343 excluded on purpose (contracting/analysis noise).
 * Lifecycle: source='usajobs', expired when missing from a SUCCESSFUL fetch —
 * a failed or partial fetch never expires anything.
 */
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { createDb } from "../db/client";
import { jobPostings } from "../db/schema";
import type { Env } from "../env";

const SERIES = ["2210", "1550", "0854", "1560", "0855"];
const PAGE_SIZE = 500; // API max
const MAX_PAGES = 4;

type UsaJobsItem = {
  MatchedObjectDescriptor?: {
    PositionTitle?: string;
    OrganizationName?: string;
    DepartmentName?: string;
    PositionURI?: string;
    PositionLocation?: Array<{ LocationName?: string }>;
    PublicationStartDate?: string;
    PositionRemuneration?: Array<{ MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string }>;
    JobCategory?: Array<{ Code?: string }>;
    PositionSchedule?: Array<{ Name?: string }>;
    UserArea?: { Details?: { TeleworkEligible?: boolean; RemoteIndicator?: boolean } };
  };
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "job";
}

export type UsaJobsSyncResult = {
  skipped?: string;
  fetched: number;
  created: number;
  reactivated: number;
  expired: number;
};

export async function syncUsaJobs(env: Env): Promise<UsaJobsSyncResult> {
  if (!env.USAJOBS_API_KEY || !env.USAJOBS_USER_AGENT) {
    return { skipped: "USAJOBS_API_KEY / USAJOBS_USER_AGENT not set", fetched: 0, created: 0, reactivated: 0, expired: 0 };
  }
  const headers = {
    Host: "data.usajobs.gov",
    "User-Agent": env.USAJOBS_USER_AGENT,
    "Authorization-Key": env.USAJOBS_API_KEY,
  };

  const byUrl = new Map<string, ReturnType<typeof mapItem>>();
  function mapItem(item: UsaJobsItem) {
    const d = item.MatchedObjectDescriptor ?? {};
    const pay = (d.PositionRemuneration ?? []).find((r) => r.RateIntervalCode === "PA" || r.RateIntervalCode === "Per Year");
    const locs = (d.PositionLocation ?? []).map((l) => l.LocationName).filter(Boolean);
    const remote = d.UserArea?.Details?.RemoteIndicator === true;
    return {
      title: d.PositionTitle ?? "Untitled",
      company: d.OrganizationName || d.DepartmentName || "U.S. Federal Government",
      location: locs[0] ?? "Georgia, United States",
      workplaceType: remote ? "Remote" : "Onsite",
      seniority: null as string | null,
      salaryMin: pay?.MinimumRange ? Math.round(Number(pay.MinimumRange)) : null,
      salaryMax: pay?.MaximumRange ? Math.round(Number(pay.MaximumRange)) : null,
      applyUrl: d.PositionURI ?? "",
      status: "active",
      postedAt: d.PublicationStartDate ? new Date(d.PublicationStartDate) : null,
      source: "usajobs",
      content: {
        usajobs: true,
        agency: d.DepartmentName ?? null,
        series: d.JobCategory?.[0]?.Code ?? null,
        telework: d.UserArea?.Details?.TeleworkEligible ?? null,
      } as Record<string, unknown>,
    };
  }

  for (let page = 1; page <= MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      LocationName: "Georgia",
      JobCategoryCode: SERIES.join(";"),
      ResultsPerPage: String(PAGE_SIZE),
      Page: String(page),
    });
    const res = await fetch(`https://data.usajobs.gov/api/search?${qs}`, { headers });
    if (!res.ok) throw new Error(`usajobs fetch failed: ${res.status} — leaving board untouched`);
    const data = (await res.json()) as { SearchResult?: { SearchResultItems?: UsaJobsItem[]; SearchResultCountAll?: number } };
    const items = data?.SearchResult?.SearchResultItems ?? [];
    for (const item of items) {
      const mapped = mapItem(item);
      if (!mapped.applyUrl) continue;
      if (!byUrl.has(mapped.applyUrl)) byUrl.set(mapped.applyUrl, mapped);
    }
    if (items.length < PAGE_SIZE) break;
  }

  const jobs = [...byUrl.values()].map((j) => ({ ...j, slug: `${slugify(`${j.company} ${j.title}`)}-${crypto.randomUUID().slice(0, 8)}` }));
  const db = createDb(env);
  const urls = jobs.map((j) => j.applyUrl);
  let created = 0;
  for (let i = 0; i < jobs.length; i += 100) {
    const inserted = await db.insert(jobPostings).values(jobs.slice(i, i + 100))
      .onConflictDoNothing({ target: jobPostings.applyUrl })
      .returning({ id: jobPostings.id });
    created += inserted.length;
  }
  const reactivated = urls.length
    ? await db.update(jobPostings)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(eq(jobPostings.status, "expired"), eq(jobPostings.source, "usajobs"), inArray(jobPostings.applyUrl, urls)))
        .returning({ id: jobPostings.id })
    : [];
  const expired = await db.update(jobPostings)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(
      eq(jobPostings.status, "active"),
      eq(jobPostings.source, "usajobs"),
      urls.length ? notInArray(jobPostings.applyUrl, urls) : undefined,
    ))
    .returning({ id: jobPostings.id });

  return { fetched: byUrl.size, created, reactivated: reactivated.length, expired: expired.length };
}
