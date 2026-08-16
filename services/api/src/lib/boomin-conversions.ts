/**
 * Conversion forwarding (plan Part B, B3) — the gmv side of the referral loop.
 *
 * A paid event (Club subscription invoice, training tuition) forwards onto the
 * Boomin relationship the user's `referred_by_code` names. First-touch: the
 * code is persisted once at first verify and never overwritten; NULL = organic
 * and nothing forwards.
 *
 * Idempotent end-to-end: the eventId derives from the BILLING record
 * (`atlantium_purchase_<invoice|session id>`), and Boomin dedupes on
 * (program, source, event_id) — so a Stripe redelivery, our own retry, or a
 * replayed webhook can never double-count. Rides the signed Connect events
 * surface (issuer + HANDOFF_SIGNING_SECRET) — no platform key involved, and
 * gating is per-user by the referral code: an organic user simply has nothing
 * to forward. Never throws — forwarding is best-effort off the webhook path.
 */

import { eq } from "drizzle-orm";
import { recordConversion } from "@boomin/server";
import type { Db } from "../db/client";
import { user } from "../db/schema";
import type { Env } from "../env";

export const CONVERSION_ISSUER = "atlantium.ai";

export interface ForwardConversionInput {
  userId: string;
  /** Minor units (Stripe's amount_paid / amount_total). */
  amountCents: number;
  /** Stable id derived from the billing record: `atlantium_purchase_<id>`. */
  eventId: string;
  eventType?: string;
  currency?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ForwardConversionResult {
  forwarded: boolean;
  reason?: "no_referral" | "no_user" | "no_secret" | "zero_amount" | "error";
}

export async function forwardConversion(db: Db, env: Env, input: ForwardConversionInput): Promise<ForwardConversionResult> {
  try {
    if (!env.HANDOFF_SIGNING_SECRET) return { forwarded: false, reason: "no_secret" };
    if (!input.amountCents || input.amountCents <= 0) return { forwarded: false, reason: "zero_amount" };
    const [row] = await db
      .select({ referredByCode: user.referredByCode })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1);
    if (!row) return { forwarded: false, reason: "no_user" };
    if (!row.referredByCode) return { forwarded: false, reason: "no_referral" };

    await recordConversion({
      issuer: CONVERSION_ISSUER,
      signingSecret: env.HANDOFF_SIGNING_SECRET,
      publicKey: env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
      apiBase: (env.BOOMIN_CONNECT_API_BASE || "https://api.boomin.ai/v1/connect").replace(/\/+$/, ""),
      referralCode: row.referredByCode,
      eventId: input.eventId,
      eventType: input.eventType ?? "purchase",
      amountCents: Math.round(input.amountCents),
      currency: input.currency ?? "usd",
      metadata: {
        source: "atlantium_billing",
        atlantiumUserId: input.userId,
        ...(input.metadata ?? {}),
      },
    });
    return { forwarded: true };
  } catch (error) {
    // Unknown/stale code, Boomin outage — the purchase stands either way, and
    // Stripe's own retries + Boomin's dedupe make later redelivery safe.
    console.error("boomin conversion forward failed", {
      userId: input.userId,
      eventId: input.eventId,
      message: (error as Error).message,
    });
    return { forwarded: false, reason: "error" };
  }
}
