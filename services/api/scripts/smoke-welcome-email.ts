/**
 * The founder's welcome — sent once, at first onboarding completion.
 *
 * What matters: it fires on the null→set transition of onboarding completion,
 * it carries the member's own answers (persona branch, headline, needs), and
 * it NEVER fires twice — not on a profile re-save, and not on a second pass
 * after an admin questionnaire reset.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-welcome-email.ts    (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "welcome-smoke";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
  ok ? pass++ : fail++;
};

async function signup(slug: string) {
  const email = `${TAG}-${slug}@atlantium.test`;
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  const [v] = await sql`select value from verification where identifier = ${"sign-in-otp-" + email} order by created_at desc limit 1` as any[];
  const res = await fetch(`${API}/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: String(v.value).split(":")[0] }) });
  return { email, cookie: (res.headers.get("set-cookie") || "").split(";")[0] };
}

const completeBody = (extra: Record<string, unknown> = {}) => JSON.stringify({
  profile: {
    first_name: "Welcome", last_name: "Smoke",
    registration_details: {
      is_completed: true,
      branch: "founder",
      headline: "Building a robotics co in Atlanta",
      needs: ["customers", "capital"],
      ...extra,
    },
  },
});

const flag = async (email: string) => {
  const [row] = await sql`select p.metadata->'welcome_email' as w from profiles p
    join "user" u on u.id = p.owner_user_id where u.email = ${email}` as any[];
  return row?.w ?? null;
};

async function main() {
  await sql`delete from "user" where email like ${TAG + "%"}`;

  const m = await signup("founder");
  const H = { "content-type": "application/json", cookie: m.cookie };

  const before = await flag(m.email);
  check("no welcome before completion", before === null);

  const complete = await fetch(`${API}/profile/edit`, { method: "POST", headers: H, body: completeBody() });
  check("onboarding completes", complete.status === 200, `status=${complete.status}`);

  // The send runs post-response via waitUntil; give it a beat.
  await new Promise((r) => setTimeout(r, 2500));
  const after = await flag(m.email);
  check("welcome recorded at first completion", after !== null, JSON.stringify(after)?.slice(0, 70));
  const firstAt = after?.at;

  // Re-saving the profile must not re-send.
  await fetch(`${API}/profile/edit`, { method: "POST", headers: H, body: completeBody({ headline: "edited later" }) });
  await new Promise((r) => setTimeout(r, 1500));
  const again = await flag(m.email);
  check("a profile re-save doesn't re-welcome", again?.at === firstAt, `${again?.at} vs ${firstAt}`);

  // Admin reset clears completion; the second pass through the questionnaire
  // must ALSO not re-welcome — the metadata flag is the guard, not the column.
  const [u] = await sql`select id from "user" where email = ${m.email}` as any[];
  await sql`update profiles set onboarding_completed_at = null,
    registration_details = registration_details || '{"is_completed": false}'::jsonb
    where owner_user_id = ${u.id}`;
  await fetch(`${API}/profile/edit`, { method: "POST", headers: H, body: completeBody() });
  await new Promise((r) => setTimeout(r, 1500));
  const postReset = await flag(m.email);
  check("re-completing after an admin reset doesn't re-welcome", postReset?.at === firstAt);

  await sql`delete from "user" where email like ${TAG + "%"}`;
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); process.exit(1); });
