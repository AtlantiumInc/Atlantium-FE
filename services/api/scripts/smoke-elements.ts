/**
 * P1b smoke — embedded subscriptions (Stripe Elements).
 *
 * Exercises the real Stripe test API: SetupIntent, a real PaymentMethod, the
 * subscription, and the webhook that actually grants the tier.
 *
 *   set -a; source .dev.vars; set +a
 *   DATABASE_URL=... npx tsx scripts/smoke-elements.ts     (worker on :8788)
 */
import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const sql = neon(process.env.DATABASE_URL!);
const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const PRICE = process.env.STRIPE_PRICE_CLUB_MONTHLY!;

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
  ok ? pass++ : fail++;
};

async function main() {
  const email = "elements-smoke@atlantium.test";
  await sql`delete from "user" where lower(email)=${email}`;
  await fetch(`${API}/auth/otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  const [v] = await sql`select value from verification where identifier=${"sign-in-otp-" + email} order by created_at desc limit 1` as any[];
  const r = await fetch(`${API}/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: String(v.value).split(":")[0] }) });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  const H = { "content-type": "application/json", cookie };
  const [u] = await sql`select id from "user" where lower(email)=${email}` as any[];

  const cfg = await (await fetch(`${API}/billing/config`, { headers: H })).json() as any;
  check("publishable key served", String(cfg.publishable_key).startsWith("pk_"), String(cfg.publishable_key).slice(0, 12) + "…");

  const si = await (await fetch(`${API}/billing/setup-intent`, { method: "POST", headers: H })).json() as any;
  check("SetupIntent created", String(si.client_secret).startsWith("seti_"));

  const [m] = await sql`select stripe_customer_id from memberships mm join "user" uu on uu.id=mm.user_id where uu.email=${email}` as any[];
  check("customer persisted BEFORE payment (no duplicates on abandon)", Boolean(m?.stripe_customer_id));

  // The same object shape confirmSetup returns in the browser.
  const pmRes = await fetch("https://api.stripe.com/v1/payment_methods", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ type: "card", "card[token]": "tok_visa" }),
  });
  const pm = await pmRes.json() as any;
  check("test payment method created", pmRes.status === 200, pm.id);

  const bad = await fetch(`${API}/billing/subscribe`, { method: "POST", headers: H, body: JSON.stringify({ plan: "club", payment_method_id: "pm_nope" }) });
  const badBody = await bad.json() as any;
  check("unusable card refused as 400, with Stripe's wording", bad.status === 400 && badBody.code === "payment_failed", `status=${bad.status}`);

  const sub = await fetch(`${API}/billing/subscribe`, { method: "POST", headers: H, body: JSON.stringify({ plan: "club", payment_method_id: pm.id }) });
  const subBody = await sub.json() as any;
  check("subscription created", sub.status === 200 && subBody.active, `status=${sub.status}`);

  const before = await (await fetch(`${API}/billing/status`, { headers: H })).json() as any;
  check("tier still free until the webhook lands", before.tier === "free", `tier=${before.tier}`);

  const evt = { id: `evt_elements_${Date.now()}`, type: "customer.subscription.created", data: { object: {
    id: subBody.subscription_id, status: "active", customer: "cus_smoke",
    current_period_end: Math.floor(Date.now() / 1000) + 2592000,
    items: { data: [{ price: { id: PRICE } }] }, metadata: { user_id: u.id },
  } } };
  const body = JSON.stringify(evt); const t = Math.floor(Date.now() / 1000);
  const sig = `t=${t},v1=${createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex")}`;
  const hook = await fetch(`${API}/billing/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": sig }, body });
  check("webhook accepted", hook.status === 200);

  const after = await (await fetch(`${API}/billing/status`, { headers: H })).json() as any;
  check("tier becomes club", after.tier === "club", `tier=${after.tier}`);
  check("dm.send granted", after.entitlements.includes("dm.send"));

  const dupe = await fetch(`${API}/billing/subscribe`, { method: "POST", headers: H, body: JSON.stringify({ plan: "club", payment_method_id: pm.id }) });
  check("double-subscribe refused", dupe.status === 409, `status=${dupe.status}`);

  await sql`delete from "user" where lower(email)=${email}`;
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}
main();
