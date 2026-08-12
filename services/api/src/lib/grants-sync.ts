import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import type { Db } from "../db/client";
import { directorySources } from "../db/schema";
import type { Env } from "../env";
import { expireClosedGrants, recordSyncRun, sourceEnabled, upsertEntry } from "./directory";
import type { UpsertInput } from "./directory";

/**
 * Grant + municipal-resource sync.
 *
 * Curation model: these programs publish on hand-maintained government and
 * accelerator pages with no feeds and frequently-changing markup, so the
 * catalogue below is the seed of record — each row carries its real
 * source_url, and the AI verification pass re-reads that page to catch
 * closures. Scrapers for individual sources plug in behind the same
 * upsertEntry()/(source, external_id) identity without schema change.
 */

export const GRANT_SOURCES: Array<{ id: string; displayName: string; baseUrl: string }> = [
  { id: "invest_atlanta", displayName: "Invest Atlanta", baseUrl: "https://www.investatlanta.com" },
  { id: "georgia_state", displayName: "Georgia State Programs", baseUrl: "https://www.georgia.org" },
  { id: "federal_sbir", displayName: "SBIR / SBA", baseUrl: "https://www.sbir.gov" },
  { id: "atlanta_accelerators", displayName: "Atlanta Accelerators", baseUrl: "https://www.atlantatechvillage.com" },
];

type SeedGrant = UpsertInput & { kind: "grant" | "resource" };

const CATALOGUE: SeedGrant[] = [
  {
    kind: "grant",
    source: "invest_atlanta",
    externalId: "small-business-improvement-grant",
    name: "Atlanta Small Business Improvement Grant",
    summary:
      "Matching grant for Atlanta small businesses investing in facility, technology, or equipment improvements. Administered by Invest Atlanta for businesses inside city limits.",
    website: "https://www.investatlanta.com/small-business",
    location: "Atlanta, GA",
    tags: ["small-business", "matching", "city"],
    sourceUrl: "https://www.investatlanta.com/small-business",
    grant: {
      funder: "Invest Atlanta",
      amountMin: 5000,
      amountMax: 50000,
      deadlineDate: "2026-09-30",
      recurring: true,
      eligibility: ["Atlanta city limits", "Registered small business", "Matching funds required"],
      applicationUrl: "https://www.investatlanta.com/small-business",
    },
  },
  {
    kind: "grant",
    source: "invest_atlanta",
    externalId: "creative-industries-fund",
    name: "Creative Industries Loan & Grant Fund",
    summary:
      "Capital for Atlanta creative and technology businesses — film, music, design, and digital media — combining grant and low-interest loan components.",
    website: "https://www.investatlanta.com/creative-industries",
    location: "Atlanta, GA",
    tags: ["creative", "media", "technology"],
    sourceUrl: "https://www.investatlanta.com/creative-industries",
    grant: {
      funder: "Invest Atlanta",
      amountMin: 10000,
      amountMax: 100000,
      deadlineDate: "2026-10-15",
      recurring: true,
      eligibility: ["Creative or tech business", "Atlanta-based", "Revenue history required"],
      applicationUrl: "https://www.investatlanta.com/creative-industries",
    },
  },
  {
    kind: "grant",
    source: "georgia_state",
    externalId: "georgia-research-alliance-ventures",
    name: "Georgia Research Alliance Venture Fund",
    summary:
      "Seed investment for Georgia startups commercializing university research, with follow-on capital available as milestones are met.",
    website: "https://gra.org/ventures",
    location: "Georgia",
    tags: ["deep-tech", "research", "seed"],
    sourceUrl: "https://gra.org/ventures",
    grant: {
      funder: "Georgia Research Alliance",
      amountMin: 50000,
      amountMax: 500000,
      recurring: true,
      eligibility: ["Georgia-based", "University-derived technology", "Pre-seed to seed stage"],
      applicationUrl: "https://gra.org/ventures",
    },
  },
  {
    kind: "grant",
    source: "federal_sbir",
    externalId: "sbir-phase-i",
    name: "SBIR Phase I (Georgia applicants)",
    summary:
      "Federal non-dilutive R&D funding for small technology businesses. Phase I proves feasibility; Phase II funds development. Multiple agencies run rolling solicitations.",
    website: "https://www.sbir.gov/funding",
    location: "Georgia / National",
    tags: ["federal", "r-and-d", "non-dilutive"],
    sourceUrl: "https://www.sbir.gov/funding",
    grant: {
      funder: "U.S. Small Business Administration",
      amountMin: 50000,
      amountMax: 314000,
      recurring: true,
      eligibility: ["US-owned small business", "Fewer than 500 employees", "R&D component required"],
      applicationUrl: "https://www.sbir.gov/funding",
    },
  },
  {
    kind: "grant",
    source: "georgia_state",
    externalId: "georgia-quick-start-training",
    name: "Georgia Quick Start Workforce Training",
    summary:
      "State-funded custom workforce training for qualifying companies — delivered at no cost to the employer, including technical and software training programs.",
    website: "https://www.georgiaquickstart.org",
    location: "Georgia",
    tags: ["workforce", "training", "state"],
    sourceUrl: "https://www.georgiaquickstart.org",
    grant: {
      funder: "State of Georgia",
      recurring: true,
      eligibility: ["Job creation commitment", "Qualifying industry", "Georgia facility"],
      applicationUrl: "https://www.georgiaquickstart.org",
    },
  },
  {
    kind: "resource",
    source: "georgia_state",
    externalId: "georgia-jobs-tax-credit",
    name: "Georgia Jobs Tax Credit",
    summary:
      "Per-job state tax credit for companies creating qualifying positions in Georgia, with higher credit values in less-developed counties.",
    website: "https://www.georgia.org/incentives",
    location: "Georgia",
    tags: ["tax-credit", "hiring", "state"],
    sourceUrl: "https://www.georgia.org/incentives",
    resource: {
      category: "tax_credit",
      eligibility: ["Net new jobs", "Qualifying industry", "Minimum job thresholds by county tier"],
      applicationUrl: "https://www.georgia.org/incentives",
    },
  },
  {
    kind: "resource",
    source: "georgia_state",
    externalId: "georgia-rd-tax-credit",
    name: "Georgia Research & Development Tax Credit",
    summary:
      "State credit against income tax for increased qualified research spending in Georgia; unused credit can offset payroll withholding.",
    website: "https://www.georgia.org/incentives",
    location: "Georgia",
    tags: ["tax-credit", "r-and-d", "state"],
    sourceUrl: "https://www.georgia.org/incentives",
    resource: {
      category: "tax_credit",
      eligibility: ["Qualified research in Georgia", "Increase over base amount"],
      applicationUrl: "https://www.georgia.org/incentives",
    },
  },
  {
    kind: "resource",
    source: "atlanta_accelerators",
    externalId: "atlanta-tech-village-pre-accelerator",
    name: "Atlanta Tech Village Pre-Accelerator",
    summary:
      "Programming and desk space for very early Atlanta founders, including mentorship and investor introductions ahead of a formal raise.",
    website: "https://atlantatechvillage.com",
    location: "Atlanta, GA",
    tags: ["accelerator", "founders", "community"],
    sourceUrl: "https://atlantatechvillage.com",
    resource: {
      category: "accelerator",
      eligibility: ["Pre-seed founders", "Atlanta-based"],
      applicationUrl: "https://atlantatechvillage.com",
    },
  },
  {
    kind: "resource",
    source: "atlanta_accelerators",
    externalId: "techstars-atlanta",
    name: "Techstars Atlanta",
    summary:
      "Mentor-driven accelerator running Atlanta cohorts with standard investment terms and demo-day access to national investors.",
    website: "https://www.techstars.com",
    location: "Atlanta, GA",
    tags: ["accelerator", "investment", "cohort"],
    sourceUrl: "https://www.techstars.com",
    resource: {
      category: "accelerator",
      eligibility: ["Early-stage startup", "Willing to relocate for program"],
      applicationUrl: "https://www.techstars.com",
    },
  },
  {
    kind: "resource",
    source: "invest_atlanta",
    externalId: "women-entrepreneurship-initiative",
    name: "Women's Entrepreneurship Initiative",
    summary:
      "Year-long Atlanta incubator for women founders offering free space, mentorship, and a path to city procurement and capital networks.",
    website: "https://www.investatlanta.com",
    location: "Atlanta, GA",
    tags: ["incubator", "women-founders", "city"],
    sourceUrl: "https://www.investatlanta.com",
    resource: {
      category: "city_program",
      eligibility: ["Women-owned business", "Atlanta-based", "Early revenue"],
      applicationUrl: "https://www.investatlanta.com",
    },
  },
];

/** Register sources once; safe to re-run. */
export async function ensureSources(db: Db) {
  for (const s of GRANT_SOURCES) {
    await db
      .insert(directorySources)
      .values({ id: s.id, displayName: s.displayName, baseUrl: s.baseUrl })
      .onConflictDoNothing();
  }
}

export async function syncGrants(env: Env) {
  const db = createDb(env);
  await ensureSources(db);

  const stats = { created: 0, updated: 0, skipped_disabled: 0, expired: 0 };
  const bySource = new Map<string, number>();

  for (const item of CATALOGUE) {
    // Registry kill switch is checked BEFORE any work for that source.
    if (!(await sourceEnabled(db, item.source))) {
      stats.skipped_disabled += 1;
      continue;
    }
    const { created } = await upsertEntry(db, item);
    if (created) stats.created += 1;
    else stats.updated += 1;
    bySource.set(item.source, (bySource.get(item.source) ?? 0) + 1);
  }

  const closed = await expireClosedGrants(db);
  stats.expired = closed.length;

  for (const [source, count] of bySource) {
    await db
      .update(directorySources)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(directorySources.id, source));
    await recordSyncRun(db, "grant", source, { entries: count });
  }

  return stats;
}
