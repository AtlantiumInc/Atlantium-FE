/**
 * visible-drip.ts — rolling release of synced jobs.
 *
 * Syncs land in 4-hour batches; publishing them all at once makes the board
 * lurch. Instead every new row gets a visible_at scattered across the hours
 * after ingest, deferred into business hours (Mon–Fri 08:00–20:00 ET) so the
 * feed reads like a workday market: continuous drip while offices are open,
 * quiet nights and weekends (the frontend explains the quiet with an
 * after-hours notice). Public queries filter visible_at <= now().
 */
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";
import type { Env } from "../env";

const DRIP_WINDOW_MS = 4 * 3600_000;
const ET = "America/New_York";
const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;

function etParts(d: Date): { dow: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", hour: "numeric", hour12: false });
  const parts = fmt.formatToParts(d);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  return { dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd), hour };
}

/** Roll a candidate time forward until it lands inside business hours ET. */
export function deferToBusinessHours(t: Date, jitterMs: number): Date {
  let d = new Date(t);
  for (let guard = 0; guard < 10; guard++) {
    const { dow, hour } = etParts(d);
    if (dow >= 1 && dow <= 5 && hour >= OPEN_HOUR && hour < CLOSE_HOUR) return d;
    if (hour >= CLOSE_HOUR || dow === 0 || dow === 6) {
      // jump to next day 08:00 ET (approximate: advance to next day noon UTC-ish then re-check)
      d = new Date(d.getTime() + (24 - hour + OPEN_HOUR) * 3600_000);
    } else {
      // before open: move to open + morning jitter
      d = new Date(d.getTime() + (OPEN_HOUR - hour) * 3600_000 + (jitterMs % (2 * 3600_000)));
    }
  }
  return d;
}

export async function scheduleVisibility(env: Env): Promise<{ scheduled: number }> {
  const db = createDb(env);
  const rows = await db.execute(sql`
    select id from job_postings where visible_at is null limit 2000`);
  const raw = rows as unknown as { rows?: Array<{ id: string }> } & Array<{ id: string }>;
  const ids = (raw.rows ?? raw).map((r) => r.id);
  let scheduled = 0;
  for (const id of ids) {
    // Deterministic pseudo-random offset from the id, so re-runs are stable.
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const offset = h % DRIP_WINDOW_MS;
    const when = deferToBusinessHours(new Date(Date.now() + offset), h);
    await db.execute(sql`
      update job_postings set visible_at = ${when.toISOString()}::timestamptz
      where id = ${id} and visible_at is null`);
    scheduled++;
  }
  return { scheduled };
}

const LOGO_AGGREGATORS = /greenhouse|lever\.co|myworkdayjobs|workday|usajobs|ashbyhq|workable|icims|smartrecruiters|jobvite|bamboohr|hiring\.cafe|indeed|linkedin|adp\.com|oraclecloud|successfactors|taleo|paylocity|paycom|dayforce|rippling/i;

function cleanLogoDomain(raw: string | null): string | null {
  if (!raw) return null;
  try {
    let d = raw.trim().toLowerCase();
    if (!d.includes("://")) d = "https://" + d;
    let host = new URL(d).hostname.replace(/^www\./, "");
    if (LOGO_AGGREGATORS.test(host)) return null;
    const parts = host.split(".");
    if (parts.length > 2 && /^(careers?|jobs?|apply|talent|work|recruiting|boards)$/.test(parts[0])) host = parts.slice(1).join(".");
    return host;
  } catch { return null; }
}

/** Newly seen companies get a favicon-service logo keyed by their website. */
export async function refreshCompanyLogos(env: Env): Promise<{ added: number }> {
  const db = createDb(env);
  const res = await db.execute(sql`
    select j.company,
      mode() within group (order by j.content->>'company_website') as site,
      mode() within group (order by j.apply_url) as apply
    from job_postings j
    left join company_logos cl on cl.company = j.company
    where j.status = 'active' and cl.company is null
    group by j.company limit 500`);
  const raw = res as unknown as { rows?: Array<Record<string, string | null>> } & Array<Record<string, string | null>>;
  const rows = raw.rows ?? raw;
  let added = 0;
  for (const r of rows) {
    const domain = cleanLogoDomain(r.site ?? null) ?? cleanLogoDomain(r.apply ?? null);
    const logo = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
    await db.execute(sql`
      insert into company_logos (company, logo_url, domain, source)
      values (${r.company}, ${logo}, ${domain}, ${domain ? "favicon" : "none"})
      on conflict (company) do nothing`);
    added++;
  }
  return { added };
}
