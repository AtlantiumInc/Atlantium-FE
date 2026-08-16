/**
 * Hypepotamus directory import — Southeast investors + accelerator programs.
 *
 * Both lists are Datawrapper embeds, which publish their dataset as CSV at a
 * stable URL. Investors land as kind `investor`; accelerators/incubators/
 * studios land as kind `resource` with category `accelerator`, which the
 * /directory "Programs & credits" tab already renders.
 *
 * Idempotent: entries upsert on (kind, slug); provenance upserts on
 * (source, external_id) and bumps last_seen_at, so re-running refreshes
 * rather than duplicates. Nothing here is marked verified — verification
 * stays a human act.
 *
 *   npx tsx scripts/seed-hypepotamus.ts --dev | --prod
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ENV_FILES: Record<string, string> = { prod: ".dev.vars.main.bak", dev: ".dev.vars" };
const target = process.argv.find((a) => a === "--prod" || a === "--dev")?.slice(2);

async function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!target) throw new Error("Pass --prod or --dev, or set DATABASE_URL.");
  const contents = await readFile(join(process.cwd(), ENV_FILES[target]), "utf8");
  const line = contents.split(/\r?\n/).find((l) => l.trimStart().startsWith("DATABASE_URL="));
  if (!line) throw new Error(`No DATABASE_URL in ${ENV_FILES[target]}`);
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

const SOURCES = {
  investors: {
    csv: "https://datawrapper.dwcdn.net/hxktv/9/dataset.csv",
    page: "https://www.hypepotamus.com/southeast-investor-list/",
  },
  accelerators: {
    csv: "https://datawrapper.dwcdn.net/9Mdve/9/dataset.csv",
    page: "https://www.hypepotamus.com/accelerator-program-list/",
  },
};

/** Minimal CSV parser that survives quoted commas and quotes-in-quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row); }
  return rows;
}

/** `[Name](https://url)` → { name, url } — the lists' cell format. */
function mdLink(cell: string): { name: string; url: string | null } {
  const m = cell.trim().match(/^\[([^\]]+)\]\(([^)]+)\)/);
  return m ? { name: m[1].trim(), url: m[2].trim() } : { name: cell.trim(), url: null };
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

async function main() {
  const sql = neon(await databaseUrl());
  console.log(`→ ${target ?? "DATABASE_URL"}`);

  await sql`
    INSERT INTO directory_sources (id, display_name, base_url)
    VALUES ('hypepotamus', 'Hypepotamus', 'https://www.hypepotamus.com')
    ON CONFLICT (id) DO NOTHING`;

  const stats = { investors: 0, accelerators: 0, updated: 0 };

  async function upsert(input: {
    kind: "investor" | "resource";
    name: string; url: string | null; location: string; summary: string;
    tags: string[]; sourcePage: string; attributes: Record<string, unknown>;
  }) {
    const slug = slugify(input.name);
    if (!slug) return;
    const rows = await sql`
      INSERT INTO directory_entries (kind, slug, name, summary, website, location, tags, attributes)
      VALUES (${input.kind}, ${slug}, ${input.name}, ${input.summary || null}, ${input.url},
              ${input.location || null}, ${input.tags}, ${JSON.stringify(input.attributes)}::jsonb)
      ON CONFLICT (kind, slug) DO UPDATE SET
        summary = COALESCE(EXCLUDED.summary, directory_entries.summary),
        website = COALESCE(EXCLUDED.website, directory_entries.website),
        location = COALESCE(EXCLUDED.location, directory_entries.location),
        tags = EXCLUDED.tags,
        attributes = directory_entries.attributes || EXCLUDED.attributes,
        status = 'active',
        updated_at = now()
      RETURNING id, (xmax = 0) AS inserted` as any[];
    const entry = rows[0];

    await sql`
      INSERT INTO directory_entry_sources (entry_id, source, external_id, source_url, source_data, last_seen_at)
      VALUES (${entry.id}, 'hypepotamus', ${`${input.kind}:${slug}`}, ${input.sourcePage},
              ${JSON.stringify(input.attributes)}::jsonb, now())
      ON CONFLICT (source, external_id) DO UPDATE SET
        last_seen_at = now(), source_data = EXCLUDED.source_data`;

    if (input.kind === "investor") {
      await sql`
        INSERT INTO investor_details (entry_id, firm, thesis)
        VALUES (${entry.id}, ${input.name}, ${input.summary || null})
        ON CONFLICT (entry_id) DO UPDATE SET thesis = COALESCE(EXCLUDED.thesis, investor_details.thesis)`;
    } else {
      await sql`
        INSERT INTO resource_details (entry_id, category, application_url)
        VALUES (${entry.id}, 'accelerator', ${input.url})
        ON CONFLICT (entry_id) DO UPDATE SET
          category = 'accelerator',
          application_url = COALESCE(EXCLUDED.application_url, resource_details.application_url)`;
    }
    if (entry.inserted) stats[input.kind === "investor" ? "investors" : "accelerators"]++;
    else stats.updated++;
  }

  // ── Investors: Company, City, State, Description, Industry Focus ──────────
  const invCsv = parseCsv(await (await fetch(SOURCES.investors.csv)).text());
  for (const r of invCsv.slice(1)) {
    if (r.length < 5) continue;
    const { name, url } = mdLink(r[0]);
    if (!name) continue;
    const focus = r[4]?.trim() ?? "";
    await upsert({
      kind: "investor",
      name, url,
      location: [r[1]?.trim(), r[2]?.trim()].filter(Boolean).join(", "),
      summary: r[3]?.trim() ?? "",
      tags: focus ? [focus.toLowerCase()] : [],
      sourcePage: SOURCES.investors.page,
      attributes: { industry_focus: focus, list: "southeast-investor-list" },
    });
  }

  // ── Accelerators: Program Name, Location, Who It's For ────────────────────
  const accCsv = parseCsv(await (await fetch(SOURCES.accelerators.csv)).text());
  for (const r of accCsv.slice(1)) {
    if (r.length < 3) continue;
    const { name, url } = mdLink(r[0]);
    if (!name) continue;
    await upsert({
      kind: "resource",
      name, url,
      location: r[1]?.trim() ?? "",
      summary: r[2]?.trim() ?? "",
      tags: ["accelerator"],
      sourcePage: SOURCES.accelerators.page,
      attributes: { who_its_for: r[2]?.trim() ?? "", list: "accelerator-program-list" },
    });
  }

  const [counts] = await sql`
    SELECT
      count(*) FILTER (WHERE kind = 'investor') AS investors,
      count(*) FILTER (WHERE kind = 'resource') AS resources
    FROM directory_entries WHERE status = 'active'` as any[];
  console.log(`created: ${stats.investors} investors, ${stats.accelerators} accelerators; refreshed: ${stats.updated}`);
  console.log(`directory now: ${counts.investors} investors, ${counts.resources} resources active`);
}

main().catch((e) => { console.error(e); process.exit(1); });
