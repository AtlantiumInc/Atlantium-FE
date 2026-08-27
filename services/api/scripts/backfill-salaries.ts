/**
 * backfill-salaries.ts — recover pay for postings that landed without it.
 *
 * Why this exists: the Workday ATS sync hardcoded salaryMin/salaryMax to null
 * (ats-workday.ts), so every workday-sourced row arrived unpriced — 224 of
 * them in a single 5-day window. The jobs-review pipeline already fetches each
 * live apply page daily, but its extraction schema only ever asked for degree
 * and liveness, so it read past the pay every time.
 *
 * Two recovery paths, because the pages differ in kind:
 *   workday — the rendered page is a JS shell with no text, but the CXS detail
 *             endpoint behind it returns the posting as JSON, pay included.
 *   other   — server-rendered ATS pages (Greenhouse, iCIMS, Taleo, branded
 *             career sites) can be fetched and read directly.
 *
 * Run:
 *   DATABASE_URL=<neon> npx tsx scripts/backfill-salaries.ts --days=5 --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/backfill-salaries.ts --days=5 --apply
 */
import { neon } from "@neondatabase/serverless";
import { extractPay, toText, type Pay } from "../src/lib/salary-parse";
import { cxsUrl } from "../src/lib/workday-cxs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type Row = { slug: string; company: string; apply_url: string; source: string };

const args = process.argv.slice(2);
const flag = (name: string, dflt: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? dflt;
const DAYS = Number(flag("days", "5"));
const LIMIT = Number(flag("limit", "5000"));
const CONCURRENCY = Number(flag("concurrency", "8"));
const APPLY = args.includes("--apply");

const DB = process.env.DATABASE_URL;
if (!DB) throw new Error("DATABASE_URL is required");
const sql = neon(DB);

async function get(url: string, json: boolean): Promise<string | null> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: json ? "application/json" : "text/html" },
      redirect: "follow",
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

async function payFor(row: Row): Promise<Pay | null> {
  const cxs = cxsUrl(row.apply_url);
  if (cxs) {
    const body = await get(cxs, true);
    // The pay usually sits inside the description HTML rather than a typed
    // field, so read the whole payload as text.
    if (body) return extractPay(toText(body));
    return null;
  }
  const html = await get(row.apply_url, false);
  return html ? extractPay(toText(html)) : null;
}

async function main() {
  const rows = (await sql`
    select slug, company, apply_url, source
    from job_postings
    where status = 'active'
      and salary_max is null
      and apply_url is not null
      and created_at >= now() - (${String(DAYS)} || ' days')::interval
    order by created_at desc
    limit ${LIMIT}
  `) as Row[];

  console.log(`candidates: ${rows.length} (past ${DAYS}d, active, unpriced)`);
  console.log(APPLY ? "MODE: apply\n" : "MODE: dry-run (no writes)\n");

  const found: Array<{ row: Row; pay: Pay }> = [];
  let done = 0;

  // Fixed-size worker pool: these are other people's career sites, so keep the
  // request rate modest rather than opening 600 sockets at once.
  const queue = [...rows];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const row = queue.shift();
        if (!row) return;
        const pay = await payFor(row);
        done++;
        if (pay) {
          found.push({ row, pay });
          console.log(
            `  💰 ${row.source.padEnd(11)} ${row.company.slice(0, 26).padEnd(26)} ` +
              `$${pay.min.toLocaleString()}–$${pay.max.toLocaleString()}` +
              `${pay.basis === "hourly" ? "  (from " + pay.evidence + "/hr)" : ""}`,
          );
        }
        if (done % 100 === 0) console.log(`  … ${done}/${rows.length} checked, ${found.length} found`);
      }
    }),
  );

  console.log(`\nchecked ${done} · recovered ${found.length}`);
  const bySource: Record<string, number> = {};
  for (const f of found) bySource[f.row.source] = (bySource[f.row.source] ?? 0) + 1;
  console.log("by source:", JSON.stringify(bySource));

  if (!APPLY) {
    console.log("\ndry run — nothing written. re-run with --apply to persist.");
    return;
  }
  if (found.length === 0) return;

  // One statement, not one round trip per job: jsonb_to_recordset keeps this a
  // single write no matter how many rows came back. Passing a JS array here
  // would be spread into a tuple by the driver and fail to cast.
  const payload = JSON.stringify(
    found.map((f) => ({
      slug: f.row.slug,
      min: f.pay.min,
      max: f.pay.max,
      basis: f.pay.basis,
      evidence: f.pay.evidence,
    })),
  );

  const res = await sql`
    with incoming as (
      select * from jsonb_to_recordset(${payload}::jsonb)
        as x(slug text, min int, max int, basis text, evidence text)
    )
    update job_postings j
       set salary_min = i.min,
           salary_max = i.max,
           -- Keep provenance on the row: a number we scraped is not the same
           -- claim as a number the employer's feed handed us.
           content = coalesce(j.content, '{}'::jsonb) || jsonb_build_object(
             'salary_recovered', jsonb_build_object(
               'basis', i.basis, 'evidence', i.evidence, 'at', now()::text)),
           updated_at = now()
      from incoming i
     where j.slug = i.slug
       and j.salary_max is null
    returning j.slug
  `;
  console.log(`\nupdated ${(res as unknown[]).length} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
