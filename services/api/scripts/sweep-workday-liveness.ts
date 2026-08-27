/**
 * sweep-workday-liveness.ts — expire Workday postings that are gone.
 *
 * jobs-review fetches every apply page daily, but a Workday page is a JS shell:
 * HTTP 200 and no text whether the requisition is open or deleted. The review
 * pipeline correctly refuses to expire on that ("unreachable / empty_page",
 * which never auto-expires), so ~2,900 Workday postings could never be
 * verified either way and dead ones accumulated on the board indefinitely.
 *
 * The CXS detail endpoint answers definitively — see src/lib/workday-cxs.ts.
 * This sweeps every active Workday-hosted posting through it and expires the
 * ones Workday says are gone, writing the verdict into `review` so the row
 * carries its own evidence.
 *
 * Run:
 *   DATABASE_URL=<neon> npx tsx scripts/sweep-workday-liveness.ts --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/sweep-workday-liveness.ts --apply
 */
import { neon } from "@neondatabase/serverless";
import { probeWorkday } from "../src/lib/workday-cxs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 AtlantiumBot/0.1";

/**
 * If more than this share of the board comes back dead, something is wrong
 * with us, not with the board — Workday rate-limiting us, a shape change, a
 * network fault. Mirrors the MIN_SANE_JOBS guard in jobs-sync: refuse to mass
 * expire, report, and let a human look.
 */
const MAX_EXPIRE_SHARE = 0.4;

type Row = { id: string; slug: string; company: string; apply_url: string };

const args = process.argv.slice(2);
const flag = (n: string, d: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const LIMIT = Number(flag("limit", "20000"));
const CONCURRENCY = Number(flag("concurrency", "10"));
const APPLY = args.includes("--apply");

const DB = process.env.DATABASE_URL;
if (!DB) throw new Error("DATABASE_URL is required");
const sql = neon(DB);

async function main() {
  const rows = (await sql`
    select id, slug, company, apply_url
    from job_postings
    where status = 'active'
      and apply_url ~* 'myworkdayjobs\\.com'
    order by reviewed_at asc nulls first
    limit ${LIMIT}
  `) as Row[];

  console.log(`active workday-hosted postings: ${rows.length}`);
  console.log(APPLY ? "MODE: apply\n" : "MODE: dry-run (no writes)\n");

  const dead: Row[] = [];
  let live = 0;
  const unknown: Record<string, number> = {};
  let done = 0;

  const queue = [...rows];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const row = queue.shift();
        if (!row) return;
        const probe = await probeWorkday(row.apply_url, UA);
        done++;
        if (probe.state === "gone") {
          dead.push(row);
          console.log(`  ☠️  ${String(probe.httpStatus).padEnd(4)} ${row.company.slice(0, 26).padEnd(26)} ${row.slug.slice(0, 52)}`);
        } else if (probe.state === "live") {
          live++;
        } else {
          unknown[probe.reason] = (unknown[probe.reason] ?? 0) + 1;
        }
        if (done % 250 === 0) {
          console.log(`  … ${done}/${rows.length} · live ${live} · gone ${dead.length}`);
        }
      }
    }),
  );

  const unknownTotal = Object.values(unknown).reduce((a, b) => a + b, 0);
  console.log(`\nchecked ${done} · live ${live} · gone ${dead.length} · unknown ${unknownTotal}`);
  console.log("unknown reasons:", JSON.stringify(unknown));

  const share = rows.length ? dead.length / rows.length : 0;
  console.log(`gone share: ${(share * 100).toFixed(1)}%`);
  if (share > MAX_EXPIRE_SHARE) {
    console.error(
      `\nREFUSING TO EXPIRE: ${(share * 100).toFixed(1)}% came back gone, over the ` +
        `${MAX_EXPIRE_SHARE * 100}% ceiling. That is more likely our problem than theirs. ` +
        `Investigate before re-running.`,
    );
    process.exit(2);
  }

  if (!APPLY) {
    console.log("\ndry run — nothing written. re-run with --apply to persist.");
    return;
  }
  if (dead.length === 0) return;

  // Single set-based write. Soft-expire only: detail pages keep rendering and
  // the row can come back if the requisition reopens, exactly as the scraper's
  // own expiry behaves.
  const payload = JSON.stringify(dead.map((d) => ({ id: d.id })));
  const res = await sql`
    with incoming as (
      select * from jsonb_to_recordset(${payload}::jsonb) as x(id uuid)
    )
    update job_postings j
       set status = 'expired',
           reviewed_at = now(),
           review = coalesce(j.review, '{}'::jsonb) || jsonb_build_object(
             'status', 'filled_or_closed',
             'confidence', 'high',
             'notes', 'workday_cxs_gone',
             'reviewed_via', 'deterministic',
             'verified_at', now()::text),
           updated_at = now()
      from incoming i
     where j.id = i.id
       and j.status = 'active'
    returning j.slug
  `;
  console.log(`\nexpired ${(res as unknown[]).length} postings.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
