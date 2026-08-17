/**
 * Seed the major Atlanta(-relevant) security employers the directory was
 * missing — found during the 2026-08-16 cyber audit. Direct ATS tracking
 * picks these up automatically once they're entries.
 *
 *   npx tsx scripts/seed-security-employers.ts --prod|--dev
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ENV_FILES: Record<string, string> = { prod: ".dev.vars.main.bak", dev: ".dev.vars" };
const target = process.argv.find((a) => a === "--prod" || a === "--dev")?.slice(2);
if (!target) throw new Error("Pass --prod or --dev");
const contents = await readFile(join(process.cwd(), ENV_FILES[target]), "utf8");
const line = contents.split(/\r?\n/).find((l) => l.trimStart().startsWith("DATABASE_URL="))!;
const sql = neon(line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""));

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const norm = (s: string) => s.toLowerCase().replace(/[.,]/g, " ").replace(/\b(inc|llc|ltd|corp|corporation|co|company|group|holdings|networks|enterprises|air lines)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

const COMPANIES = [
  { name: "Secureworks", website: "https://www.secureworks.com", tags: ["cybersecurity"], summary: "Atlanta-headquartered cybersecurity company — managed detection and response, threat intelligence." },
  { name: "Bastille Networks", website: "https://www.bastille.net", tags: ["cybersecurity"], summary: "Atlanta-founded wireless threat intelligence — RF security for enterprise airspace." },
  { name: "VikingCloud", website: "https://www.vikingcloud.com", tags: ["cybersecurity"], summary: "Atlanta-based cybersecurity and compliance provider — PCI, managed security, risk." },
  { name: "DefenseStorm", website: "https://www.defensestorm.com", tags: ["cybersecurity"], summary: "Atlanta cybersecurity platform built for banking — cyber risk, compliance, and fraud." },
  { name: "Delta Air Lines", website: "https://www.delta.com", tags: [], summary: "Atlanta-headquartered global airline — major technology and security organization." },
  { name: "Cox Enterprises", website: "https://www.coxenterprises.com", tags: [], summary: "Atlanta-headquartered communications, automotive and media company — large technology org." },
];

for (const co of COMPANIES) {
  const exists = await sql`
    select id from directory_entries where kind='company' and lower(name) = ${co.name.toLowerCase()} limit 1` as any[];
  if (exists.length) { console.log(`skip (exists): ${co.name}`); continue; }
  const rows = await sql`
    insert into directory_entries (kind, slug, name, summary, website, location, tags, attributes)
    values ('company', ${slugify(co.name)}, ${co.name}, ${co.summary}, ${co.website},
      'Atlanta, Georgia', ${co.tags}, ${JSON.stringify({ seeded: "security-audit-2026-08" })}::jsonb)
    on conflict (kind, slug) do nothing
    returning id` as any[];
  if (rows[0]?.id) {
    await sql`insert into directory_entry_aliases (entry_id, name_normalized, verified)
      values (${rows[0].id}, ${norm(co.name)}, false) on conflict do nothing`;
    console.log(`created: ${co.name}`);
  } else console.log(`slug-conflict skip: ${co.name}`);
}
