/**
 * Directory link check + enrichment.
 *
 * Visits every active entry's website. Dead links (404/410/DNS-gone) hide the
 * entry — a directory that sends people to broken pages is worse than a
 * shorter one. Live pages get scraped lightly for the org's OWN words and
 * marks: title, meta description, and an icon for the avatar circle. No
 * personnel, nothing behind a login — just what the site's <head> offers to
 * everyone.
 *
 * Summary upgrade is conservative: only when ours is missing or thin, and the
 * site's is substantial. Bot walls (403/429) and timeouts keep the entry live
 * with the failure recorded — unreachable is not the same as gone.
 *
 *   npx tsx scripts/enrich-directory.ts --dev | --prod
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

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type Verdict =
  | { state: "dead"; detail: string }
  | { state: "unreachable"; detail: string }
  | { state: "ok"; finalUrl: string; title: string | null; description: string | null; icon: string | null };

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? null;

function meta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:name|property)\\s*=\\s*["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? attr(tag, "content") : null;
}

/** Squarish site icons beat og:image banners inside a circular avatar. */
function pickIcon(html: string, base: string): string | null {
  const links = html.match(/<link[^>]+rel\s*=\s*["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/gi) ?? [];
  let apple: string | null = null, icon: string | null = null;
  for (const tag of links) {
    const rel = attr(tag, "rel")?.toLowerCase() ?? "";
    const href = attr(tag, "href");
    if (!href) continue;
    if (rel.includes("apple-touch-icon")) apple = apple ?? href;
    else if (rel.includes("icon") && !href.endsWith(".ico")) icon = icon ?? href;
  }
  const chosen = apple ?? icon ?? meta(html, "og:image");
  if (!chosen) return null;
  try { return new URL(chosen, base).toString(); } catch { return null; }
}

async function inspect(url: string): Promise<Verdict> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 404 || res.status === 410) return { state: "dead", detail: `http_${res.status}` };
    if (!res.ok) return { state: "unreachable", detail: `http_${res.status}` };

    const html = (await res.text()).slice(0, 500_000);
    const title = html.match(/<title[^>]*>([^<]{1,200})/i)?.[1]?.trim() ?? null;
    const description = (meta(html, "description") ?? meta(html, "og:description"))?.trim() ?? null;
    return { state: "ok", finalUrl: res.url || url, title, description, icon: pickIcon(html, res.url || url) };
  } catch (error) {
    const message = String((error as Error)?.cause ?? (error as Error)?.message ?? error);
    // A domain that no longer resolves is gone, not busy.
    if (/ENOTFOUND|EAI_AGAIN.*not known|CERT_HAS_EXPIRED/i.test(message)) return { state: "dead", detail: "dns" };
    if (/abort/i.test(message)) return { state: "unreachable", detail: "timeout" };
    return { state: "unreachable", detail: message.slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

const decode = (s: string) => s
  .replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const sql = neon(await databaseUrl());
  console.log(`→ ${target ?? "DATABASE_URL"}`);

  const entries = await sql`
    SELECT id, kind, slug, name, website, summary FROM directory_entries
    WHERE status = 'active' AND website IS NOT NULL AND kind IN ('investor', 'resource', 'company')
    ORDER BY kind, slug` as any[];
  console.log(`checking ${entries.length} entries…`);

  const stats = { ok: 0, enrichedSummary: 0, icons: 0, dead: 0, unreachable: 0 };
  const deadList: string[] = [];

  const BATCH = 8;
  for (let i = 0; i < entries.length; i += BATCH) {
    await Promise.all(entries.slice(i, i + BATCH).map(async (e) => {
      const verdict = await inspect(e.website);
      const checkedAt = new Date().toISOString();

      if (verdict.state === "dead") {
        stats.dead++;
        deadList.push(`${e.kind}/${e.slug} (${verdict.detail})`);
        await sql`
          UPDATE directory_entries SET status = 'hidden',
            attributes = attributes || ${JSON.stringify({ link_check: { state: "dead", detail: verdict.detail, checked_at: checkedAt } })}::jsonb,
            updated_at = now()
          WHERE id = ${e.id}`;
        return;
      }

      if (verdict.state === "unreachable") {
        stats.unreachable++;
        await sql`
          UPDATE directory_entries SET
            attributes = attributes || ${JSON.stringify({ link_check: { state: "unreachable", detail: verdict.detail, checked_at: checkedAt } })}::jsonb
          WHERE id = ${e.id}`;
        return;
      }

      stats.ok++;
      const description = verdict.description ? decode(verdict.description) : null;
      const upgradeSummary = Boolean(
        description && description.length >= 60 && (!e.summary || e.summary.length < 45),
      );
      if (upgradeSummary) stats.enrichedSummary++;
      if (verdict.icon) stats.icons++;

      const enrich: Record<string, unknown> = {
        link_check: { state: "ok", checked_at: checkedAt },
        ...(verdict.title ? { site_title: decode(verdict.title) } : {}),
        ...(description ? { site_description: description.slice(0, 500) } : {}),
        ...(verdict.icon ? { logo_url: verdict.icon } : {}),
      };

      await sql`
        UPDATE directory_entries SET
          attributes = attributes || ${JSON.stringify(enrich)}::jsonb,
          website = ${verdict.finalUrl.split("#")[0]},
          ${upgradeSummary
            ? sql`summary = ${description!.slice(0, 280)},`
            : sql``}
          updated_at = now()
        WHERE id = ${e.id}`;
    }));
    console.log(`  …${Math.min(i + BATCH, entries.length)}/${entries.length}`);
  }

  console.log(`\nok: ${stats.ok} (summaries upgraded: ${stats.enrichedSummary}, icons found: ${stats.icons})`);
  console.log(`hidden as dead: ${stats.dead}`);
  if (deadList.length) deadList.forEach((d) => console.log(`  ✗ ${d}`));
  console.log(`unreachable (kept live): ${stats.unreachable}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
