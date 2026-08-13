/**
 * P0B smoke — work-email verification and the employment/authority boundary.
 *
 * The rules being defended (plan §4.3, §4.4):
 *   - a personal address proves nothing;
 *   - a domain yields a CANDIDATE SET, never a canonical owner;
 *   - success grants `employee` with authority `none` — never the right to
 *     speak for the company;
 *   - codes expire, are attempt-limited, and are single-use.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-work-email.ts     (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "we-smoke";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}

async function signIn(email: string) {
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const [v] = await sql`select value from verification where identifier = ${"sign-in-otp-" + email} order by created_at desc limit 1` as any[];
  const res = await fetch(`${API}/auth/verify`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code: String(v.value).split(":")[0] }),
  });
  return (res.headers.get("set-cookie") || "").split(";")[0];
}

async function cleanup() {
  await sql`delete from "user" where email like ${TAG + "%"}`;
  await sql`delete from directory_entries where slug like ${TAG + "%"}`;
}

async function main() {
  await cleanup();

  // Two orgs sharing one corporate domain — the case a UNIQUE(domain) index
  // would have silently resolved to a single "owner".
  const [parent] = await sql`
    insert into directory_entries (kind, slug, name, website)
    values ('company', ${TAG + "-parent"}, 'WE Smoke Parent', 'https://we-smoke-shared.test')
    returning id, name` as any[];
  const [sub] = await sql`
    insert into directory_entries (kind, slug, name)
    values ('company', ${TAG + "-sub"}, 'WE Smoke Subsidiary')
    returning id, name` as any[];
  for (const org of [parent, sub]) {
    await sql`insert into org_domains (entry_id, domain) values (${org.id}, 'we-smoke-shared.test')`;
  }

  const email = `${TAG}-member@atlantium.test`;
  const cookie = await signIn(email);
  const H = { "content-type": "application/json", cookie };

  const personal = await fetch(`${API}/me/work-email/start`, {
    method: "POST", headers: H, body: JSON.stringify({ email: "someone@gmail.com" }),
  });
  check("personal domain refused", personal.status === 400, `status=${personal.status}`);

  const unknown = await fetch(`${API}/me/work-email/start`, {
    method: "POST", headers: H, body: JSON.stringify({ email: "someone@not-in-directory.test" }),
  });
  check("unknown domain refused (claim-only)", unknown.status === 404, `status=${unknown.status}`);

  const started = await fetch(`${API}/me/work-email/start`, {
    method: "POST", headers: H, body: JSON.stringify({ email: `person@we-smoke-shared.test` }),
  });
  const startBody = await started.json() as any;
  check("shared domain returns BOTH orgs as candidates",
    startBody.candidates?.length === 2, `candidates=${startBody.candidates?.length}`);
  check("dev code returned locally", Boolean(startBody.dev_code));

  const wrong = await fetch(`${API}/me/work-email/confirm`, {
    method: "POST", headers: H, body: JSON.stringify({ code: "000000", entry_id: parent.id }),
  });
  check("wrong code rejected", wrong.status === 400, `status=${wrong.status}`);

  const ambiguous = await fetch(`${API}/me/work-email/confirm`, {
    method: "POST", headers: H, body: JSON.stringify({ code: startBody.dev_code }),
  });
  check("ambiguous domain refuses to guess an employer",
    ambiguous.status === 400, `status=${ambiguous.status}`);

  const ok = await fetch(`${API}/me/work-email/confirm`, {
    method: "POST", headers: H, body: JSON.stringify({ code: startBody.dev_code, entry_id: sub.id }),
  });
  const okBody = await ok.json() as any;
  check("correct code + explicit org verifies", ok.status === 200, `status=${ok.status}`);
  check("member is bound to the org THEY chose", okBody.org?.entry_id === sub.id);
  check("employment grants NO authority", okBody.authority === "none");

  const [membership] = await sql`
    select om.relationship, om.authority,
           (select count(*)::int from verification_grants vg
             where vg.org_membership_id = om.id and vg.verification = 'employment'
               and vg.revoked_at is null) as grants
    from org_memberships om
    join profiles p on p.id = om.profile_id
    join "user" u on u.id = p.owner_user_id
    where u.email = ${email}` as any[];
  check("org_memberships row is employee/none", membership?.relationship === "employee" && membership?.authority === "none",
    `${membership?.relationship}/${membership?.authority}`);
  check("employment verification grant recorded", membership?.grants === 1, `grants=${membership?.grants}`);

  const replay = await fetch(`${API}/me/work-email/confirm`, {
    method: "POST", headers: H, body: JSON.stringify({ code: startBody.dev_code, entry_id: sub.id }),
  });
  check("code is single-use", replay.status === 404, `status=${replay.status}`);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
