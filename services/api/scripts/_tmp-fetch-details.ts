import { neon } from "@neondatabase/serverless";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const line = (await readFile(".dev.vars.main.bak","utf8")).split(/\r?\n/).find(l=>l.startsWith("DATABASE_URL="))!;
const sql = neon(line.slice(line.indexOf("=")+1).trim().replace(/^["']|["']$/g,""));
const OUT = "/private/tmp/claude-502/-Users-user-Documents/58dbd98f-0a87-4d46-8274-c047bf361f14/scratchpad/wd-details";
await mkdir(OUT, { recursive: true });
const cfgs = await sql`
  select name, attributes->'workday' as wd from directory_entries
  where kind='company' and status='active' and attributes ? 'workday'` as any[];
const cfgByName = new Map(cfgs.map((r) => [r.name, r.wd]));
const jobs = await sql`
  select id, company, apply_url, title from job_postings
  where source='workday' and status='active' and salary_max is null` as any[];
console.log(`jobs needing detail: ${jobs.length}`);
const UA = "Mozilla/5.0 AtlantiumBot/0.1";
const strip = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&#\d+;|&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
let done = 0, ok = 0;
let i = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (i < jobs.length) {
    const j = jobs[i++];
    const cfg = cfgByName.get(j.company);
    if (!cfg) { done++; continue; }
    const path = j.apply_url.replace(cfg.base, "");
    const url = cfg.cxs.replace(/\/jobs$/, "") + path;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
      if (!r.ok) { done++; continue; }
      const d = (await r.json()) as any;
      const info = d?.jobPostingInfo ?? {};
      const text = strip(String(info.jobDescription ?? "")).slice(0, 6000);
      if (text.length > 100) {
        await writeFile(`${OUT}/${j.id}.json`, JSON.stringify({ id: j.id, title: j.title, company: j.company, text }));
        ok++;
      }
    } catch { /* skip */ }
    if (++done % 300 === 0) console.log(`…${done}/${jobs.length} (${ok} texts)`);
  }
}));
console.log(`fetched descriptions: ${ok}/${jobs.length}`);
