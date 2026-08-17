/**
 * salary-estimates.ts — comparable-pay estimates for postings that publish
 * no salary, computed ONLY from this board's own employer-published ranges.
 *
 * Method: bucket every salaried, visible job by (field, seniority) — field
 * via the same title regexes the board's filter uses — and take the median
 * min/max per cell. A salary-less job in a cell with >= MIN_COMPS comparables
 * gets content.salary_est = {min, max, n, method, at}. No model guesses a
 * number anywhere: the medians are arithmetic over real postings, and the
 * UI renders them visibly as estimates with the sample size attached.
 *
 * Estimates never touch the salary_min/max columns, so the salary-floor
 * filter's contract ("published range reaches your floor") stays intact.
 * Jobs that later gain a real salary get their estimate removed.
 */
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";
import type { Env } from "../env";

const MIN_COMPS = 8;

// Priority-ordered: a title matching several buckets files under the first.
const FIELD_REGEXES: Array<[string, string]> = [
  ["security", "(cyber|security engineer|security analyst|security architect|infosec|information security|application security|appsec|penetration test|pentest|threat (intel|hunt|analyst)|incident response|soc analyst|vulnerabilit|red team|blue team|detection engineer|devsecops|cloud security|network security|malware|security operations|grc |ciso)"],
  ["software", "(software (engineer|developer|architect)|frontend|front.end|backend|back.end|full.stack|mobile (engineer|developer)|ios (engineer|developer)|android|web developer|platform engineer|(\\.net|java|python|golang|ruby|c\\+\\+) (engineer|developer))"],
  ["data_ai", "(data (engineer|scientist|analyst|architect|governance)|machine learning|ml engineer|\\yai engineer|analytics engineer|business intelligence)"],
  ["cloud_devops", "(devops|\\ysre\\y|site reliability|cloud (engineer|architect)|infrastructure engineer|systems engineer|network engineer|solutions architect)"],
  ["product_design", "(product (manager|owner|designer)|\\yux\\y|ui designer|user experience)"],
  ["sales_marketing", "(sales|account (executive|manager)|marketing|growth|business development|customer success|partnerships)"],
];

export type SalaryEstimatesResult = { cells: number; estimated: number; cleared: number };

export async function computeSalaryEstimates(env: Env): Promise<SalaryEstimatesResult> {
  const db = createDb(env);
  let estimated = 0;
  let cells = 0;

  // Estimates on jobs that now carry a real salary are stale — drop them.
  const cleared = await db.execute(sql`
    update job_postings
    set content = content - 'salary_est'
    where status = 'active' and salary_max is not null and content ? 'salary_est'
    returning id`);

  const today = new Date().toISOString().slice(0, 10);
  for (const [field, re] of FIELD_REGEXES) {
    // Field priority: a job belongs to this cell only if it matches no
    // earlier field's regex.
    const earlier = FIELD_REGEXES.slice(0, FIELD_REGEXES.findIndex(([f]) => f === field)).map(([, r]) => r);
    const notEarlier = earlier.length
      ? sql.join(earlier.map((r) => sql` and title !~* ${r}`), sql``)
      : sql``;

    const res = await db.execute(sql`
      with comps as (
        select seniority,
               count(*)::int as n,
               percentile_cont(0.5) within group (order by salary_min)::int as med_min,
               percentile_cont(0.5) within group (order by salary_max)::int as med_max
        from job_postings
        where status = 'active' and content->>'non_tech' is null
          and salary_max is not null and seniority is not null
          and title ~* ${re} ${notEarlier}
        group by seniority
        having count(*) >= ${MIN_COMPS}
      )
      update job_postings j
      set content = j.content || jsonb_build_object('salary_est', jsonb_build_object(
            'min', c.med_min, 'max', c.med_max, 'n', c.n,
            'method', ${"median of field+seniority comps"}::text, 'at', ${today}::text)),
          updated_at = now()
      from comps c
      where j.status = 'active' and j.content->>'non_tech' is null
        and j.salary_max is null and j.seniority = c.seniority
        and j.title ~* ${re} ${notEarlier}
      returning j.id`);
    estimated += res.rows?.length ?? (res as unknown as unknown[]).length ?? 0;
    cells++;
  }
  return { cells, estimated, cleared: cleared.rows?.length ?? (cleared as unknown as unknown[]).length ?? 0 };
}
