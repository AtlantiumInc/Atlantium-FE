/**
 * seed-jobs.js — One-time script to seed job_postings table from jobs.json
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
const ENDPOINT = `${API_BASE}/job_postings/create`;

// Admin bearer token (user auth token with is_admin = true)
const AUTH_TOKEN =
  "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.To3iiFihCdN_FcuhOIi5XGOv9XJDSbFY49xm59gZ92tQsPhRjFQ9Rse1miA-nJBOB6IFLESndUmjaJARNiZ4zvwRLJCUSWdg.j4w_2NjG9RYQhGn6W9ajyA.R07U7t9KqZXe55sgPmDpFUVstdFXYG5CFoJrwfyA2fumymGZx5U1Dh_DO3OjNPueUgmW-5rgWiHnAVs1hbOZpaAlEs6qIWI9_QsS4U-tc-X-aIYlyIZ7esUsaPNWhO7Vze4unauuzwnvf0Bynvcc8RaB4947bYOzHOpa-T_fzGNR_aOw_UMPATxjcdZRhCSy.qS_KhQGH8tOk8_jf6XTMXEnFiMRycRLtKuGXZNOSTxA";

const jobs = JSON.parse(readFileSync(JOBS_FILE, "utf-8"));

async function seedJob(job, index) {
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
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[${index + 1}/${jobs.length}] FAIL: ${job.company} — ${job.title}`);
      console.error("  Error:", data.message || JSON.stringify(data));
      return false;
    }

    console.log(`[${index + 1}/${jobs.length}] OK: ${job.company} — ${job.title} (slug: ${data.slug})`);
    return true;
  } catch (err) {
    console.error(`[${index + 1}/${jobs.length}] ERROR: ${job.company} — ${job.title}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`Seeding ${jobs.length} jobs to ${ENDPOINT}...\n`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i++) {
    const ok = await seedJob(jobs[i], i);
    if (ok) success++;
    else failed++;

    // Small delay to avoid rate limiting
    if (i < jobs.length - 1) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
