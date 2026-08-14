/**
 * P1 S5 smoke — curated introductions.
 *
 * The invariants that make this a product rather than a form:
 *   - a founder cannot cold-pitch an investor, but CAN request an intro;
 *   - curation is real: a request under review is invisible to its target, and
 *     a rejected one never reaches them at all;
 *   - acceptance is two-sided, and creates a connection carrying WHICH intro
 *     caused it — the attribution that can't be rebuilt later;
 *   - after acceptance they talk directly, with no request flow and no
 *     cooling-off, because consent already happened.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-introductions.ts   (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "intro-smoke";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
  ok ? pass++ : fail++;
};

async function member(slug: string, opts: { paid?: boolean; admin?: boolean } = {}) {
  const email = `${TAG}-${slug}@atlantium.test`;
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  const [v] = await sql`select value from verification where identifier = ${"sign-in-otp-" + email} order by created_at desc limit 1` as any[];
  const res = await fetch(`${API}/auth/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code: String(v.value).split(":")[0] }) });
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  const [row] = await sql`select p.id as profile_id, u.id as user_id from profiles p join "user" u on u.id = p.owner_user_id where u.email = ${email}` as any[];
  if (opts.paid) {
    await sql`insert into memberships (user_id, membership_tier, subscription_status) values (${row.user_id}, 'club', 'active')
              on conflict (user_id) do update set membership_tier='club', subscription_status='active'`;
  }
  if (opts.admin) await sql`update "user" set is_admin = true where id = ${row.user_id}`;
  // Search and other member-value endpoints require good standing: approved AND
  // questionnaire complete. Approval normally comes from finishing onboarding.
  await sql`update "user" set is_approved = true where id = ${row.user_id}`;
  await sql`update profiles set onboarding_completed_at = now(),
            registration_details = '{"is_completed":true}'::jsonb where id = ${row.profile_id}`;
  return { email, cookie, profileId: row.profile_id, userId: row.user_id };
}

const H = (m: { cookie: string }) => ({ "content-type": "application/json", cookie: m.cookie });

async function addRole(m: { profileId: string }, role: string, verified?: "investor") {
  const [r] = await sql`
    insert into member_roles (profile_id, role, source, is_primary, confirmed_at)
    values (${m.profileId}, ${role}::member_role, 'self_declared', true, now())
    on conflict (profile_id, role, coalesce(entry_id,'00000000-0000-0000-0000-000000000000'::uuid))
    do update set confirmed_at = now() returning id` as any[];
  if (verified) {
    await sql`insert into verification_grants (member_role_id, verification, evidence)
              values (${r.id}, ${verified}::verification_type, 'admin_review')`;
    await sql`insert into dm_policies (profile_id, accepts) values (${m.profileId}, 'introductions_only')
              on conflict (profile_id) do nothing`;
  }
  return r.id as string;
}

async function cleanup() {
  await sql`delete from "user" where email like ${TAG + "%"}`;
  await sql`delete from directory_entries where slug like ${TAG + "%"}`;
}

async function main() {
  await cleanup();
  const founder = await member("founder", { paid: true });
  await addRole(founder, "founder");
  // Founder rights come from an approved org claim (§8.5) — without one the
  // refusal is org_claim_required, which fires before the investor rule.
  const [org] = await sql`insert into directory_entries (kind, slug, name)
    values ('company', ${TAG + "-co"}, 'Intro Smoke Co') returning id` as any[];
  await sql`insert into org_memberships (profile_id, entry_id, relationship, authority)
            values (${founder.profileId}, ${org.id}, 'founder', 'admin')`;
  const investor = await member("investor");
  await addRole(investor, "investor", "investor");
  const admin = await member("curator", { admin: true, paid: true });

  // The locked door this feature exists for.
  const cold = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: investor.profileId, purpose: "fundraising", body: "pitch" }),
  });
  const coldBody = await cold.json() as any;
  check("founder cannot cold-pitch a verified investor", cold.status === 403 && coldBody.code === "intro_required",
    `${cold.status} ${coldBody.code}`);

  const req = await fetch(`${API}/introductions/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: investor.profileId, reason: "Raising a seed round for an Atlanta fintech; you led two similar rounds." }),
  });
  const reqBody = await req.json() as any;
  check("but CAN request an introduction", req.status === 200, `status=${req.status}`);
  const introId = reqBody.introduction?.id;

  const dupe = await fetch(`${API}/introductions/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: investor.profileId, reason: "Asking again because the first one is still pending review." }),
  });
  check("one live request per pair", dupe.status === 409, `status=${dupe.status}`);

  // Curation is the product: the target must not see it yet.
  const targetBefore = await (await fetch(`${API}/me/introductions`, { headers: H(investor) })).json() as any;
  check("INVISIBLE to the target while under review", (targetBefore.introductions ?? []).length === 0,
    `n=${targetBefore.introductions?.length}`);

  const queue = await (await fetch(`${API}/admin/introductions`, { headers: H(admin) })).json() as any;
  check("appears in the curation queue", queue.introductions?.some((i: any) => i.id === introId));

  const notAdmin = await fetch(`${API}/admin/introductions/${introId}/decide`, {
    method: "POST", headers: H(founder), body: JSON.stringify({ approve: true }),
  });
  check("a member cannot curate their own request", notAdmin.status === 403 || notAdmin.status === 401,
    `status=${notAdmin.status}`);

  const approved = await fetch(`${API}/admin/introductions/${introId}/decide`, {
    method: "POST", headers: H(admin), body: JSON.stringify({ approve: true, note: "good fit" }),
  });
  check("curator approves", approved.status === 200 && ((await approved.json()) as any).status === "awaiting_target");

  const targetAfter = await (await fetch(`${API}/me/introductions`, { headers: H(investor) })).json() as any;
  check("NOW visible to the target", (targetAfter.introductions ?? []).length === 1);

  const accepted = await fetch(`${API}/introductions/${introId}/respond`, {
    method: "POST", headers: H(investor), body: JSON.stringify({ accept: true }),
  });
  const acceptedBody = await accepted.json() as any;
  check("target accepts", accepted.status === 200 && acceptedBody.accepted);

  const [conn] = await sql`
    select source, status, introduction_id from member_connections
    where requester_profile_id = ${founder.profileId} and recipient_profile_id = ${investor.profileId}` as any[];
  check("acceptance creates a connection", conn?.status === "accepted");
  check("...tagged as an Atlantium introduction", conn?.source === "atlantium_intro", conn?.source);
  check("...carrying WHICH intro caused it (attribution)", conn?.introduction_id === introId);

  // Consent already happened, so no request flow and no cooling-off.
  const direct = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: investor.profileId, purpose: "fundraising", body: "Thanks for taking the intro — here's the deck." }),
  });
  const directBody = await direct.json() as any;
  check("they can now talk DIRECTLY, no request, no waiting",
    direct.status === 200 && directBody.direct === true, `status=${direct.status} direct=${directBody.direct}`);

  await fetch(`${API}/admin/introductions/${introId}/outcome`, {
    method: "POST", headers: H(admin), body: JSON.stringify({ outcome: "met", note: "coffee scheduled" }),
  });
  const funnel = await (await fetch(`${API}/admin/introductions/funnel`, { headers: H(admin) })).json() as any;
  check("funnel counts the connection back to its intro",
    funnel.connections_from_intros >= 1 && funnel.outcomes?.met >= 1,
    `connections=${funnel.connections_from_intros} outcomes=${JSON.stringify(funnel.outcomes)}`);

  // A rejected request must never reach its target.
  const founder2 = await member("founder2", { paid: true });
  await addRole(founder2, "founder");
  await sql`insert into org_memberships (profile_id, entry_id, relationship, authority)
            values (${founder2.profileId}, ${org.id}, 'founder', 'admin')`;
  const req2 = await (await fetch(`${API}/introductions/requests`, {
    method: "POST", headers: H(founder2),
    body: JSON.stringify({ profile_id: investor.profileId, reason: "Not a fit, testing that rejection stays invisible to the target." }),
  })).json() as any;
  await fetch(`${API}/admin/introductions/${req2.introduction.id}/decide`, {
    method: "POST", headers: H(admin), body: JSON.stringify({ approve: false, note: "not a fit" }),
  });
  const afterReject = await (await fetch(`${API}/me/introductions`, { headers: H(investor) })).json() as any;
  check("a REJECTED request never reaches the target",
    !afterReject.introductions?.some((i: any) => i.id === req2.introduction.id));

  // ── S6: discovery must never become a candidate-search backdoor ──────────
  const seeker = await member("quiet-seeker", { paid: true });
  const seekerRole = await addRole(seeker, "professional");
  await sql`insert into professional_preferences (role_id, seeking, seeking_updated_at, visibility)
            values (${seekerRole}, 'actively_looking', now(), 'matched_only')
            on conflict (role_id) do update set seeking='actively_looking', visibility='matched_only', seeking_updated_at=now()`;
  await sql`update profiles set onboarding_completed_at = now() where id in
            (${founder.profileId}, ${investor.profileId}, ${seeker.profileId})`;

  const search = await (await fetch(`${API}/members/search?q=intro-smoke`, { headers: H(founder) })).json() as any;
  const serialized = JSON.stringify(search);
  check("search returns members", Array.isArray(search.members) && search.members.length > 0,
    serialized.slice(0, 80));
  check("search NEVER leaks seeking state",
    Array.isArray(search.members) && !/seeking|actively_looking|matched_only|visibility/.test(serialized),
    serialized.slice(0, 60));

  const self = search.members?.some((m: any) => m.profile_id === founder.profileId);
  check("searcher is not in their own results", !self);

  await fetch(`${API}/blocks`, {
    method: "POST", headers: H(investor), body: JSON.stringify({ profile_id: founder.profileId }),
  });
  const afterBlock = await (await fetch(`${API}/members/search?q=intro-smoke`, { headers: H(founder) })).json() as any;
  check("a block hides both parties from each other's search",
    !afterBlock.members?.some((m: any) => m.profile_id === investor.profileId));

  // ── the case real data hit: an intro accepted over an existing pending
  //    connection request. A plain insert is a silent no-op there, which would
  //    leave both parties having said yes while not being connected.
  const f3 = await member("founder3", { paid: true });
  await addRole(f3, "founder");
  await sql`insert into org_memberships (profile_id, entry_id, relationship, authority)
            values (${f3.profileId}, ${org.id}, 'founder', 'admin')`;
  const inv2 = await member("investor2");
  await addRole(inv2, "investor", "investor");

  // A stale connection request already sits between them.
  await sql`insert into member_connections (requester_profile_id, recipient_profile_id, status, source)
            values (${inv2.profileId}, ${f3.profileId}, 'pending', 'direct')`;

  const req3 = await (await fetch(`${API}/introductions/requests`, {
    method: "POST", headers: H(f3),
    body: JSON.stringify({ profile_id: inv2.profileId, reason: "Testing that an intro over a pending connection still connects us properly." }),
  })).json() as any;
  await fetch(`${API}/admin/introductions/${req3.introduction.id}/decide`, {
    method: "POST", headers: H(admin), body: JSON.stringify({ approve: true }),
  });
  await fetch(`${API}/introductions/${req3.introduction.id}/respond`, {
    method: "POST", headers: H(inv2), body: JSON.stringify({ accept: true }),
  });
  const [promoted] = await sql`select status, source, introduction_id from member_connections
    where (requester_profile_id = ${inv2.profileId} and recipient_profile_id = ${f3.profileId})
       or (requester_profile_id = ${f3.profileId} and recipient_profile_id = ${inv2.profileId})` as any[];
  check("intro over an EXISTING pending connection still connects them",
    promoted?.status === "accepted", `status=${promoted?.status}`);
  check("...and the existing edge gets the intro's attribution",
    promoted?.source === "atlantium_intro" && promoted?.introduction_id === req3.introduction.id,
    `source=${promoted?.source}`);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
