/**
 * Resolve a logo for every company on the board.
 * Priority: svgl.app brand SVG (exact/normalized title match) → favicon
 * service keyed by the company's real domain (from hiring.cafe's
 * company_website, else a careers-page apply URL) → null (FE monogram).
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
const which = process.argv[2] ?? "prod";
const file = which === "prod" ? ".dev.vars.main.bak" : ".dev.vars";
const line = (await readFile(file, "utf8")).split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))!;
const sql = neon(line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""));

const AGGREGATORS = /greenhouse|lever\.co|myworkdayjobs|workday|usajobs|ashbyhq|workable|icims|smartrecruiters|jobvite|bamboohr|hiring\.cafe|indeed|linkedin|adp\.com|oraclecloud|successfactors|taleo|paylocity|paycom|dayforce|rippling|breezy|jazzhr|recruitee|gem\.com|dover|wellfound|jobs\.gov/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(inc|llc|corp|corporation|company|technologies|technology|industries|holdings|group|co)$/g, "");

function cleanDomain(raw: string | null): string | null {
  if (!raw) return null;
  try {
    let d = raw.trim().toLowerCase();
    if (!d.includes("://")) d = "https://" + d;
    let host = new URL(d).hostname.replace(/^www\./, "");
    if (AGGREGATORS.test(host)) return null;
    // strip careers/jobs subdomains down to the registrable-ish root
    const parts = host.split(".");
    if (parts.length > 2 && /^(careers?|jobs?|apply|talent|work|recruiting|boards)$/.test(parts[0])) host = parts.slice(1).join(".");
    return host;
  } catch { return null; }
}

// 1) companies + best-known website + a fallback apply host
const rows = await sql`
  select company,
    mode() within group (order by content->>'company_website') as site,
    mode() within group (order by apply_url) as apply
  from job_postings
  where status='active' and content->>'non_tech' is null
  group by company` as any[];
console.log("companies:", rows.length);

// 2) svgl catalog
const svglIndex = new Map<string, string>();
try {
  const res = await fetch("https://api.svgl.app", { signal: AbortSignal.timeout(15000) });
  const list = (await res.json()) as Array<{ title: string; route: string | { light: string; dark: string } }>;
  for (const it of list) {
    const url = typeof it.route === "string" ? it.route : it.route.light;
    svglIndex.set(norm(it.title), url);
  }
  console.log("svgl catalog:", svglIndex.size);
} catch (e) { console.log("svgl unavailable:", String(e).slice(0, 80)); }

let svgl = 0, favicon = 0, none = 0;
for (const r of rows) {
  const n = norm(r.company);
  const svglUrl = svglIndex.get(n) ?? null;
  const domain = cleanDomain(r.site) ?? cleanDomain(r.apply);
  let logo: string | null = null;
  let source = "none";
  if (svglUrl) { logo = svglUrl; source = "svgl"; svgl++; }
  else if (domain) { logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`; source = "favicon"; favicon++; }
  else none++;
  await sql`
    insert into company_logos (company, logo_url, domain, source, updated_at)
    values (${r.company}, ${logo}, ${domain}, ${source}, now())
    on conflict (company) do update set logo_url = excluded.logo_url, domain = excluded.domain, source = excluded.source, updated_at = now()
    where company_logos.source <> 'manual'`;
}
console.log(`resolved — svgl: ${svgl}, favicon: ${favicon}, none (monogram): ${none}`);
