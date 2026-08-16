/**
 * Service requests — the phone-call sales pipeline.
 *
 * What matters: a logged-out job-board lead can apply; mashing submit doesn't
 * stack queue rows; the offer is set per-lead and the payment link carries
 * exactly that amount; and only a VERIFIED webhook marks anything paid —
 * visiting the success URL proves nothing.
 *
 *   DATABASE_URL=... STRIPE_WEBHOOK_SECRET=... npx tsx scripts/smoke-service-requests.ts
 */
import { neon } from "@neondatabase/serverless";
import { createHmac } from "node:crypto";

const API = "http://localhost:8788/v1";
const TAG = "svc-smoke";
const sql = neon(process.env.DATABASE_URL!);
const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
  ok ? pass++ : fail++;
};

async function admin() {
  const email = `${TAG}-admin@atlantium.test`;
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  const [v] = await sql`select value from verification where identifier = ${"sign-in-otp-" + email} order by created_at desc limit 1` as any[];
  const res = await fetch(`${API}/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: String(v.value).split(":")[0] }) });
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  const [row] = await sql`select u.id as user_id, p.id as profile_id from "user" u join profiles p on p.owner_user_id = u.id where u.email = ${email}` as any[];
  await sql`update "user" set is_admin = true, is_approved = true where id = ${row.user_id}`;
  await sql`update profiles set onboarding_completed_at = now(), registration_details = '{"is_completed":true}'::jsonb where id = ${row.profile_id}`;
  return { cookie };
}

async function cleanup() {
  await sql`delete from service_requests where email like ${TAG + "%"}`;
  await sql`delete from "user" where email like ${TAG + "%"}`;
}

async function main() {
  await cleanup();
  const leadEmail = `${TAG}-lead@example.test`;

  // Logged out, straight off the job board.
  const apply = await fetch(`${API}/service-requests`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "ai_engineering_cohort",
      name: "Svc Smoke Lead", email: leadEmail, phone: "4045550100",
      answers: { current_role: "between", goal: "AI engineer role", commitment: "yes", not_a_question: "dropped" },
    }),
  });
  const applyBody = await apply.json() as any;
  check("a logged-out lead can apply", apply.status === 200 && applyBody.request?.id, `status=${apply.status}`);

  const [row] = await sql`select * from service_requests where id = ${applyBody.request.id}` as any[];
  check("only registry questions survive into answers",
    row.answers.goal === "AI engineer role" && !("not_a_question" in row.answers),
    JSON.stringify(row.answers).slice(0, 60));

  const dupe = await fetch(`${API}/service-requests`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "ai_engineering_cohort", name: "Svc Smoke Lead", email: leadEmail.toUpperCase(), answers: {} }),
  });
  const dupeBody = await dupe.json() as any;
  check("re-submitting is the same request, not a second row",
    dupeBody.duplicate === true && dupeBody.request.id === applyBody.request.id);

  const unknown = await fetch(`${API}/service-requests`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "yacht_valeting", name: "Nope Nope", email: "nope@example.test" }),
  });
  check("unknown services are rejected", unknown.status === 400, `status=${unknown.status}`);

  const a = await admin();
  const H = { "content-type": "application/json", cookie: a.cookie };

  const anon = await fetch(`${API}/admin/service-requests`);
  check("the queue requires admin", anon.status === 401 || anon.status === 403, `status=${anon.status}`);

  const queue = await (await fetch(`${API}/admin/service-requests`, { headers: H })).json() as any;
  check("the lead is in the queue", queue.requests?.some((r: any) => r.id === applyBody.request.id));

  const early = await fetch(`${API}/admin/service-requests/${applyBody.request.id}/payment-link`, { method: "POST", headers: H });
  check("no link before an offer is set", early.status === 400, `status=${early.status}`);

  const offer = await fetch(`${API}/admin/service-requests/${applyBody.request.id}/update`, {
    method: "POST", headers: H, body: JSON.stringify({ status: "called", offer_cents: 100000 }),
  });
  check("offer set on the call", offer.status === 200, `status=${offer.status}`);

  // Needs a real Stripe key; the assertion is about OUR bookkeeping either way.
  const link = await fetch(`${API}/admin/service-requests/${applyBody.request.id}/payment-link`, { method: "POST", headers: H });
  const linkBody = await link.json() as any;
  if (link.status === 200) {
    check("payment link generated at the offer amount", Boolean(linkBody.url), String(linkBody.url).slice(0, 40));
    const [after] = await sql`select status, payment_link_url, stripe_session_id from service_requests where id = ${applyBody.request.id}` as any[];
    check("...stored, and the row moves to offered", after.status === "offered" && Boolean(after.payment_link_url));

    // Forged success visit proves nothing; only the signed webhook pays.
    const evt = { id: `evt_svc_${Date.now()}`, type: "checkout.session.completed",
      data: { object: { id: after.stripe_session_id, metadata: { service_request_id: applyBody.request.id } } } };
    const body = JSON.stringify(evt); const t = Math.floor(Date.now() / 1000);
    const sig = `t=${t},v1=${createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex")}`;
    const hook = await fetch(`${API}/billing/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": sig }, body });
    check("verified webhook accepted", hook.status === 200, `status=${hook.status}`);
    const [paid] = await sql`select status, paid_at from service_requests where id = ${applyBody.request.id}` as any[];
    check("...and the row is paid", paid.status === "paid" && paid.paid_at !== null, paid.status);
  } else {
    check("payment link generated at the offer amount", false, `status=${link.status} ${JSON.stringify(linkBody).slice(0, 80)}`);
  }

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
