/**
 * market-snapshot.ts — freeze one day of the Atlanta tech market.
 *
 * Everything else in this service answers "what is true right now". When a job
 * expires or an employer edits a salary, the previous value is simply gone.
 * This writes the day's aggregates to market_snapshots so trends become
 * answerable later: median pay over time, AI's share of postings, remote drift,
 * hiring velocity. None of it can be reconstructed after the fact, which is the
 * entire reason the job runs unconditionally every day.
 *
 * Aggregates only — about 1KB per day. Job rows are never copied here; that
 * would put real weight on the Neon data-transfer budget.
 */
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";
import type { Env } from "../env";

export type SnapshotResult = { day: string; total_active: number; written: boolean };

/** Same field buckets the board filter uses, so the history matches the UI. */
const FIELD_REGEXES: Array<[string, string]> = [
  ["security", "(cyber|security engineer|security analyst|security architect|infosec|information security|application security|appsec|penetration test|pentest|threat (intel|hunt|analyst)|incident response|soc analyst|vulnerabilit|red team|blue team|detection engineer|devsecops|cloud security|network security|malware|security operations|grc |ciso)"],
  ["software", "(software (engineer|developer|architect)|frontend|front.end|backend|back.end|full.stack|mobile (engineer|developer)|ios (engineer|developer)|android|web developer|platform engineer|(\\.net|java|python|golang|ruby|c\\+\\+) (engineer|developer))"],
  ["data_ai", "(data (engineer|scientist|analyst|architect|governance)|machine learning|ml engineer|\\yai engineer|analytics engineer|business intelligence)"],
  ["cloud_devops", "(devops|\\ysre\\y|site reliability|cloud (engineer|architect)|infrastructure engineer|systems engineer|network engineer|solutions architect)"],
  ["product_design", "(product (manager|owner|designer)|\\yux\\y|ui designer|user experience)"],
  ["sales_marketing", "(sales|account (executive|manager)|marketing|growth|business development|customer success|partnerships)"],
];

export async function writeMarketSnapshot(env: Env): Promise<SnapshotResult> {
  const db = createDb(env);
  const visible = sql`status = 'active' and content->>'non_tech' is null and (visible_at is null or visible_at <= now())`;

  const [core, bands, seniority, tech, companies, fields] = await Promise.all([
    db.execute(sql`
      select
        to_char(now() at time zone 'America/New_York', 'YYYY-MM-DD') as day,
        count(*)::int as total_active,
        count(*) filter (where created_at >= date_trunc('day', now() at time zone 'America/New_York'))::int as new_today,
        count(*) filter (where created_at >= now() - interval '7 days')::int as new_7d,
        count(*) filter (where workplace_type = 'Remote')::int as remote_count,
        count(*) filter (where workplace_type = 'Hybrid')::int as hybrid_count,
        count(*) filter (where workplace_type = 'Onsite')::int as onsite_count,
        count(*) filter (where review->>'degree_required' in ('not_required','equivalent_accepted'))::int as no_degree_count,
        count(*) filter (where title ~* '\\y(ai|machine learning|ml engineer|genai|llm)\\y')::int as ai_role_count,
        count(*) filter (where salary_max is not null)::int as priced_count,
        count(*) filter (where salary_max >= 200000)::int as over_200k_count,
        percentile_cont(0.5) within group (order by salary_min) filter (where salary_min is not null)::int as median_min,
        percentile_cont(0.5) within group (order by salary_max) filter (where salary_max is not null)::int as median_max,
        percentile_cont(0.25) within group (order by salary_max) filter (where salary_max is not null)::int as p25_max,
        percentile_cont(0.75) within group (order by salary_max) filter (where salary_max is not null)::int as p75_max
      from job_postings where ${visible}`),
    db.execute(sql`
      select coalesce(jsonb_object_agg(bucket::text, n), '{}'::jsonb) as bands from (
        select width_bucket(salary_max, 40000, 300000, 13) as bucket, count(*)::int as n
        from job_postings where ${visible} and salary_max is not null
        group by 1) t`),
    db.execute(sql`
      select coalesce(jsonb_object_agg(seniority, n), '{}'::jsonb) as mix from (
        select seniority, count(*)::int as n from job_postings
        where ${visible} and seniority is not null group by 1) t`),
    db.execute(sql`
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'n', n) order by n desc), '[]'::jsonb) as top from (
        select t.tool as name, count(*)::int as n
        from job_postings j, jsonb_array_elements_text(j.content->'tech_stack') t(tool)
        where ${visible} group by 1 order by n desc limit 20) s`),
    db.execute(sql`
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'n', n) order by n desc), '[]'::jsonb) as top from (
        select company as name, count(*)::int as n from job_postings
        where ${visible} group by 1 order by n desc limit 20) s`),
    db.execute(sql`
      select coalesce(jsonb_object_agg(f, n), '{}'::jsonb) as mix from (
        ${sql.join(
          FIELD_REGEXES.map(([field, re], i) => {
            const earlier = FIELD_REGEXES.slice(0, i).map(([, r]) => r);
            const notEarlier = earlier.length
              ? sql.join(earlier.map((r) => sql` and title !~* ${r}`), sql``)
              : sql``;
            return sql`select ${field}::text as f, count(*)::int as n from job_postings where ${visible} and title ~* ${re} ${notEarlier}`;
          }),
          sql` union all `,
        )}
      ) t`),
  ]);

  const one = (r: unknown) => {
    const raw = r as unknown as { rows?: Array<Record<string, unknown>> } & Array<Record<string, unknown>>;
    return (raw.rows ?? raw)[0] ?? {};
  };
  // Bind JSON as text: passing a JS object/array lets the driver expand it into
  // a Postgres record, which cannot cast to jsonb.
  const asJson = (v: unknown, fallback: string) => (v == null ? fallback : JSON.stringify(v));
  const c = one(core) as Record<string, number | string | null>;
  const day = String(c.day);

  // Expirations are counted from the jobs table's own updated_at, since the
  // sync flips status there.
  const expiredRes = await db.execute(sql`
    select count(*)::int as n from job_postings
    where status = 'expired' and updated_at >= date_trunc('day', now() at time zone 'America/New_York')`);
  const expired = Number((one(expiredRes) as Record<string, unknown>).n ?? 0);

  // Re-running the same day overwrites rather than duplicating: the last write
  // of a day is the day's record.
  await db.execute(sql`
    insert into market_snapshots (
      day, total_active, new_today, new_7d, expired_today,
      remote_count, hybrid_count, onsite_count, no_degree_count, ai_role_count,
      priced_count, median_min, median_max, p25_max, p75_max, over_200k_count,
      salary_bands, seniority_mix, top_tech, top_companies, field_mix
    ) values (
      ${day}::date, ${c.total_active}, ${c.new_today}, ${c.new_7d}, ${expired},
      ${c.remote_count}, ${c.hybrid_count}, ${c.onsite_count}, ${c.no_degree_count}, ${c.ai_role_count},
      ${c.priced_count}, ${c.median_min}, ${c.median_max}, ${c.p25_max}, ${c.p75_max}, ${c.over_200k_count},
      ${asJson((one(bands) as Record<string, unknown>).bands, "{}")}::jsonb,
      ${asJson((one(seniority) as Record<string, unknown>).mix, "{}")}::jsonb,
      ${asJson((one(tech) as Record<string, unknown>).top, "[]")}::jsonb,
      ${asJson((one(companies) as Record<string, unknown>).top, "[]")}::jsonb,
      ${asJson((one(fields) as Record<string, unknown>).mix, "{}")}::jsonb
    )
    on conflict (day) do update set
      total_active = excluded.total_active, new_today = excluded.new_today,
      new_7d = excluded.new_7d, expired_today = excluded.expired_today,
      remote_count = excluded.remote_count, hybrid_count = excluded.hybrid_count,
      onsite_count = excluded.onsite_count, no_degree_count = excluded.no_degree_count,
      ai_role_count = excluded.ai_role_count, priced_count = excluded.priced_count,
      median_min = excluded.median_min, median_max = excluded.median_max,
      p25_max = excluded.p25_max, p75_max = excluded.p75_max,
      over_200k_count = excluded.over_200k_count, salary_bands = excluded.salary_bands,
      seniority_mix = excluded.seniority_mix, top_tech = excluded.top_tech,
      top_companies = excluded.top_companies, field_mix = excluded.field_mix`);

  return { day, total_active: Number(c.total_active), written: true };
}
