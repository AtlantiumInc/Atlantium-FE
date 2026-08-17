/**
 * One-time Workday endpoint discovery for directory companies.
 *
 * A Workday board has three unknowns — tenant, wdN shard, site name — but
 * fetching the bare tenant host (https://{tenant}.myworkdayjobs.com) redirects
 * to the canonical /{lang}/{site} URL, which carries all three. We then
 * validate by POSTing the CXS jobs API and store the working endpoint in the
 * directory entry's attributes.workday for the nightly sync to use.
 *
 *   npx tsx scripts/discover-workday.ts --prod [path/to/ats-audit.json]
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const target = process.argv.includes("--prod") ? ".dev.vars.main.bak" : ".dev.vars";
const line = (await readFile(target, "utf8")).split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))!;
const sql = neon(line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""));
const auditPath = process.argv.find((a) => a.endsWith(".json"))
  ?? "/private/tmp/claude-502/-Users-user-Documents/58dbd98f-0a87-4d46-8274-c047bf361f14/scratchpad/ats-audit.json";
const audit = JSON.parse(await readFile(auditPath, "utf8")) as Array<{ name: string; kind: string; slug: string }>;
const tenants = audit.filter((r) => r.kind === "workday");
console.log(`workday tenants to discover: ${tenants.length}`);
const sites = await sql`
  select name, website from directory_entries
  where kind='company' and status='active' and website is not null` as Array<{ name: string; website: string }>;
const webByName = new Map(sites.map((r) => [r.name.toLowerCase(), r.website]));

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 AtlantiumBot/0.1";
// The workday HTML hosts sit behind a WAF (406 for non-browsers) and bare
// tenant hosts don't resolve — but the CXS JSON API answers freely. The
// site name we need was on the company's own careers page all along, so
// discovery re-crawls the company site and captures the FULL workday URL.
const SITE_GUESSES = ["External", "Careers", "External_Careers", "external", "careers", "EXT", "Global", "Ext"];

async function get(url: string, ms = 8000): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(ms), redirect: "follow" });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

async function validate(host: string, tenant: string, site: string, lang: string) {
  const cxs = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  try {
    const probe = await fetch(cxs, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
      signal: AbortSignal.timeout(9000),
    });
    if (!probe.ok) return null;
    const j = (await probe.json()) as { total?: number };
    if (j?.total == null) return null;
    return { tenant, base: `https://${host}/${lang}/${site}`, cxs, board_total: j.total };
  } catch { return null; }
}

const WD_URL_RE = /https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com(\/[^\s"'<>\\)]*)?/gi;

async function discoverFromSite(website: string) {
  const origin = (() => { try { return new URL(website.startsWith("http") ? website : `https://${website}`).origin; } catch { return null; } })();
  if (!origin) return null;
  const pages = [origin, `${origin}/careers`, `${origin}/jobs`, `${origin}/careers/`, `${origin}/about/careers`];
  for (const page of pages) {
    const html = await get(page);
    if (!html) continue;
    const seen = new Set<string>();
    for (const m of html.matchAll(WD_URL_RE)) {
      const [, tenant, wd] = m;
      const host = `${tenant}.${wd}.myworkdayjobs.com`;
      const path = (m[3] ?? "").split(/[?#]/)[0];
      const segs = path.split("/").filter(Boolean);
      // path shapes: /{site}, /{lang}/{site}, /{lang}/{site}/job/..., /{site}/job/...
      const candidates: Array<[string, string]> = [];
      if (segs.length >= 2 && /^[a-z]{2}-[A-Za-z]{2,3}$/.test(segs[0])) candidates.push([segs[1], segs[0]]);
      if (segs.length >= 1) candidates.push([segs[0], "en-US"]);
      for (const [site, lang] of candidates) {
        const key = `${host}|${site}`;
        if (seen.has(key) || ["job", "jobs", "login"].includes(site)) continue;
        seen.add(key);
        const hit = await validate(host, tenant, site, lang);
        if (hit) return hit;
      }
      // bare host link: try common site names
      if (segs.length === 0) {
        for (const site of SITE_GUESSES) {
          const key = `${host}|${site}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const hit = await validate(host, tenant, site, "en-US");
          if (hit) return hit;
        }
      }
    }
    if (seen.size > 0) break; // found workday links but none validated — stop crawling more pages
  }
  return null;
}

let ok = 0, fail = 0;
const found: Array<{ name: string; total: number }> = [];
const poolN = 8; let i = 0;
await Promise.all(Array.from({ length: poolN }, async () => {
  while (i < tenants.length) {
    const t = tenants[i++];
    const website = webByName.get(t.name.toLowerCase());
    if (!website) { fail++; continue; }
    const d = await discoverFromSite(website);
    if (!d) { fail++; continue; }
    await sql`
      update directory_entries
      set attributes = attributes || ${JSON.stringify({ workday: d })}::jsonb, updated_at = now()
      where kind='company' and status='active' and lower(name) = ${t.name.toLowerCase()}`;
    ok++; found.push({ name: t.name, total: d.board_total });
  }
}));
console.log(`discovered+stored: ${ok} | failed: ${fail}`);
console.log("largest boards:", JSON.stringify(found.sort((a,b)=>b.total-a.total).slice(0,10)));
