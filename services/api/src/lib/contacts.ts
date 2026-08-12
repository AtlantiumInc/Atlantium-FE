import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { directoryContacts, directoryRevealBudgets, directoryReveals, directorySuppressions } from "../db/schema";

export const DEFAULT_REVEAL_QUOTA = 5;
const WINDOW_DAYS = 30;

export type ContactState = "none" | "hidden" | "revealable" | "revealed" | "upgrade_required";

/** sha256(contact_type + ":" + normalized value) — the suppression key. */
export async function contactValueHash(contactType: string, value: string) {
  const normalized = `${contactType}:${value.trim().toLowerCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function revealQuota(env: { DIRECTORY_REVEAL_QUOTA?: string }) {
  const parsed = Number(env.DIRECTORY_REVEAL_QUOTA);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVEAL_QUOTA;
}

/**
 * Burn one reveal ATOMICALLY.
 *
 * NOT an advisory lock + count: under READ COMMITTED a statement's snapshot is
 * taken BEFORE it blocks on the lock, so serialized callers still count stale
 * rows (proven: an 8-way burst passed 6 reveals through a quota of 5).
 *
 * Instead the guard lives in an UPDATE's WHERE clause. Postgres takes a row
 * lock and, via EvalPlanQual, re-evaluates the predicate against the freshly
 * committed row version — so blocked callers see the incremented count. The
 * window is a per-user 30-day budget that resets on first use after expiry.
 *
 * Returns 'granted' (new reveal), 'already' (free re-reveal) or 'exhausted'.
 */
export async function burnReveal(
  db: Db,
  userId: string,
  entryId: string,
  quota: number,
): Promise<"granted" | "already" | "exhausted"> {
  const [existing] = await db
    .select({ id: directoryReveals.id })
    .from(directoryReveals)
    .where(and(eq(directoryReveals.userId, userId), eq(directoryReveals.entryId, entryId)))
    .limit(1);
  if (existing) return "already";

  await db.insert(directoryRevealBudgets).values({ userId }).onConflictDoNothing();

  const window = sql.raw(String(WINDOW_DAYS));
  const claimed = await db.execute(sql`
    UPDATE directory_reveal_budgets
    SET used = CASE WHEN window_start < now() - interval '${window} days' THEN 1 ELSE used + 1 END,
        window_start = CASE WHEN window_start < now() - interval '${window} days' THEN now() ELSE window_start END,
        updated_at = now()
    WHERE user_id = ${userId}
      AND (window_start < now() - interval '${window} days' OR used < ${quota})
    RETURNING used
  `);
  const claimedRows = (claimed as unknown as { rows?: unknown[] }).rows ?? (claimed as unknown as unknown[]);
  if (!Array.isArray(claimedRows) || claimedRows.length === 0) return "exhausted";

  const inserted = await db
    .insert(directoryReveals)
    .values({ userId, entryId })
    .onConflictDoNothing()
    .returning({ id: directoryReveals.id });

  if (inserted.length === 0) {
    // Lost a race on the same entry — refund the budget we just claimed.
    await db.execute(sql`
      UPDATE directory_reveal_budgets SET used = greatest(used - 1, 0), updated_at = now()
      WHERE user_id = ${userId}
    `);
    return "already";
  }
  return "granted";
}

export async function revealsUsed(db: Db, userId: string) {
  const [row] = await db
    .select({ used: directoryRevealBudgets.used, windowStart: directoryRevealBudgets.windowStart })
    .from(directoryRevealBudgets)
    .where(eq(directoryRevealBudgets.userId, userId))
    .limit(1);
  if (!row) return 0;
  const expired = row.windowStart.getTime() < Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return expired ? 0 : row.used;
}

/** When the current budget window resets — "next reveal refreshes …". */
export async function nextRefreshAt(db: Db, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ windowStart: directoryRevealBudgets.windowStart })
    .from(directoryRevealBudgets)
    .where(eq(directoryRevealBudgets.userId, userId))
    .limit(1);
  if (!row) return null;
  const resets = new Date(row.windowStart.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return resets.getTime() > Date.now() ? resets.toISOString() : null;
}

export async function hasRevealed(db: Db, userId: string, entryId: string) {
  const [row] = await db
    .select({ id: directoryReveals.id })
    .from(directoryReveals)
    .where(and(eq(directoryReveals.userId, userId), eq(directoryReveals.entryId, entryId)))
    .limit(1);
  return Boolean(row);
}

export async function countLiveContacts(db: Db, entryId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(directoryContacts)
    .where(and(eq(directoryContacts.entryId, entryId), isNull(directoryContacts.suppressedAt)));
  return row?.n ?? 0;
}

/**
 * The ONLY read path that emits contact values. Callers must have already
 * checked entitlement or a reveal row.
 */
export async function readContacts(db: Db, entryId: string) {
  const rows = await db
    .select()
    .from(directoryContacts)
    .where(and(eq(directoryContacts.entryId, entryId), isNull(directoryContacts.suppressedAt)));
  return rows.map((c) => ({
    id: c.id,
    contact_type: c.contactType,
    value: c.value,
    label: c.label,
    verified_at: c.verifiedAt?.toISOString() ?? null,
  }));
}

/** Takedown: null the value (real tombstone), keep the hash so re-syncs match. */
export async function suppressContact(db: Db, contactId: string, reason: string, requestedBy?: string) {
  const [contact] = await db
    .select()
    .from(directoryContacts)
    .where(eq(directoryContacts.id, contactId))
    .limit(1);
  if (!contact) return null;

  await db
    .update(directoryContacts)
    .set({ value: null, suppressedAt: new Date(), suppressionReason: reason, updatedAt: new Date() })
    .where(eq(directoryContacts.id, contactId));

  await db
    .insert(directorySuppressions)
    .values({ valueHash: contact.valueHash, reason, requestedBy: requestedBy ?? null })
    .onConflictDoNothing();

  return contact.valueHash;
}

/** Sync-time guard: never (re)insert a suppressed value. */
export async function isSuppressed(db: Db, valueHash: string) {
  const [row] = await db
    .select({ id: directorySuppressions.id })
    .from(directorySuppressions)
    .where(eq(directorySuppressions.valueHash, valueHash))
    .limit(1);
  return Boolean(row);
}

export async function addContact(
  db: Db,
  input: {
    entryId: string;
    contactType: string;
    value: string;
    label?: string | null;
    source?: string;
    sourceUrl?: string | null;
  },
) {
  const valueHash = await contactValueHash(input.contactType, input.value);
  if (await isSuppressed(db, valueHash)) return { skipped: "suppressed" as const };

  const [row] = await db
    .insert(directoryContacts)
    .values({
      entryId: input.entryId,
      contactType: input.contactType,
      value: input.value,
      valueHash,
      label: input.label ?? null,
      source: input.source ?? "manual",
      sourceUrl: input.sourceUrl ?? null,
      verifiedAt: new Date(),
    })
    .returning();
  return { contact: row };
}
