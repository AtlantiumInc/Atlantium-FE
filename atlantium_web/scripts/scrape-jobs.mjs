/**
 * scrape-jobs.mjs — Pull Atlanta AI/tech job postings from hiring.cafe
 * and write them to src/data/jobs.json (the seed source for seed-jobs.js).
 *
 * hiring.cafe serves search results through its Next.js data route:
 *   GET https://hiringcafe.com/_next/data/<buildId>/index.json?searchState=<json>&page=N
 * The buildId changes on every deploy, so we discover it from the homepage first.
 *
 * Run from project root:
 *   node scripts/scrape-jobs.mjs
 * Then push new rows to Xano:
 *   XANO_AUTH_TOKEN=... node scripts/seed-jobs.js
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../src/data/jobs.json");

const BASE = "https://hiringcafe.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

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

const MAX_PAGES = 40;
const PAGE_DELAY_MS = 750;
// Keep the board fresh and the list payload light: newest first, then cap.
const MAX_AGE_DAYS = Number(process.env.MAX_AGE_DAYS || 30);
const MAX_JOBS = Number(process.env.MAX_JOBS || 500);

async function getBuildId() {
  const res = await fetch(BASE, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Homepage fetch failed: ${res.status}`);
  const html = await res.text();
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error("Could not find Next.js buildId in homepage HTML");
  return m[1];
}

function mapHit(h) {
  const pd = h.v5_processed_job_data ?? {};
  const cd = h.enriched_company_data ?? {};
  return {
    id: h.id,
    title: pd.core_job_title || h.job_information?.title || "Untitled",
    company: pd.company_name || cd.name || "Unknown",
    company_website: pd.company_website || cd.homepage_uri || null,
    company_size: cd.nb_employees ?? null,
    location: pd.formatted_workplace_location || "Atlanta, Georgia, United States",
    workplace_type: pd.workplace_type || null,
    commitment: pd.commitment || null,
    seniority: pd.seniority_level || null,
    salary_min: pd.yearly_min_compensation != null ? Math.round(pd.yearly_min_compensation) : null,
    salary_max: pd.yearly_max_compensation != null ? Math.round(pd.yearly_max_compensation) : null,
    requirements_summary: pd.requirements_summary || null,
    tech_stack: pd.technical_tools || [],
    yoe: pd.min_industry_and_role_yoe ?? null,
    posted_at: pd.estimated_publish_date || null,
    apply_url: h.apply_url,
    hiring_cafe_url: `https://hiring.cafe/viewjob/${encodeURIComponent(h.objectID)}`,
    security_clearance: pd.security_clearance || "None",
    visa_sponsorship: pd.visa_sponsorship ?? false,
  };
}

async function fetchPage(buildId, page) {
  const qs = new URLSearchParams({ searchState: JSON.stringify(SEARCH_STATE) });
  if (page > 0) qs.set("page", String(page));
  const url = `${BASE}/_next/data/${buildId}/index.json?${qs}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Page ${page} failed: ${res.status}`);
  const data = await res.json();
  return data?.pageProps?.ssrHits ?? [];
}

const buildId = await getBuildId();
console.log(`buildId: ${buildId}`);

const byUrl = new Map();
for (let page = 0; page < MAX_PAGES; page++) {
  const hits = await fetchPage(buildId, page);
  if (hits.length === 0) break;
  let fresh = 0;
  for (const h of hits) {
    if (!h.apply_url || h.is_expired) continue;
    if (!byUrl.has(h.apply_url)) {
      byUrl.set(h.apply_url, mapHit(h));
      fresh++;
    }
  }
  console.log(`page ${page}: ${hits.length} hits, ${fresh} new (total ${byUrl.size})`);
  if (fresh === 0) break;
  await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
}

const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const scraped = byUrl.size;
const jobs = [...byUrl.values()]
  .filter((j) => j.posted_at && new Date(j.posted_at).getTime() >= cutoff)
  .sort((a, b) => new Date(b.posted_at ?? 0) - new Date(a.posted_at ?? 0))
  .slice(0, MAX_JOBS);
console.log(
  `\n${scraped} scraped → ${jobs.length} kept (≤${MAX_AGE_DAYS} days old, max ${MAX_JOBS})`
);

if (jobs.length === 0) {
  console.error("No jobs scraped — refusing to overwrite jobs.json");
  process.exit(1);
}

if (existsSync(OUT_FILE)) {
  const prev = JSON.parse(readFileSync(OUT_FILE, "utf-8"));
  console.log(`\nReplacing ${prev.length} previous jobs with ${jobs.length} fresh ones.`);
}
writeFileSync(OUT_FILE, JSON.stringify(jobs, null, 2) + "\n");
console.log(`Wrote ${jobs.length} jobs to ${OUT_FILE}`);
