import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { directoryEntries, orgDomains, workEmailVerifications } from "../db/schema";

/**
 * Work-email verification — the evidence behind an employment grant (§4.3).
 *
 * What this proves and what it does NOT:
 *   - It proves possession of an address at a domain.
 *   - It does NOT prove which organization you belong to. A parent company, its
 *     subsidiaries and its venture arm legitimately share @parent.com, so a
 *     domain match yields a CANDIDATE SET the member resolves — never a single
 *     canonical owner.
 *   - It grants `employee` with authority `none`. Speaking for a company is a
 *     separate, admin-reviewed grant (§4.4).
 */

/** Personal mail hosts. Without this, anyone is an "employee" of anywhere. */
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com",
  "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me",
  "protonmail.com", "pm.me", "gmx.com", "mail.com", "zoho.com", "yandex.com",
  "fastmail.com", "hey.com", "duck.com", "tutanota.com", "163.com", "qq.com",
]);

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("@")
    .pop()!
    .replace(/[.,;]+$/, "");
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(normalizeDomain(domain));
}

export type OrgCandidate = { entryId: string; name: string; slug: string; kind: string };

/**
 * Orgs plausibly reachable from a domain. Matches registered org_domains rows
 * first, then falls back to the catalog's own website field so the very first
 * verification at a company still works before anyone has registered domains.
 */
export async function candidateOrgsForDomain(db: Db, domain: string): Promise<OrgCandidate[]> {
  const normalized = normalizeDomain(domain);

  const registered = await db
    .select({
      entryId: directoryEntries.id,
      name: directoryEntries.name,
      slug: directoryEntries.slug,
      kind: directoryEntries.kind,
    })
    .from(orgDomains)
    .innerJoin(directoryEntries, eq(directoryEntries.id, orgDomains.entryId))
    .where(eq(orgDomains.domain, normalized));

  if (registered.length > 0) return registered;

  const byWebsite = await db
    .select({
      entryId: directoryEntries.id,
      name: directoryEntries.name,
      slug: directoryEntries.slug,
      kind: directoryEntries.kind,
    })
    .from(directoryEntries)
    .where(and(
      sql`${directoryEntries.website} IS NOT NULL`,
      sql`lower(regexp_replace(regexp_replace(${directoryEntries.website}, '^https?://', ''), '^www\\.', '')) LIKE ${normalized + "%"}`,
      eq(directoryEntries.status, "active"),
    ))
    .limit(10);

  return byWebsite;
}

export function generateCode(): string {
  // 6 digits, uniform, from the platform CSPRNG.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

export async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const MAX_ATTEMPTS = 5;
export const CODE_TTL_MINUTES = 15;

export async function latestPendingVerification(db: Db, profileId: string) {
  const [row] = await db
    .select()
    .from(workEmailVerifications)
    .where(and(
      eq(workEmailVerifications.profileId, profileId),
      isNull(workEmailVerifications.consumedAt),
    ))
    .orderBy(desc(workEmailVerifications.createdAt))
    .limit(1);
  return row ?? null;
}
