/**
 * seed-jobs.ts — Upsert scraped job postings into Neon.
 *
 * Reads atlantium_web/src/data/jobs.json (produced by
 * atlantium_web/scripts/scrape-jobs.mjs) and inserts net-new rows keyed by
 * apply_url. Existing rows keep their slug (stable URLs); scraped rows that
 * disappeared from the feed are marked status='expired' with --expire-missing.
 *
 * Run from services/api:
 *   DATABASE_URL=<neon-branch-url> npx tsx scripts/seed-jobs.ts [--expire-missing]
 */

import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const expireMissing = process.argv.includes("--expire-missing");
const sql = neon(databaseUrl);

const jobsPath = join(process.cwd(), "../../atlantium_web/src/data/jobs.json");
type ScrapedJob = {
  title: string;
  company: string;
  location: string;
  workplace_type?: string | null;
  seniority?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  apply_url: string;
  posted_at?: string | null;
  requirements_summary?: string | null;
  tech_stack?: string[];
  yoe?: number | null;
  commitment?: string | string[] | null;
  company_size?: number | null;
  company_website?: string | null;
  security_clearance?: string | null;
  visa_sponsorship?: boolean;
  hiring_cafe_url?: string | null;
};
const jobs: ScrapedJob[] = JSON.parse(await readFile(jobsPath, "utf8"));
console.log(`Read ${jobs.length} scraped jobs`);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "job";
}

let created = 0;
let skipped = 0;
for (const job of jobs) {
  if (!job.apply_url) continue;
  const slug = `${slugify(`${job.company} ${job.title}`)}-${crypto.randomUUID().slice(0, 8)}`;
  const content = {
    requirements_summary: job.requirements_summary ?? null,
    tech_stack: job.tech_stack ?? [],
    yoe: job.yoe ?? null,
    commitment: job.commitment ?? null,
    company_size: job.company_size ?? null,
    company_website: job.company_website ?? null,
    security_clearance: job.security_clearance ?? "None",
    visa_sponsorship: job.visa_sponsorship ?? false,
    hiring_cafe_url: job.hiring_cafe_url ?? null,
  };
  const rows = await sql.query(
    `INSERT INTO job_postings
       (slug, title, company, location, workplace_type, seniority, salary_min, salary_max, apply_url, status, posted_at, content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
     ON CONFLICT (apply_url) DO NOTHING
     RETURNING id`,
    [
      slug,
      job.title,
      job.company,
      job.location,
      job.workplace_type ?? null,
      job.seniority ?? null,
      job.salary_min != null ? Math.round(job.salary_min) : null,
      job.salary_max != null ? Math.round(job.salary_max) : null,
      job.apply_url,
      job.posted_at ?? null,
      JSON.stringify(content),
    ],
  ) as Array<{ id: string }>;
  if (rows.length > 0) created++;
  else skipped++;
}
console.log(`${created} created, ${skipped} already present`);

if (expireMissing) {
  const urls = jobs.map((j) => j.apply_url).filter(Boolean);
  const expired = await sql.query(
    `UPDATE job_postings
       SET status = 'expired', updated_at = now()
     WHERE status = 'active' AND source = 'hiring_cafe' AND NOT (apply_url = ANY($1::text[]))
     RETURNING id`,
    [urls],
  ) as Array<{ id: string }>;
  console.log(`${expired.length} stale postings marked expired`);
}
