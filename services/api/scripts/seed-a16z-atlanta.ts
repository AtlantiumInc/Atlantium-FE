/**
 * One-time import: a16z portfolio jobs in Atlanta (jobs.a16z.com), harvested
 * from the board's own API responses in a browser session.
 *
 * Jobs land with source='a16z' — the nightly hiring.cafe sync only expires its
 * OWN source, so these survive it (mig 0026). Their apply links go through the
 * same AI review cycle as everything else, which is what retires them when
 * they close. Companies land in the directory regardless of posting count:
 * being an a16z portfolio company hiring here IS the signal, tagged so the
 * recruitment angle can find them.
 *
 *   npx tsx scripts/seed-a16z-atlanta.ts --dev|--prod [path/to/a16z-atlanta.json]
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ENV_FILES: Record<string, string> = { prod: ".dev.vars.main.bak", dev: ".dev.vars" };
const target = process.argv.find((a) => a === "--prod" || a === "--dev")?.slice(2);
const dataPath = process.argv.find((a) => a.endsWith(".json"))
  ?? "/private/tmp/claude-502/-Users-user-Documents/58dbd98f-0a87-4d46-8274-c047bf361f14/scratchpad/a16z-atlanta.json";

async function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!target) throw new Error("Pass --prod or --dev, or set DATABASE_URL.");
  const contents = await readFile(join(process.cwd(), ENV_FILES[target]), "utf8");
  const line = contents.split(/\r?\n/).find((l) => l.trimStart().startsWith("DATABASE_URL="));
  if (!line) throw new Error(`No DATABASE_URL in ${ENV_FILES[target]}`);
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

type A16zJob = {
  id: string; title: string; company: string; cslug: string; domain: string | null;
  apply: string; loc: string; remote: boolean; hybrid: boolean;
  smin: number | null; smax: number | null; sen: string | null; fn: string | null;
  skills: string[]; ts: string; staff: number | null; stage: string | null;
  markets: string[]; logo: string | null;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const normalizeCompanyName = (name: string) => name
  .toLowerCase()
  .replace(/[.,]/g, " ")
  .replace(/\b(inc|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|plc|group|holdings|technologies|technology|solutions|services|systems|us|usa)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

/** The board reports hourly rates for a few roles; the board column is annual. */
const annualize = (v: number | null) => (v == null ? null : v < 1000 ? Math.round(v * 2080) : v);

function mapSeniority(sen: string | null): string | null {
  if (!sen) return null;
  const s = sen.toLowerCase();
  if (s.includes("intern")) return "Internship";
  if (s.includes("senior") || s.includes("staff") || s.includes("principal")) return "Senior";
  if (s.includes("lead") || s.includes("director") || s.includes("vp") || s.includes("head")) return "Leadership";
  if (s.includes("entry") || s.includes("junior")) return "Entry Level";
  return "Mid Level";
}

async function main() {
  const sql = neon(await databaseUrl());
  console.log(`→ ${target ?? "DATABASE_URL"}`);
  const jobs: A16zJob[] = JSON.parse(await readFile(dataPath, "utf8"));
  console.log(`importing ${jobs.length} jobs across ${new Set(jobs.map((j) => j.cslug)).size} companies…`);

  const stats = { jobsCreated: 0, jobsUpdated: 0, companiesCreated: 0, companiesUpdated: 0 };

  // ── Jobs ──────────────────────────────────────────────────────────────────
  for (const j of jobs) {
    if (!j.apply || !j.title) continue;
    const slug = slugify(`${j.company}-${j.title}-${String(j.id).slice(-6)}`);
    const workplace = j.remote ? "Remote" : j.hybrid ? "Hybrid" : "Onsite";
    const rows = await sql`
      INSERT INTO job_postings (slug, title, company, location, workplace_type, seniority,
        salary_min, salary_max, apply_url, status, source, posted_at, content)
      VALUES (${slug}, ${j.title}, ${j.company}, ${j.loc || "Atlanta, Georgia, United States"},
        ${workplace}, ${mapSeniority(j.sen)}, ${annualize(j.smin)}, ${annualize(j.smax)},
        ${j.apply}, 'active', 'a16z', ${j.ts ?? new Date().toISOString()},
        ${JSON.stringify({ tech_stack: j.skills ?? [], job_function: j.fn, a16z_portfolio: true, markets: j.markets ?? [] })}::jsonb)
      ON CONFLICT (apply_url) DO UPDATE SET
        title = EXCLUDED.title,
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        status = 'active',
        source = 'a16z',
        updated_at = now()
      RETURNING (xmax = 0) AS inserted` as any[];
    if (rows[0]?.inserted) stats.jobsCreated++; else stats.jobsUpdated++;
  }

  // ── Companies: every portfolio company, regardless of posting count ───────
  await sql`
    INSERT INTO directory_sources (id, display_name, base_url)
    VALUES ('a16z_jobs', 'a16z portfolio board', 'https://jobs.a16z.com')
    ON CONFLICT (id) DO NOTHING`;

  const byCompany = new Map<string, A16zJob[]>();
  for (const j of jobs) {
    const list = byCompany.get(j.cslug) ?? [];
    list.push(j);
    byCompany.set(j.cslug, list);
  }

  for (const [cslug, companyJobs] of byCompany) {
    const j = companyJobs[0];
    const normalized = normalizeCompanyName(j.company);
    const summary = `a16z portfolio company${j.markets?.length ? ` — ${j.markets.join(", ")}` : ""}. ${companyJobs.length} open Atlanta ${companyJobs.length === 1 ? "role" : "roles"}.`;
    const attributes = {
      a16z_portfolio: true,
      ...(j.logo ? { logo_url: j.logo } : {}),
      ...(j.staff ? { staff_count: j.staff } : {}),
      ...(j.stage ? { company_stage: j.stage } : {}),
      ...(j.markets?.length ? { markets: j.markets } : {}),
    };

    // Reuse an existing company entry when the alias table already knows this
    // name — a16z data enriches it rather than minting a duplicate.
    const existing = await sql`
      SELECT al.entry_id FROM directory_entry_aliases al
      JOIN directory_entries e ON e.id = al.entry_id AND e.kind = 'company'
      WHERE al.name_normalized = ${normalized}` as any[];

    let entryId: string;
    if (existing.length >= 1) {
      entryId = existing[0].entry_id;
      await sql`
        UPDATE directory_entries SET
          website = COALESCE(website, ${j.domain ? `https://${j.domain}` : null}),
          attributes = attributes || ${JSON.stringify(attributes)}::jsonb,
          status = 'active', updated_at = now()
        WHERE id = ${entryId}`;
      stats.companiesUpdated++;
    } else {
      const rows = await sql`
        INSERT INTO directory_entries (kind, slug, name, summary, website, location, tags, attributes)
        VALUES ('company', ${slugify(j.company)}, ${j.company}, ${summary},
          ${j.domain ? `https://${j.domain}` : null}, 'Atlanta, Georgia',
          ${["hiring", "a16z-portfolio"]}, ${JSON.stringify(attributes)}::jsonb)
        ON CONFLICT (kind, slug) DO UPDATE SET
          attributes = directory_entries.attributes || EXCLUDED.attributes,
          status = 'active', updated_at = now()
        RETURNING id` as any[];
      entryId = rows[0].id;
      await sql`
        INSERT INTO directory_entry_aliases (entry_id, name_normalized, verified)
        VALUES (${entryId}, ${normalized}, false) ON CONFLICT DO NOTHING`;
      stats.companiesCreated++;
    }

    await sql`
      INSERT INTO company_details (entry_id, is_hiring) VALUES (${entryId}, true)
      ON CONFLICT (entry_id) DO UPDATE SET is_hiring = true`;
    await sql`
      INSERT INTO directory_entry_sources (entry_id, source, external_id, source_url, source_data, last_seen_at)
      VALUES (${entryId}, 'a16z_jobs', ${cslug}, ${"https://jobs.a16z.com/jobs?locations=Atlanta"},
        ${JSON.stringify({ open_atlanta_roles: companyJobs.length })}::jsonb, now())
      ON CONFLICT (source, external_id) DO UPDATE SET
        last_seen_at = now(), source_data = EXCLUDED.source_data`;
  }

  console.log(JSON.stringify(stats));
}

main().catch((e) => { console.error(e); process.exit(1); });
