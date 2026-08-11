/**
 * Weekly member digest — "This Week at Atlantium".
 *
 * One email assembled from pluggable SECTIONS. Each section provider queries
 * its own content and returns rendered rows or null; null sections drop out,
 * and if every section is empty the whole send is skipped. Adding a content
 * type (articles, launches, ...) = writing one provider and appending it to
 * buildSections().
 *
 * Safety rails:
 *  - digest_runs row per ISO week acts as a run lock: a cron retry or a
 *    double-fire can't send the same week twice.
 *  - digest_suppressions + per-recipient HMAC-signed unsubscribe links
 *    (List-Unsubscribe header included) keep us deliverable and polite.
 */

import { and, eq, gte, lte, notInArray, desc, sql } from "drizzle-orm";
import { createDb, type Db } from "../db/client";
import {
  digestRuns,
  digestSuppressions,
  jobPostings,
  lobbyEvents,
  lobbyRooms,
  user,
} from "../db/schema";
import type { Env } from "../env";
import { requireEnv } from "../env";

const SITE = "https://atlantium.ai";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type DigestSection = {
  key: string;
  title: string;
  count: number;
  html: string;
};

// ---------------------------------------------------------------------------
// Section providers
// ---------------------------------------------------------------------------

function fmtSalary(min: number | null, max: number | null): string | null {
  const f = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${f(min)} – ${f(max)}`;
  if (min) return `${f(min)}+`;
  if (max) return `Up to ${f(max)}`;
  return null;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function jobsSection(db: Db): Promise<DigestSection | null> {
  const cutoff = new Date(Date.now() - WEEK_MS);
  const fresh = await db
    .select()
    .from(jobPostings)
    .where(and(eq(jobPostings.status, "active"), gte(jobPostings.postedAt, cutoff)))
    .orderBy(sql`${jobPostings.salaryMax} DESC NULLS LAST`, desc(jobPostings.postedAt));
  if (fresh.length === 0) return null;

  const featured = fresh.slice(0, 8);
  const rows = featured
    .map((j) => {
      const salary = fmtSalary(j.salaryMin, j.salaryMax);
      const meta = [j.workplaceType, j.seniority, salary].filter(Boolean).join(" · ");
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8edf3;">
          <a href="${SITE}/jobs/${esc(j.slug)}" style="color:#0f172a;font-weight:600;text-decoration:none;font-size:15px;">${esc(j.title)}</a>
          <div style="color:#475569;font-size:13px;padding-top:2px;">${esc(j.company)}${meta ? ` &nbsp;·&nbsp; <span style="color:#0e7490;">${esc(meta)}</span>` : ""}</div>
        </td>
      </tr>`;
    })
    .join("");

  return {
    key: "jobs",
    title: `${fresh.length} new Atlanta tech roles this week`,
    count: fresh.length,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <div style="padding-top:16px;">
        <a href="${SITE}/jobs" style="display:inline-block;background:#0891b2;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:10px 22px;border-radius:8px;">Browse all ${fresh.length} new roles</a>
      </div>`,
  };
}

async function eventsSection(db: Db): Promise<DigestSection | null> {
  const now = new Date();
  const horizon = new Date(Date.now() + WEEK_MS);
  const upcoming = await db
    .select({ event: lobbyEvents, room: lobbyRooms })
    .from(lobbyEvents)
    .innerJoin(lobbyRooms, eq(lobbyEvents.roomId, lobbyRooms.id))
    .where(
      and(
        eq(lobbyEvents.status, "scheduled"),
        gte(lobbyEvents.startsAt, now),
        lte(lobbyEvents.startsAt, horizon),
      ),
    )
    .orderBy(lobbyEvents.startsAt);
  if (upcoming.length === 0) return null;

  const rows = upcoming
    .slice(0, 6)
    .map(({ event, room }) => {
      const when = event.startsAt.toLocaleString("en-US", {
        timeZone: event.timezone || "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const isOfficeHours = room.type === "office_hours";
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8edf3;">
          <span style="color:#0f172a;font-weight:600;font-size:15px;">${esc(event.title)}</span>
          ${isOfficeHours ? '<span style="background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin-left:8px;">Office Hours</span>' : ""}
          <div style="color:#475569;font-size:13px;padding-top:2px;">${esc(when)} ET &nbsp;·&nbsp; ${esc(room.name)}</div>
        </td>
      </tr>`;
    })
    .join("");

  return {
    key: "events",
    title: `${upcoming.length} live session${upcoming.length === 1 ? "" : "s"} this week`,
    count: upcoming.length,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <div style="padding-top:16px;">
        <a href="${SITE}/lobby" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:10px 22px;border-radius:8px;">See the schedule</a>
      </div>`,
  };
}

export async function buildSections(db: Db): Promise<DigestSection[]> {
  const sections = await Promise.all([jobsSection(db), eventsSection(db)]);
  return sections.filter((s): s is DigestSection => s !== null);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export function renderDigest(sections: DigestSection[], unsubscribeUrl: string): string {
  const blocks = sections
    .map(
      (s) => `
    <tr><td style="padding:26px 32px 6px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#0891b2;text-transform:uppercase;padding-bottom:6px;">${esc(s.key === "jobs" ? "Weekly Job Report" : "Live at Atlantium")}</div>
      <div style="font-size:19px;font-weight:700;color:#0f172a;padding-bottom:8px;">${esc(s.title)}</div>
      ${s.html}
    </td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0b1220;padding:26px 32px;">
          <div style="font-size:20px;font-weight:800;letter-spacing:3px;color:#ffffff;">ATLANTIUM</div>
          <div style="font-size:13px;color:#7dd3fc;padding-top:4px;">This Week at Atlantium · Citizen Technology Lab</div>
        </td></tr>
        ${blocks}
        <tr><td style="padding:26px 32px 30px;">
          <div style="border-top:1px solid #e8edf3;padding-top:18px;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're getting this because you're an Atlantium member.<br/>
            Catch the report on <a href="https://youtube.com/@atlantium" style="color:#0891b2;">YouTube</a>, Instagram, TikTok, and Threads.<br/>
            <a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a> from the weekly report.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Unsubscribe signing
// ---------------------------------------------------------------------------

async function hmac(env: Env, email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requireEnv(env, "HANDOFF_SIGNING_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`digest:${email.toLowerCase()}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function verifyUnsubscribeSig(env: Env, email: string, sig: string): Promise<boolean> {
  const expected = await hmac(env, email);
  return expected === sig;
}

export async function unsubscribeUrl(env: Env, email: string): Promise<string> {
  const base = env.AUTH_BASE_URL || "https://api.atlantium.ai";
  const sig = await hmac(env, email);
  return `${base}/v1/email/unsubscribe?email=${encodeURIComponent(email)}&sig=${sig}`;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

function isoWeekKey(date: Date): string {
  // ISO-8601 week number, UTC.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type DigestSendResult = {
  periodKey: string;
  skipped?: "no_content" | "already_sent";
  sections: Record<string, number>;
  recipients: number;
  sent: number;
  failed: number;
  test: boolean;
};

const BATCH_SIZE = 100;

export async function sendWeeklyDigest(
  env: Env,
  opts: { testTo?: string; force?: boolean } = {},
): Promise<DigestSendResult> {
  const db = createDb(env);
  const test = Boolean(opts.testTo);
  const periodKey = isoWeekKey(new Date());

  const sections = await buildSections(db);
  const sectionCounts = Object.fromEntries(sections.map((s) => [s.key, s.count]));
  const base: DigestSendResult = {
    periodKey,
    sections: sectionCounts,
    recipients: 0,
    sent: 0,
    failed: 0,
    test,
  };
  if (sections.length === 0) return { ...base, skipped: "no_content" };

  // Run lock — real runs only. A retry of the same ISO week is a no-op.
  if (!test) {
    const locked = await db
      .insert(digestRuns)
      .values({ periodKey, kind: "weekly", sections: sectionCounts })
      .onConflictDoNothing({ target: digestRuns.periodKey })
      .returning({ periodKey: digestRuns.periodKey });
    if (locked.length === 0 && !opts.force) return { ...base, skipped: "already_sent" };
  }

  let recipients: string[];
  if (opts.testTo) {
    recipients = [opts.testTo];
  } else {
    const suppressed = await db.select({ email: digestSuppressions.email }).from(digestSuppressions);
    const suppressedEmails = suppressed.map((r) => r.email.toLowerCase());
    const members = await db
      .select({ email: user.email })
      .from(user)
      .where(
        suppressedEmails.length > 0
          ? and(eq(user.emailVerified, true), notInArray(sql`lower(${user.email})`, suppressedEmails))
          : eq(user.emailVerified, true),
      );
    recipients = [...new Set(members.map((m) => m.email))];
  }

  const jobsCount = sectionCounts.jobs ?? 0;
  const eventsCount = sectionCounts.events ?? 0;
  const subject = [
    jobsCount > 0 ? `The Weekly Job Report — ${jobsCount} new Atlanta tech roles` : "This Week at Atlantium",
    eventsCount > 0 ? `${eventsCount} live session${eventsCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let sent = 0;
  let failed = 0;

  if (!env.RESEND_API_KEY) {
    console.log(`[digest] no RESEND_API_KEY — would send "${subject}" to ${recipients.length} recipients`);
    return { ...base, recipients: recipients.length, skipped: undefined };
  }

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const payload = await Promise.all(
      chunk.map(async (to) => {
        const unsub = await unsubscribeUrl(env, to);
        return {
          from: env.RESEND_FROM || "Atlantium <hello@atlantium.ai>",
          to,
          subject,
          html: renderDigest(sections, unsub),
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      }),
    );
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      sent += chunk.length;
    } else {
      failed += chunk.length;
      const text = await response.text().catch(() => "");
      console.error(`[digest] batch ${i / BATCH_SIZE} failed: ${response.status} ${text.slice(0, 200)}`);
    }
  }

  if (!test) {
    await db
      .update(digestRuns)
      .set({ recipients: recipients.length, sent, failed })
      .where(eq(digestRuns.periodKey, periodKey));
  }

  return { ...base, recipients: recipients.length, sent, failed };
}
