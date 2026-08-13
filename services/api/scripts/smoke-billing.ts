/**
 * P1b smoke — billing, and the thing it exists for: DMs actually working.
 *
 * Runs against the local worker with a test webhook secret. No Stripe account
 * or network call is involved: we sign events ourselves exactly as Stripe does,
 * which is the only part of the integration whose correctness we control.
 *
 * Defended here:
 *   - unsigned / wrong-secret / stale-timestamp webhooks are refused;
 *   - a verified webhook is the ONLY thing that grants a tier;
 *   - replays are no-ops (Stripe retries are normal, not exceptional);
 *   - an unknown price grants nothing rather than defaulting to paid;
 *   - cancellation revokes the capability;
 *   - and, end to end: free member blocked from DMs → webhook → DM allowed.
 *
 *   npx tsx scripts/smoke-billing.ts
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

/**
 * Read config from .dev.vars — the same file `wrangler dev` feeds the worker.
 *
 * The secret and price id here must match what the worker verifies against, or
 * every signed event is refused and the smoke fails for a reason that has
 * nothing to do with the code under test. Reading one file keeps them in step
 * once real Stripe test values replace the placeholders. Explicit environment
 * variables still win, so CI can override without editing the file.
 */
function loadDevVars(path = new URL("../.dev.vars", import.meta.url)) {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return; // absent in CI — env vars or the defaults below cover it
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDevVars();

const API = "http://localhost:8788/v1";
const TAG = "bill-smoke";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret";
const PRICE_MONTHLY = process.env.STRIPE_PRICE_CLUB_MONTHLY || "price_test_monthly";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}

function signed(payload: object, opts: { secret?: string; timestamp?: number } = {}) {
  const body = JSON.stringify(payload);
  const t = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", opts.secret ?? SECRET).update(`${t}.${body}`).digest("hex");
  return { body, header: `t=${t},v1=${v1}` };
}

const post = (body: string, header: string | null) =>
  fetch(`${API}/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(header ? { "stripe-signature": header } : {}) },
    body,
  });

let eventSeq = 0;
function subscriptionEvent(userId: string, opts: { price?: string; status?: string; type?: string } = {}) {
  eventSeq += 1;
  return {
    id: `evt_${TAG}_${Date.now()}_${eventSeq}`,
    type: opts.type ?? "customer.subscription.updated",
    data: {
      object: {
        id: `sub_${TAG}_${userId.slice(0, 8)}`,
        status: opts.status ?? "active",
        customer: `cus_${TAG}_${userId.slice(0, 8)}`,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        items: { data: [{ price: { id: opts.price ?? PRICE_MONTHLY } }] },
        metadata: { user_id: userId },
      },
    },
  };
}

async function member(slug: string) {
  const email = `${TAG}-${slug}@atlantium.test`;
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
  });
  const [v] = await sql`select value from verification where identifier = ${"sign-in-otp-" + email} order by created_at desc limit 1` as any[];
  const res = await fetch(`${API}/auth/verify`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code: String(v.value).split(":")[0] }),
  });
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  const [row] = await sql`select p.id as profile_id, u.id as user_id from profiles p
    join "user" u on u.id = p.owner_user_id where u.email = ${email}` as any[];
  await sql`insert into member_roles (profile_id, role, source, is_primary, confirmed_at)
            values (${row.profile_id}, 'professional', 'self_declared', true, now())
            on conflict do nothing`;
  return { email, cookie, profileId: row.profile_id, userId: row.user_id };
}

async function cleanup() {
  await sql`delete from "user" where email like ${TAG + "%"}`;
  await sql`delete from billing_events where id like ${"evt_" + TAG + "%"}`;
}

async function main() {
  await cleanup();
  const buyer = await member("buyer");
  const other = await member("other");
  const H = { "content-type": "application/json", cookie: buyer.cookie };

  // The point of the whole phase: before billing, outreach is inert.
  const before = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H,
    body: JSON.stringify({ profile_id: other.profileId, purpose: "peer", body: "hi" }),
  });
  const beforeBody = await before.json() as any;
  check("BEFORE: free member cannot DM", before.status === 403 && beforeBody.code === "upgrade_required",
    `status=${before.status} code=${beforeBody.code}`);

  // ── signature enforcement ────────────────────────────────────────────────
  const evt = subscriptionEvent(buyer.userId);
  const unsigned = await post(JSON.stringify(evt), null);
  check("unsigned webhook refused", unsigned.status === 400, `status=${unsigned.status}`);

  const wrong = signed(subscriptionEvent(buyer.userId), { secret: "whsec_wrong" });
  const wrongRes = await post(wrong.body, wrong.header);
  check("wrong-secret webhook refused", wrongRes.status === 400, `status=${wrongRes.status}`);

  const stale = signed(subscriptionEvent(buyer.userId), { timestamp: Math.floor(Date.now() / 1000) - 3600 });
  const staleRes = await post(stale.body, stale.header);
  check("stale timestamp refused (replay window)", staleRes.status === 400, `status=${staleRes.status}`);

  const [stillFree] = await sql`select membership_tier from memberships where user_id = ${buyer.userId}` as any[];
  check("no refused webhook granted anything", !stillFree, `row=${stillFree?.membership_tier ?? "none"}`);

  // ── an unknown price must not grant a tier ───────────────────────────────
  const bogus = signed(subscriptionEvent(buyer.userId, { price: "price_not_ours" }));
  await post(bogus.body, bogus.header);
  const [afterBogus] = await sql`select membership_tier from memberships where user_id = ${buyer.userId}` as any[];
  check("unknown price grants nothing", afterBogus?.membership_tier === "free", `tier=${afterBogus?.membership_tier}`);

  // ── the real thing ───────────────────────────────────────────────────────
  const good = signed(subscriptionEvent(buyer.userId));
  const goodRes = await post(good.body, good.header);
  check("valid webhook accepted", goodRes.status === 200, `status=${goodRes.status}`);

  const status = await (await fetch(`${API}/billing/status`, { headers: H })).json() as any;
  check("tier applied from the subscription", status.tier === "club", `tier=${status.tier}`);
  check("dm.send entitlement granted", status.entitlements?.includes("dm.send"),
    JSON.stringify(status.entitlements));

  const replay = await post(good.body, good.header);
  const replayBody = await replay.json() as any;
  check("replayed event is a no-op", replay.status === 200 && replayBody.duplicate === true,
    `duplicate=${replayBody.duplicate}`);

  // ── AFTER: the capability is real ────────────────────────────────────────
  const after = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H,
    body: JSON.stringify({ profile_id: other.profileId, purpose: "peer", body: "hi" }),
  });
  const afterBody = await after.json() as any;
  check("AFTER: paid member CAN DM", after.status === 200 && afterBody.request_id,
    `status=${after.status}`);

  // ── cancellation revokes it ──────────────────────────────────────────────
  const cancelled = signed(subscriptionEvent(buyer.userId, { type: "customer.subscription.deleted", status: "canceled" }));
  await post(cancelled.body, cancelled.header);
  const afterCancel = await (await fetch(`${API}/billing/status`, { headers: H })).json() as any;
  check("cancellation drops the tier", afterCancel.tier === "free", `tier=${afterCancel.tier}`);
  check("...and revokes dm.send", !afterCancel.entitlements?.includes("dm.send"),
    JSON.stringify(afterCancel.entitlements));

  // ── comps: capability without a subscription (execution plan R6) ─────────
  const comped = await member("comped");
  const compTarget = await member("comp-target");
  const Hc = { "content-type": "application/json", cookie: comped.cookie };

  const beforeComp = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: Hc,
    body: JSON.stringify({ profile_id: compTarget.profileId, purpose: "peer", body: "hi" }),
  });
  check("comp target starts unable to DM", beforeComp.status === 403, `status=${beforeComp.status}`);

  await sql`insert into entitlement_grants (user_id, entitlement, reason, expires_at)
            values (${comped.userId}, 'dm.send', 'smoke comp', now() + interval '180 days')`;
  const afterComp = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: Hc,
    body: JSON.stringify({ profile_id: compTarget.profileId, purpose: "peer", body: "hi" }),
  });
  check("a comp grants dm.send without any subscription", afterComp.status === 200, `status=${afterComp.status}`);

  const compStatus = await (await fetch(`${API}/billing/status`, { headers: Hc })).json() as any;
  check("...and the member is still tier=free (revenue stays honest)",
    compStatus.tier === "free" && compStatus.entitlements.includes("dm.send"),
    `tier=${compStatus.tier}`);

  await sql`update entitlement_grants set expires_at = now() - interval '1 day' where user_id = ${comped.userId}`;
  const expired = await (await fetch(`${API}/billing/status`, { headers: Hc })).json() as any;
  check("an expired comp stops granting", !expired.entitlements.includes("dm.send"),
    JSON.stringify(expired.entitlements));

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
