import type { Env } from "../env";

/**
 * Minimal Stripe client over the REST API.
 *
 * Direct fetch rather than the Node SDK: this runs on Workers, and the SDK's
 * default HTTP client assumes Node's http module. The surface we need is small
 * enough that the dependency isn't worth the shimming.
 *
 * Stripe is the source of truth for subscription state. `memberships` is a
 * projection of it, written only from verified webhooks — never optimistically
 * from a checkout redirect, which the user can forge by visiting the success
 * URL directly.
 */

const STRIPE_API = "https://api.stripe.com/v1";

function form(params: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.set(k, String(v));
  return body;
}

async function stripeRequest<T>(env: Env, path: string, body: URLSearchParams): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json() as T & { error?: { message?: string; code?: string } };
  if (!res.ok) {
    // A price id from the wrong Stripe account 404s as "No such price" — the
    // most common and most confusing misconfiguration here.
    throw new Error(`Stripe ${path} failed: ${json?.error?.message ?? res.status}`);
  }
  return json;
}

export type CheckoutSession = { id: string; url: string };

export async function createCheckoutSession(
  env: Env,
  input: {
    priceId: string;
    userId: string;
    email: string;
    customerId?: string | null;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>(env, "/checkout/sessions", form({
    mode: "subscription",
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": 1,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
    // client_reference_id survives the whole checkout and comes back on the
    // completed event, which is how we attribute a payment to a member without
    // trusting anything the browser sends us.
    client_reference_id: input.userId,
    "subscription_data[metadata][user_id]": input.userId,
    "metadata[user_id]": input.userId,
    allow_promotion_codes: true,
  }));
}

export async function createPortalSession(
  env: Env,
  input: { customerId: string; returnUrl: string },
): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>(env, "/billing_portal/sessions", form({
    customer: input.customerId,
    return_url: input.returnUrl,
  }));
}

export async function getSubscription(env: Env, subscriptionId: string) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  const res = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe subscription fetch failed: ${res.status}`);
  return res.json() as Promise<StripeSubscription>;
}

export type StripeSubscription = {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: Array<{ price?: { id?: string } }> };
  metadata?: Record<string, string>;
};

/** Constant-time compare — a fast-exit compare leaks the signature by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify Stripe's `Stripe-Signature` header against the RAW request body.
 *
 * Two things this must get right: the signed payload is `${timestamp}.${body}`
 * using the body exactly as sent (re-serializing JSON changes the bytes and
 * breaks the signature), and old timestamps are rejected so a captured request
 * can't be replayed later.
 */
export async function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
  now = Date.now(),
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!signatureHeader) return { ok: false, reason: "missing_signature" };

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const provided = parts.v1;
  if (!timestamp || !provided) return { ok: false, reason: "malformed_signature" };

  const age = Math.abs(now / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return { ok: false, reason: "timestamp_out_of_tolerance" };

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  if (!timingSafeEqual(expected, provided)) return { ok: false, reason: "signature_mismatch" };
  return { ok: true };
}

/** Which tier a Stripe price grants. Unknown prices grant nothing. */
export function tierForPrice(env: Env, priceId: string | undefined | null): "club" | "club_annual" | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_CLUB_MONTHLY) return "club";
  if (priceId === env.STRIPE_PRICE_CLUB_ANNUAL) return "club_annual";
  return null;
}

/** Stripe statuses that keep a membership's capabilities alive. */
export function normalizeStatus(status: string): "active" | "trialing" | "past_due" | "canceled" | "incomplete" {
  switch (status) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "canceled":
    case "unpaid": return "canceled";
    default: return "incomplete";
  }
}
