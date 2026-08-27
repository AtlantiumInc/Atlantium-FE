/**
 * salary-parse.ts — read a pay range out of an ATS page or payload.
 *
 * Shared by the Workday sync (which prices new rows as they land) and
 * scripts/backfill-salaries.ts (which repairs rows that landed unpriced).
 * They must agree: a job re-synced later should not change price because two
 * copies of this regex drifted.
 */

export const HOURS_PER_YEAR = 2080;

// Bounds reject the other numbers on a careers page: signing bonuses, 401k
// match percentages, revenue figures, tuition caps.
const ANNUAL_MIN = 15_000;
const ANNUAL_MAX = 800_000;
const HOURLY_MIN = 7.25; // federal floor — under this it is not a wage
const HOURLY_MAX = 400;

export type Pay = { min: number; max: number; basis: "annual" | "hourly"; evidence: string };

/** Strip markup to a single line of readable text. */
export function toText(html: string): string {
  let t = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;|&#x2013;|&mdash;|&#8212;/g, "-")
    .replace(/&[a-z#0-9]+;/gi, " ");
  return t.replace(/\s+/g, " ");
}

/** "$109,000.00" | "$58,000" | "$120K" | "$28.30" -> number */
function money(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  const k = /^([0-9.]+)[kK]$/.exec(s);
  if (k) return Math.round(Number(k[1]) * 1000);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONEY_TOKEN = String.raw`\$\s?[0-9][0-9,]*(?:\.[0-9]{1,2})?\s?[kK]?`;
const RANGE_RE = new RegExp(`(${MONEY_TOKEN})\\s*(?:-|–|—|to|and)\\s*(${MONEY_TOKEN})`, "g");

/**
 * Pull a pay range out of free text.
 *
 * Requires a RANGE rather than accepting a lone figure: a single dollar amount
 * on a careers page is more often a bonus, a benefit cap, or a tuition figure
 * than a salary, and a wrong number on the board is worse than a missing one.
 */
export function extractPay(text: string): Pay | null {
  for (const m of text.matchAll(RANGE_RE)) {
    const lo = money(m[1]);
    const hi = money(m[2]);
    if (lo == null || hi == null || hi < lo) continue;

    // Most ATSes name the unit within a few words either side ("per hour",
    // "annually", "/yr").
    const at = m.index ?? 0;
    const around = text.slice(Math.max(0, at - 120), at + m[0].length + 120).toLowerCase();
    const saysHourly = /(per hour|hourly|\/\s?hr|an hour|hour\b)/.test(around);
    const saysAnnual = /(per year|annually|annual|\/\s?yr|a year|salary)/.test(around);

    // Magnitude is the tiebreak when the page says neither: nobody earns
    // $28/yr and nobody earns $109,000/hour.
    const looksHourly = lo < 1000 && hi < 1000;

    if (saysHourly || (looksHourly && !saysAnnual)) {
      if (lo < HOURLY_MIN || hi > HOURLY_MAX) continue;
      return {
        min: Math.round(lo * HOURS_PER_YEAR),
        max: Math.round(hi * HOURS_PER_YEAR),
        basis: "hourly",
        evidence: m[0].trim(),
      };
    }

    if (lo < ANNUAL_MIN || hi > ANNUAL_MAX) continue;
    return { min: Math.round(lo), max: Math.round(hi), basis: "annual", evidence: m[0].trim() };
  }
  return null;
}

/**
 * Rewrite a Workday apply URL into its CXS detail endpoint.
 *
 * The rendered Workday page is a JS shell with no text in it, so scraping the
 * apply URL yields nothing. The JSON behind it carries the full posting,
 * pay included.
 */
export function cxsUrl(applyUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(applyUrl);
  } catch {
    return null;
  }
  if (!/myworkdayjobs\.com$/i.test(u.hostname)) return null;
  const tenant = u.hostname.split(".")[0];
  const parts = u.pathname.split("/").filter(Boolean); // [en-US, Site, job, ...rest]
  const jobIdx = parts.indexOf("job");
  if (jobIdx < 1) return null;
  const site = parts[jobIdx - 1];
  return `https://${u.hostname}/wday/cxs/${tenant}/${site}/${parts.slice(jobIdx).join("/")}`;
}

/** Fetch a Workday posting's JSON and read the pay out of it. Null on any failure. */
export async function payFromWorkday(applyUrl: string, ua: string): Promise<Pay | null> {
  const cxs = cxsUrl(applyUrl);
  if (!cxs) return null;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 12_000);
  try {
    const res = await fetch(cxs, {
      headers: { Accept: "application/json", "User-Agent": ua },
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    // Pay usually sits inside the description HTML rather than a typed field,
    // so read the whole payload as text.
    return extractPay(toText(await res.text()));
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}
