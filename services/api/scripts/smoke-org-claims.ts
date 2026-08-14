/**
 * Org claims — the door that was missing.
 *
 * Founder-persona outreach requires an approved org claim, and until this
 * existed a founder hit org_claim_required with no way to resolve it. The point
 * of this smoke is that the loop actually closes: blocked → claim → approved →
 * unblocked.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-org-claims.ts     (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "claim-smoke";
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
  await sql`update "user" set is_approved = true${opts.admin ? sql`, is_admin = true` : sql``} where id = ${row.user_id}`;
  await sql`update profiles set onboarding_completed_at = now(), registration_details = '{"is_completed":true}'::jsonb where id = ${row.profile_id}`;
  if (opts.paid) {
    await sql`insert into memberships (user_id, membership_tier, subscription_status) values (${row.user_id}, 'club', 'active')
              on conflict (user_id) do update set membership_tier='club', subscription_status='active'`;
  }
  await sql`insert into member_roles (profile_id, role, source, is_primary, confirmed_at)
            values (${row.profile_id}, 'founder', 'self_declared', true, now()) on conflict do nothing`;
  return { email, cookie, profileId: row.profile_id, userId: row.user_id };
}

const H = (m: { cookie: string }) => ({ "content-type": "application/json", cookie: m.cookie });

async function cleanup() {
  await sql`delete from "user" where email like ${TAG + "%"}`;
  await sql`delete from directory_entries where slug like ${TAG + "%"} or slug = 'claim-smoke-brand-new-co'`;
}

async function main() {
  await cleanup();
  const [org] = await sql`insert into directory_entries (kind, slug, name)
    values ('company', ${TAG + "-acme"}, 'Claim Smoke Acme') returning id` as any[];

  const founder = await member("founder", { paid: true });
  const peer = await member("peer", { paid: true });
  const admin = await member("admin", { admin: true, paid: true });

  // The dead end this feature exists to remove.
  const blocked = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: peer.profileId, purpose: "peer", body: "hello from a founder" }),
  });
  const blockedBody = await blocked.json() as any;
  check("BEFORE: founder outreach is blocked with org_claim_required",
    blocked.status === 403 && blockedBody.code === "org_claim_required", `${blocked.status} ${blockedBody.code}`);

  const claim = await fetch(`${API}/org-requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ entry_id: org.id, relationship: "founder", evidence: "I'm the cofounder; site lists me." }),
  });
  const claimBody = await claim.json() as any;
  check("member can request a claim", claim.status === 200, `status=${claim.status}`);

  const dupe = await fetch(`${API}/org-requests`, {
    method: "POST", headers: H(founder), body: JSON.stringify({ entry_id: org.id }),
  });
  check("one live request per member per org", dupe.status === 409, `status=${dupe.status}`);

  const stillBlocked = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: peer.profileId, purpose: "peer", body: "still waiting" }),
  });
  check("a PENDING claim grants nothing", stillBlocked.status === 403, `status=${stillBlocked.status}`);

  const queue = await (await fetch(`${API}/admin/org-requests`, { headers: H(admin) })).json() as any;
  check("appears in the admin queue", queue.requests?.some((r: any) => r.id === claimBody.request.id));

  const notAdmin = await fetch(`${API}/admin/org-requests/${claimBody.request.id}/decide`, {
    method: "POST", headers: H(founder), body: JSON.stringify({ approve: true }),
  });
  check("a member can't approve their own claim", notAdmin.status === 401 || notAdmin.status === 403,
    `status=${notAdmin.status}`);

  const approved = await fetch(`${API}/admin/org-requests/${claimBody.request.id}/decide`, {
    method: "POST", headers: H(admin), body: JSON.stringify({ approve: true, authority: "admin" }),
  });
  check("admin approves", approved.status === 200, `status=${approved.status}`);

  const [membership] = await sql`
    select om.relationship, om.authority,
      (select count(*)::int from verification_grants vg
        where vg.org_membership_id = om.id and vg.verification = 'org_authority' and vg.revoked_at is null) as grants
    from org_memberships om where om.profile_id = ${founder.profileId}` as any[];
  check("approval creates the membership with authority",
    membership?.relationship === "founder" && membership?.authority === "admin",
    `${membership?.relationship}/${membership?.authority}`);
  check("...and records it as a verification grant", membership?.grants === 1, `grants=${membership?.grants}`);

  const unblocked = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(founder),
    body: JSON.stringify({ profile_id: peer.profileId, purpose: "peer", body: "now I can reach a peer founder" }),
  });
  check("AFTER: founder outreach works", unblocked.status === 200, `status=${unblocked.status}`);

  const mine = await (await fetch(`${API}/me/org-requests`, { headers: H(founder) })).json() as any;
  check("the member can see what they hold", mine.memberships?.[0]?.authority === "admin",
    JSON.stringify(mine.memberships?.[0] ?? {}).slice(0, 60));

  // A company that isn't in the directory yet must not be a dead end either.
  const newco = await member("newco-founder", { paid: true });
  const createReq = await (await fetch(`${API}/org-requests`, {
    method: "POST", headers: H(newco),
    body: JSON.stringify({ proposed_name: "Claim Smoke Brand New Co", proposed_website: "https://brand-new.test" }),
  })).json() as any;
  check("a missing company can be proposed", createReq.request?.kind === "create", createReq.request?.kind);

  const createdDecision = await fetch(`${API}/admin/org-requests/${createReq.request.id}/decide`, {
    method: "POST", headers: H(admin), body: JSON.stringify({ approve: true, authority: "admin" }),
  });
  const createdBody = await createdDecision.json() as any;
  check("approving it creates the organization", createdDecision.status === 200 && Boolean(createdBody.entry_id));
  const [createdOrg] = await sql`select name from directory_entries where id = ${createdBody.entry_id}` as any[];
  check("...in the catalog, under the name given", createdOrg?.name === "Claim Smoke Brand New Co", createdOrg?.name);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
