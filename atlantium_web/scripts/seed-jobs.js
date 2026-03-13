/**
 * seed-jobs.js — Upsert job_postings from jobs.json into Xano.
 *
 * Skips jobs whose apply_url already exists in Xano.
 * Only creates net-new listings.
 *
 * Run from project root:
 *   node scripts/seed-jobs.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOBS_FILE = join(__dirname, "../src/data/jobs.json");
const API_BASE = "https://cloud.atlantium.ai/api:_c66cUCc";

const AUTH_TOKEN =
  "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.To3iiFihCdN_FcuhOIi5XGOv9XJDSbFY49xm59gZ92tQsPhRjFQ9Rse1miA-nJBOB6IFLESndUmjaJARNiZ4zvwRLJCUSWdg.j4w_2NjG9RYQhGn6W9ajyA.R07U7t9KqZXe55sgPmDpFUVstdFXYG5CFoJrwfyA2fumymGZx5U1Dh_DO3OjNPueUgmW-5rgWiHnAVs1hbOZpaAlEs6qIWI9_QsS4U-tc-X-aIYlyIZ7esUsaPNWhO7Vze4unauuzwnvf0Bynvcc8RaB4947bYOzHOpa-T_fzGNR_aOw_UMPATxjcdZRhCSy.qS_KhQGH8tOk8_jf6XTMXEnFiMRycRLtKuGXZNOSTxA";

const scrapedJobs = JSON.parse(readFileSync(JOBS_FILE, "utf-8"));
console.log(`Read ${scrapedJobs.length} jobs from jobs.json\n`);

// 1. Fetch all existing apply_urls from Xano
console.log("Fetching existing jobs from Xano...");
const existingRes = await fetch(`${API_BASE}/job_postings`);
if (!existingRes.ok) {
  console.error("Failed to fetch existing jobs:", existingRes.status);
  process.exit(1);
}
const existingJobs = await existingRes.json();
const existingUrls = new Set(existingJobs.map((j) => j.apply_url));
console.log(`${existingJobs.length} jobs already in Xano\n`);

// 2. Filter to only new jobs
const newJobs = scrapedJobs.filter((j) => !existingUrls.has(j.apply_url));
console.log(`${newJobs.length} new jobs to create\n`);

if (newJobs.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

// 3. Create each new job
let success = 0;
let failed = 0;

for (let i = 0; i < newJobs.length; i++) {
  const job = newJobs[i];
  const body = {
    title: job.title,
    company: job.company,
    location: job.location,
    workplace_type: job.workplace_type || null,
    seniority: job.seniority || null,
    salary_min: job.salary_min || null,
    salary_max: job.salary_max || null,
    apply_url: job.apply_url,
    status: "active",
    posted_at: job.posted_at || null,
    content: {
      requirements_summary: job.requirements_summary || null,
      tech_stack: job.tech_stack || [],
      yoe: job.yoe || null,
      commitment: job.commitment || null,
      company_size: job.company_size || null,
      company_website: job.company_website || null,
      security_clearance: job.security_clearance || "None",
      visa_sponsorship: job.visa_sponsorship || false,
    },
  };

  try {
    const res = await fetch(`${API_BASE}/job_postings/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[${i + 1}/${newJobs.length}] FAIL: ${job.company} — ${job.title}: ${data.message ?? JSON.stringify(data)}`);
      failed++;
    } else {
      console.log(`[${i + 1}/${newJobs.length}] OK: ${job.company} — ${job.title} (slug: ${data.slug})`);
      success++;
    }
  } catch (err) {
    console.error(`[${i + 1}/${newJobs.length}] ERROR: ${job.company} — ${job.title}: ${err.message}`);
    failed++;
  }

  if (i < newJobs.length - 1) await new Promise((r) => setTimeout(r, 100));
}

console.log(`\nDone. ${success} created, ${failed} failed.`);
