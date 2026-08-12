/**
 * jobs-review.ts — Daily AI review of every active job posting.
 *
 * A 30-minute cron runs runReviewCycle(): first poll any in-flight Anthropic
 * Message Batches and apply finished verdicts, then (if capacity allows)
 * claim a shard of due jobs, fetch each apply page, resolve what we can
 * deterministically (404s, "no longer available" phrases), and submit the
 * rest to Claude Haiku via the Batch API for an open/closed verdict plus
 * enrichment (degree requirement, ghost detection, report-worthiness).
 *
 * Safety rails:
 *  - unreachable pages (403/timeout) are never auto-expired — recorded and
 *    retried on the next daily pass;
 *  - only high-confidence dead verdicts auto-expire; everything else flags
 *    for the admin queue;
 *  - if a batch would expire >40% of its shard, nothing auto-expires (a bad
 *    fetch day or prompt regression can't mass-kill the board);
 *  - a daily submission ceiling stops runaway loops.
 */

import { and, eq, gte, isNull, lt, lte, or, sql, asc } from "drizzle-orm";
import { createDb, type Db } from "../db/client";
import { jobPostings, reviewBatches } from "../db/schema";
import type { Env } from "../env";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const REVIEW_MODEL = "claude-haiku-4-5";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const SHARD_LIMIT = 350;
const REVIEW_STALE_HOURS = 22;
const MAX_INFLIGHT_BATCHES = 3;
const DAILY_SUBMIT_CEILING = 8000;
const PAGE_TEXT_CAP = 8000; // chars ≈ 2k tokens
const FETCH_TIMEOUT_MS = 15000;
// If a single batch says more than this fraction of its shard is dead,
// assume something upstream broke and flag instead of expiring.
const MASS_EXPIRE_GUARD = 0.4;

const DEAD_PHRASES = [
  "no longer accepting",
  "no longer available",
  "no longer active",
  "position has been filled",
  "job not found",
  "posting not found",
  "job has expired",
  "posting has expired",
  "job is no longer",
  "requisition not found",
  "this job has closed",
  "job posting has closed",
  "no longer open",
  "position is closed",
  "opportunity is no longer",
];

export type ReviewVerdict = {
  status: "open" | "filled_or_closed" | "redirect_not_a_job" | "evergreen_pipeline" | "unreachable";
  confidence: "high" | "medium" | "low";
  degree_required?: "required" | "not_required" | "equivalent_accepted" | "unclear";
  report_score?: number;
  notes?: string;
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["open", "filled_or_closed", "redirect_not_a_job", "evergreen_pipeline"],
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    degree_required: {
      type: "string",
      enum: ["required", "not_required", "equivalent_accepted", "unclear"],
    },
    report_score: { type: "integer", enum: [1, 2, 3, 4, 5] },
    notes: { type: "string" },
  },
  required: ["status", "confidence", "degree_required", "report_score", "notes"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You review the live apply page of a job posting from an Atlanta tech job board and return a strict JSON verdict.

status:
- "open": the page shows this specific job and it appears possible to apply.
- "filled_or_closed": the page says the job is filled, closed, expired, or no longer accepting applications.
- "redirect_not_a_job": the page is not this job posting (careers home, search results, error page, unrelated job).
- "evergreen_pipeline": the page is a standing "join our talent community" / always-open pipeline ad rather than a real current vacancy.

confidence: how sure you are of the status call, given the page text.

degree_required, judged from stated requirements:
- "required": a degree is a hard requirement.
- "not_required": no degree mentioned in requirements.
- "equivalent_accepted": degree "or equivalent experience/preferred".
- "unclear": requirements not visible on this page.

report_score (1-5): how good a feature would this be in a weekly Atlanta tech jobs report — favor clear salary, recognizable company, attainable requirements, genuinely open role. 1 = poor, 5 = excellent.

notes: one short sentence of evidence for the status call.

Base every judgment only on the provided page text.`;

function anthropicHeaders(env: Env): Record<string, string> {
  return {
    "x-api-key": env.ANTHROPIC_API_KEY ?? "",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Page fetching + deterministic checks
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;|&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PAGE_TEXT_CAP);
}

type FetchedPage =
  | { kind: "ok"; text: string }
  | { kind: "dead"; reason: string }
  | { kind: "unreachable"; reason: string };

async function fetchPage(url: string): Promise<FetchedPage> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 404 || res.status === 410) {
      return { kind: "dead", reason: `http_${res.status}` };
    }
    if (!res.ok) {
      return { kind: "unreachable", reason: `http_${res.status}` };
    }
    const text = stripHtml(await res.text());
    const lower = text.toLowerCase();
    const phrase = DEAD_PHRASES.find((p) => lower.includes(p));
    if (phrase) return { kind: "dead", reason: `phrase:${phrase}` };
    if (text.length < 200) {
      // Nothing to judge — JS shell with no server-rendered text.
      return { kind: "unreachable", reason: "empty_page" };
    }
    return { kind: "ok", text };
  } catch (error) {
    const name = error instanceof Error ? error.name : "error";
    return { kind: "unreachable", reason: name === "AbortError" ? "timeout" : "fetch_error" };
  }
}

// ---------------------------------------------------------------------------
// Verdict application
// ---------------------------------------------------------------------------

async function applyVerdict(
  db: Db,
  jobId: string,
  verdict: ReviewVerdict,
  via: "ai" | "deterministic",
  allowExpire: boolean,
): Promise<"expired" | "flagged" | "open" | "unreachable"> {
  const isDead = verdict.status === "filled_or_closed" || verdict.status === "redirect_not_a_job";
  const shouldExpire = isDead && verdict.confidence === "high" && allowExpire;
  const flagged =
    (isDead && !shouldExpire) || verdict.status === "evergreen_pipeline";

  const review = {
    ...verdict,
    reviewed_via: via,
    flagged,
    verified_at: new Date().toISOString(),
  };

  await db
    .update(jobPostings)
    .set({
      review,
      reviewedAt: new Date(),
      ...(shouldExpire ? { status: "expired" } : {}),
      updatedAt: new Date(),
    })
    .where(eq(jobPostings.id, jobId));

  if (shouldExpire) return "expired";
  if (flagged) return "flagged";
  return verdict.status === "unreachable" ? "unreachable" : "open";
}

// ---------------------------------------------------------------------------
// Submit step
// ---------------------------------------------------------------------------

export type ReviewCycleResult = {
  polled: number;
  batchesCompleted: number;
  verdictsApplied: Record<string, number>;
  submitted: number;
  deterministic: Record<string, number>;
  skippedReason?: string;
};

async function submitShard(env: Env, db: Db, result: ReviewCycleResult): Promise<void> {
  // Ceiling: how many jobs entered review in the last 24h (by reviewed_at or
  // pending batch membership approximated via batch job counts).
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobPostings)
    .where(gte(jobPostings.reviewedAt, dayAgo));
  const [pendingBatches] = await db
    .select({ n: sql<number>`coalesce(sum(job_count), 0)::int` })
    .from(reviewBatches)
    .where(eq(reviewBatches.status, "in_progress"));
  if ((recent?.n ?? 0) + (pendingBatches?.n ?? 0) > DAILY_SUBMIT_CEILING) {
    result.skippedReason = "daily_ceiling";
    return;
  }

  const staleCutoff = new Date(Date.now() - REVIEW_STALE_HOURS * 60 * 60 * 1000);
  const due = await db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      applyUrl: jobPostings.applyUrl,
    })
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.status, "active"),
        or(isNull(jobPostings.reviewedAt), lt(jobPostings.reviewedAt, staleCutoff)),
      ),
    )
    .orderBy(sql`${jobPostings.reviewedAt} ASC NULLS FIRST`)
    .limit(Number(env.REVIEW_SHARD_LIMIT) || SHARD_LIMIT);

  if (due.length === 0) {
    result.skippedReason = result.skippedReason ?? "none_due";
    return;
  }

  // Fetch pages with bounded concurrency.
  const CONCURRENCY = 20;
  const pages = new Map<string, FetchedPage>();
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const chunk = due.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(chunk.map((j) => fetchPage(j.applyUrl)));
    chunk.forEach((j, idx) => pages.set(j.id, fetched[idx]));
  }

  // Deterministic verdicts apply immediately; the rest go to the batch.
  const batchRequests: Array<Record<string, unknown>> = [];
  for (const job of due) {
    const page = pages.get(job.id)!;
    if (page.kind === "dead") {
      const outcome = await applyVerdict(
        db,
        job.id,
        { status: "filled_or_closed", confidence: "high", notes: page.reason },
        "deterministic",
        true,
      );
      result.deterministic[outcome] = (result.deterministic[outcome] ?? 0) + 1;
    } else if (page.kind === "unreachable") {
      const outcome = await applyVerdict(
        db,
        job.id,
        { status: "unreachable", confidence: "low", notes: page.reason },
        "deterministic",
        false,
      );
      result.deterministic[outcome] = (result.deterministic[outcome] ?? 0) + 1;
    } else {
      batchRequests.push({
        custom_id: job.id,
        params: {
          model: REVIEW_MODEL,
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          output_config: { format: { type: "json_schema", schema: VERDICT_SCHEMA } },
          messages: [
            {
              role: "user",
              content: `Job on our board: "${job.title}" at "${job.company}".\n\nLive apply page text:\n${page.text}`,
            },
          ],
        },
      });
    }
  }

  if (batchRequests.length === 0) return;

  const res = await fetch(`${ANTHROPIC_BASE}/messages/batches`, {
    method: "POST",
    headers: anthropicHeaders(env),
    body: JSON.stringify({ requests: batchRequests }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`batch submit failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const batch = (await res.json()) as { id: string };
  await db.insert(reviewBatches).values({
    batchId: batch.id,
    status: "in_progress",
    jobCount: batchRequests.length,
  });
  result.submitted = batchRequests.length;
}

// ---------------------------------------------------------------------------
// Poll step
// ---------------------------------------------------------------------------

async function pollBatches(env: Env, db: Db, result: ReviewCycleResult): Promise<number> {
  const inflight = await db
    .select()
    .from(reviewBatches)
    .where(eq(reviewBatches.status, "in_progress"));
  result.polled = inflight.length;

  for (const row of inflight) {
    const res = await fetch(`${ANTHROPIC_BASE}/messages/batches/${row.batchId}`, {
      headers: anthropicHeaders(env),
    });
    if (!res.ok) {
      console.error(`review poll failed for ${row.batchId}: ${res.status}`);
      continue;
    }
    const batch = (await res.json()) as {
      processing_status: string;
      results_url?: string;
    };
    if (batch.processing_status !== "ended") continue;

    // Fetch JSONL results.
    const resultsRes = await fetch(`${ANTHROPIC_BASE}/messages/batches/${row.batchId}/results`, {
      headers: anthropicHeaders(env),
    });
    if (!resultsRes.ok) {
      console.error(`review results fetch failed for ${row.batchId}: ${resultsRes.status}`);
      continue;
    }
    const jsonl = await resultsRes.text();
    const lines = jsonl.split("\n").filter((l) => l.trim());

    type Entry = { jobId: string; verdict: ReviewVerdict };
    const entries: Entry[] = [];
    const usage = { input_tokens: 0, output_tokens: 0 };
    let errored = 0;

    for (const line of lines) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: any = JSON.parse(line);
        if (parsed.result?.type !== "succeeded") {
          errored++;
          continue;
        }
        const message = parsed.result.message;
        usage.input_tokens += message.usage?.input_tokens ?? 0;
        usage.output_tokens += message.usage?.output_tokens ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textBlock = (message.content as any[]).find((b) => b.type === "text");
        if (!textBlock) {
          errored++;
          continue;
        }
        const verdict = JSON.parse(textBlock.text) as ReviewVerdict;
        entries.push({ jobId: parsed.custom_id, verdict });
      } catch {
        errored++;
      }
    }

    // Mass-expiry guard: if the model claims a huge share of the shard is
    // dead, don't trust auto-expire this round.
    const deadCount = entries.filter(
      (e) => e.verdict.status === "filled_or_closed" || e.verdict.status === "redirect_not_a_job",
    ).length;
    const allowExpire = entries.length > 0 && deadCount / entries.length <= MASS_EXPIRE_GUARD;

    const counts: Record<string, number> = { errored };
    for (const entry of entries) {
      const outcome = await applyVerdict(db, entry.jobId, entry.verdict, "ai", allowExpire);
      counts[outcome] = (counts[outcome] ?? 0) + 1;
      result.verdictsApplied[outcome] = (result.verdictsApplied[outcome] ?? 0) + 1;
    }
    if (!allowExpire && deadCount > 0) counts.mass_expire_guard_tripped = 1;

    await db
      .update(reviewBatches)
      .set({ status: "ended", completedAt: new Date(), usage, results: counts })
      .where(eq(reviewBatches.batchId, row.batchId));
    result.batchesCompleted++;
  }

  return inflight.filter((r) => r.status === "in_progress").length;
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

export async function runReviewCycle(env: Env): Promise<ReviewCycleResult> {
  const result: ReviewCycleResult = {
    polled: 0,
    batchesCompleted: 0,
    verdictsApplied: {},
    submitted: 0,
    deterministic: {},
  };
  if (!env.ANTHROPIC_API_KEY) {
    result.skippedReason = "no_api_key";
    console.warn("jobs-review: ANTHROPIC_API_KEY not set — skipping cycle");
    return result;
  }

  const db = createDb(env);
  await pollBatches(env, db, result);

  const [{ n: stillInflight }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviewBatches)
    .where(eq(reviewBatches.status, "in_progress"));
  if (stillInflight >= MAX_INFLIGHT_BATCHES) {
    result.skippedReason = "max_inflight";
    return result;
  }

  await submitShard(env, db, result);
  return result;
}

export async function reviewStatus(env: Env): Promise<Record<string, unknown>> {
  const db = createDb(env);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const inflight = await db
    .select()
    .from(reviewBatches)
    .where(eq(reviewBatches.status, "in_progress"));

  const recentBatches = await db
    .select()
    .from(reviewBatches)
    .where(gte(reviewBatches.submittedAt, dayAgo));

  const [reviewedDay] = await db
    .select({
      total: sql<number>`count(*) filter (where ${jobPostings.reviewedAt} >= ${dayAgo})::int`,
      flagged: sql<number>`count(*) filter (where ${jobPostings.status} = 'active' and (${jobPostings.review}->>'flagged')::boolean)::int`,
      noDegree: sql<number>`count(*) filter (where ${jobPostings.status} = 'active' and ${jobPostings.review}->>'degree_required' in ('not_required','equivalent_accepted'))::int`,
    })
    .from(jobPostings);

  const usage = recentBatches.reduce(
    (acc, b) => {
      acc.input += (b.usage as Record<string, number>)?.input_tokens ?? 0;
      acc.output += (b.usage as Record<string, number>)?.output_tokens ?? 0;
      return acc;
    },
    { input: 0, output: 0 },
  );
  // Haiku 4.5 batch pricing: $0.50 / $2.50 per MTok.
  const estCostUsd =
    (usage.input / 1_000_000) * 0.5 + (usage.output / 1_000_000) * 2.5;

  const expiredByReview = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.status, "expired"),
        gte(jobPostings.reviewedAt, dayAgo),
        sql`${jobPostings.review}->>'status' in ('filled_or_closed','redirect_not_a_job')`,
      ),
    );

  return {
    inflight_batches: inflight.map((b) => ({
      batch_id: b.batchId,
      job_count: b.jobCount,
      submitted_at: b.submittedAt,
    })),
    last_24h: {
      reviewed: reviewedDay?.total ?? 0,
      auto_expired: expiredByReview[0]?.n ?? 0,
      flagged_active: reviewedDay?.flagged ?? 0,
      batches: recentBatches.length,
      tokens: usage,
      est_cost_usd: Math.round(estCostUsd * 100) / 100,
    },
    active_no_degree: reviewedDay?.noDegree ?? 0,
  };
}
