/**
 * Branch answers from onboarding.
 *
 * The questionnaire now forks by persona, and each fork's answers have to land
 * somewhere queryable — an investor's intro appetite gates the curation queue,
 * an advisor's availability gates who may reach them. The thing worth proving
 * is that they land in COLUMNS, and that a role can't write another persona's
 * fields: employment is not authority, and neither is answering a question.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-role-details.ts     (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "details-smoke";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
  ok ? pass++ : fail++;
};

async function member(slug: string) {
  const email = `${TAG}-${slug}@atlantium.test`;
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const [v] = await sql`select value from verification where identifier = ${"sign-in-otp-" + email}
                        order by created_at desc limit 1` as any[];
  const res = await fetch(`${API}/auth/verify`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code: String(v.value).split(":")[0] }),
  });
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  const [row] = await sql`select p.id as profile_id, u.id as user_id from profiles p
                          join "user" u on u.id = p.owner_user_id where u.email = ${email}` as any[];
  await sql`update "user" set is_approved = true where id = ${row.user_id}`;
  await sql`update profiles set onboarding_completed_at = now(),
            registration_details = '{"is_completed":true}'::jsonb where id = ${row.profile_id}`;
  return { cookie, profileId: row.profile_id };
}

const H = (m: { cookie: string }) => ({ "content-type": "application/json", cookie: m.cookie });

async function roleFor(m: { cookie: string }, role: string) {
  const res = await fetch(`${API}/me/roles`, {
    method: "POST", headers: H(m), body: JSON.stringify({ role, is_primary: true }),
  });
  const body = await res.json() as any;
  return body.roles?.find((r: any) => r.role === role);
}

const cleanup = () => sql`delete from "user" where email like ${TAG + "%"}`;

async function main() {
  await cleanup();

  // ── founder ──────────────────────────────────────────────────────────────
  const founder = await member("founder");
  const founderRole = await roleFor(founder, "founder");
  const f = await fetch(`${API}/me/roles/${founderRole.id}/details`, {
    method: "PATCH", headers: H(founder),
    body: JSON.stringify({ venture_stage: "revenue", needs: ["customers", "hires"] }),
  });
  check("founder stores stage + needs", f.status === 200, `status=${f.status}`);
  const [fRow] = await sql`select venture_stage, needs from role_details where role_id = ${founderRole.id}` as any[];
  check("...as columns, not a blob",
    fRow?.venture_stage === "revenue" && fRow?.needs?.length === 2,
    `${fRow?.venture_stage} / ${JSON.stringify(fRow?.needs)}`);

  // ── investor ─────────────────────────────────────────────────────────────
  const investor = await member("investor");
  const investorRole = await roleFor(investor, "investor");
  const i = await fetch(`${API}/me/roles/${investorRole.id}/details`, {
    method: "PATCH", headers: H(investor),
    body: JSON.stringify({
      check_min: 25000, check_max: 100000,
      focus_stages: ["pre_seed", "seed"], intro_appetite: "some",
    }),
  });
  check("investor stores check band + appetite", i.status === 200, `status=${i.status}`);

  const backwards = await fetch(`${API}/me/roles/${investorRole.id}/details`, {
    method: "PATCH", headers: H(investor),
    body: JSON.stringify({ check_min: 500000, check_max: 1000 }),
  });
  check("a backwards check band is rejected", backwards.status === 400, `status=${backwards.status}`);

  // The queue's whole reason for having an index.
  const wanted = await sql`select count(*)::int as n from role_details
                           where intro_appetite <> 'none' and role_id = ${investorRole.id}` as any[];
  check("the curation queue can find who wants intros", wanted[0].n === 1);

  // ── advisor ──────────────────────────────────────────────────────────────
  const advisor = await member("advisor");
  const advisorRole = await roleFor(advisor, "advisor");
  await fetch(`${API}/me/roles/${advisorRole.id}/details`, {
    method: "PATCH", headers: H(advisor),
    body: JSON.stringify({ domains: ["gtm", "hiring"], availability: "intro_only" }),
  });
  const [aRow] = await sql`select availability, domains from role_details where role_id = ${advisorRole.id}` as any[];
  check("advisor availability is a column that can gate outreach",
    aRow?.availability === "intro_only", aRow?.availability);

  // ── the boundary that matters ────────────────────────────────────────────
  const crossed = await fetch(`${API}/me/roles/${investorRole.id}/details`, {
    method: "PATCH", headers: H(investor),
    body: JSON.stringify({ availability: "open" }),
  });
  const crossedBody = await crossed.json() as any;
  check("an investor can't set an advisor's availability",
    crossed.status === 400 && crossedBody.code === "wrong_role",
    `${crossed.status} ${crossedBody.code}`);

  const notMine = await fetch(`${API}/me/roles/${advisorRole.id}/details`, {
    method: "PATCH", headers: H(investor),
    body: JSON.stringify({ availability: "open" }),
  });
  check("nobody can write someone else's role", notMine.status === 404, `status=${notMine.status}`);

  // ── recruiter: a professional, not a fifth persona ───────────────────────
  const recruiter = await member("recruiter");
  const proRole = await roleFor(recruiter, "professional");
  const r = await fetch(`${API}/me/roles/${proRole.id}/details`, {
    method: "PATCH", headers: H(recruiter),
    body: JSON.stringify({ hiring_roles: ["Staff engineer", "Designer"], hiring_contact: "matched" }),
  });
  check("a hiring professional stores open roles", r.status === 200, `status=${r.status}`);
  const [rRow] = await sql`select hiring_roles from role_details where role_id = ${proRole.id}` as any[];
  check("...and the seeking row still exists alongside it",
    rRow?.hiring_roles?.length === 2 &&
      (await sql`select count(*)::int as n from professional_preferences where role_id = ${proRole.id}` as any[])[0].n === 1);

  // Re-answering must update, not duplicate or fail.
  await fetch(`${API}/me/roles/${founderRole.id}/details`, {
    method: "PATCH", headers: H(founder),
    body: JSON.stringify({ venture_stage: "raising" }),
  });
  const [again] = await sql`select venture_stage, needs from role_details where role_id = ${founderRole.id}` as any[];
  check("re-answering updates in place and keeps the rest",
    again?.venture_stage === "raising" && again?.needs?.length === 2,
    `${again?.venture_stage} / ${JSON.stringify(again?.needs)}`);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
