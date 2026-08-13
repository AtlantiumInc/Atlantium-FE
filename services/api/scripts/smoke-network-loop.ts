/**
 * P1 smoke — connections, blocks, DM requests and the outreach budget.
 *
 * The invariants being defended (plan §8.2–8.6, §8A):
 *   - talking ≠ connecting;
 *   - connection and DM requests share ONE budget, so connecting isn't the
 *     cheap way into an inbox;
 *   - GRANTS are contextual, RESTRICTIONS cumulative within their surface —
 *     an investor+recruiter cannot mine professionals under the investor hat,
 *     but a founder+recruiter can still talk to a founder peer;
 *   - blocks work without a prior connection and always win;
 *   - free members receive but never initiate.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-network-loop.ts   (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "nl-smoke";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}

type Member = { email: string; cookie: string; profileId: string; userId: string };

async function member(slug: string, opts: { paid?: boolean } = {}): Promise<Member> {
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
  const [row] = await sql`
    select p.id as profile_id, u.id as user_id from profiles p
    join "user" u on u.id = p.owner_user_id where u.email = ${email}` as any[];
  if (opts.paid) {
    // Billing doesn't exist yet (P1b) — grant the tier directly so outreach is
    // testable. This is exactly what Stripe will write later.
    await sql`insert into memberships (user_id, membership_tier, subscription_status)
              values (${row.user_id}, 'club', 'active')
              on conflict (user_id) do update set membership_tier = 'club', subscription_status = 'active'`;
  }
  return { email, cookie, profileId: row.profile_id, userId: row.user_id };
}

const H = (m: Member) => ({ "content-type": "application/json", cookie: m.cookie });

async function addRole(m: Member, role: string, opts: { verified?: "investor" | "advisor" } = {}) {
  const [r] = await sql`
    insert into member_roles (profile_id, role, source, is_primary, confirmed_at)
    values (${m.profileId}, ${role}::member_role, 'self_declared', true, now())
    on conflict (profile_id, role, coalesce(entry_id,'00000000-0000-0000-0000-000000000000'::uuid))
    do update set confirmed_at = now() returning id` as any[];
  if (role === "professional") {
    await sql`insert into professional_preferences (role_id, seeking, seeking_updated_at, visibility)
              values (${r.id}, 'not_seeking', now(), 'matched_only') on conflict (role_id) do nothing`;
  }
  if (opts.verified) {
    await sql`insert into verification_grants (member_role_id, verification, evidence)
              values (${r.id}, ${opts.verified}::verification_type, 'admin_review')`;
  }
  return r.id as string;
}

async function makeRecruiter(m: Member, entryId: string) {
  await sql`insert into org_memberships (profile_id, entry_id, relationship, authority)
            values (${m.profileId}, ${entryId}, 'recruiter', 'hiring')`;
}

async function setSeeking(m: Member, seeking: string, visibility: string) {
  await sql`
    update professional_preferences pp set seeking = ${seeking}::seeking_status,
      visibility = ${visibility}::seeking_visibility, seeking_updated_at = now()
    from member_roles mr where mr.id = pp.role_id and mr.profile_id = ${m.profileId}`;
}

const dm = (from: Member, to: Member, purpose: string, body = "hello") =>
  fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(from),
    body: JSON.stringify({ profile_id: to.profileId, purpose, body }),
  });

const connect = (from: Member, to: Member) =>
  fetch(`${API}/connections/requests`, {
    method: "POST", headers: H(from), body: JSON.stringify({ profile_id: to.profileId }),
  });

async function cleanup() {
  await sql`delete from "user" where email like ${TAG + "%"}`;
  await sql`delete from directory_entries where slug like ${TAG + "%"}`;
}

async function main() {
  await cleanup();
  const [acme] = await sql`insert into directory_entries (kind, slug, name)
    values ('company', ${TAG + "-acme"}, 'NL Smoke Acme') returning id` as any[];

  // ── free vs paid initiation ───────────────────────────────────────────────
  const freeMember = await member("free");
  await addRole(freeMember, "professional");
  const target = await member("target", { paid: true });
  await addRole(target, "professional");

  const freeAttempt = await dm(freeMember, target, "peer");
  check("free member cannot initiate", freeAttempt.status === 403, `status=${freeAttempt.status}`);
  const freeBody = await freeAttempt.json() as any;
  check("...with an upgrade reason", freeBody.code === "upgrade_required", `code=${freeBody.code}`);

  const paid = await member("paid", { paid: true });
  await addRole(paid, "professional");
  const ok = await dm(paid, target, "peer");
  check("paid member may initiate a DM request", ok.status === 200, `status=${ok.status}`);
  const okBody = await ok.json() as any;
  check("first contact is a REQUEST, not a message", okBody.direct === false && Boolean(okBody.request_id));

  const dupe = await dm(paid, target, "peer");
  check("one pending request per pair", dupe.status === 409, `status=${dupe.status}`);

  // ── talking is not connecting ─────────────────────────────────────────────
  const decide = await fetch(`${API}/dm/requests/${okBody.request_id}/decide`, {
    method: "POST", headers: H(target), body: JSON.stringify({ accept: true }),
  });
  const decided = await decide.json() as any;
  check("accepting opens a thread", decide.status === 200 && Boolean(decided.thread_id));
  const [conns] = await sql`select count(*)::int n from member_connections
    where requester_profile_id = ${paid.profileId} or recipient_profile_id = ${paid.profileId}` as any[];
  check("accepting a DM creates NO connection", conns.n === 0, `connections=${conns.n}`);

  // ── shared budget ─────────────────────────────────────────────────────────
  const before = await (await fetch(`${API}/me/outreach`, { headers: H(paid) })).json() as any;
  await connect(paid, await (async () => { const m = await member("conn-target"); await addRole(m, "professional"); return m; })());
  const after = await (await fetch(`${API}/me/outreach`, { headers: H(paid) })).json() as any;
  check("connection requests draw on the SAME budget as DMs",
    after.monthlyUsed === before.monthlyUsed + 1, `${before.monthlyUsed} → ${after.monthlyUsed}`);

  // ── blocks ────────────────────────────────────────────────────────────────
  const blocker = await member("blocker");
  await addRole(blocker, "professional");
  const blockRes = await fetch(`${API}/blocks`, {
    method: "POST", headers: H(blocker), body: JSON.stringify({ profile_id: paid.profileId }),
  });
  check("block works with no prior connection", blockRes.status === 200, `status=${blockRes.status}`);
  const afterBlock = await dm(paid, blocker, "peer");
  check("a block stops contact", afterBlock.status === 403, `status=${afterBlock.status}`);
  const blockBody = await afterBlock.json() as any;
  check("...without revealing the block", blockBody.code === "not_available", `code=${blockBody.code}`);

  // ── the privilege-escalation case (§8.6) ──────────────────────────────────
  const hybrid = await member("investor-recruiter", { paid: true });
  const investorRole = await addRole(hybrid, "investor", { verified: "investor" });
  await makeRecruiter(hybrid, acme.id);
  const quiet = await member("quiet-professional");
  await addRole(quiet, "professional");
  await setSeeking(quiet, "actively_looking", "matched_only");

  const mined = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(hybrid),
    body: JSON.stringify({ profile_id: quiet.profileId, purpose: "hiring", body: "are you looking?",
      acting_role_id: investorRole }),
  });
  check("ESCALATION BLOCKED: investor hat cannot mine a matched_only professional",
    mined.status === 403, `status=${mined.status}`);
  const minedBody = await mined.json() as any;
  check("...and the refusal doesn't disclose their job search",
    minedBody.code === "not_available", `code=${minedBody.code}`);

  // ── the over-block case (§8.6): peer contact must still work ──────────────
  const founderRecruiter = await member("founder-recruiter", { paid: true });
  const founderRole = await addRole(founderRecruiter, "founder");
  await sql`insert into org_memberships (profile_id, entry_id, relationship, authority)
            values (${founderRecruiter.profileId}, ${acme.id}, 'recruiter', 'hiring')`;
  const peerFounder = await member("peer-founder");
  await addRole(peerFounder, "founder");
  await addRole(peerFounder, "professional");
  await setSeeking(peerFounder, "actively_looking", "matched_only");

  const peerContact = await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(founderRecruiter),
    body: JSON.stringify({ profile_id: peerFounder.profileId, purpose: "peer", body: "coffee?",
      acting_role_id: founderRole }),
  });
  check("NOT OVER-BLOCKED: founder+recruiter may still reach a founder peer",
    peerContact.status === 200, `status=${peerContact.status} ${JSON.stringify((await peerContact.clone().json().catch(()=>({}))) as any).slice(0,80)}`);

  // ── S2: DM policy + the investor default ─────────────────────────────────
  const policyOwner = await member("policy-owner");
  await addRole(policyOwner, "professional");
  const reacher = await member("policy-reacher", { paid: true });
  await addRole(reacher, "professional");

  const defaultPolicy = await (await fetch(`${API}/me/dm-policy`, { headers: H(policyOwner) })).json() as any;
  check("dm policy defaults to members", defaultPolicy.accepts === "members", `accepts=${defaultPolicy.accepts}`);

  await fetch(`${API}/me/dm-policy`, {
    method: "PATCH", headers: H(policyOwner), body: JSON.stringify({ accepts: "nobody" }),
  });
  const shut = await dm(reacher, policyOwner, "peer");
  check("accepts=nobody stops contact", shut.status === 403, `status=${shut.status}`);
  check("...generically", ((await shut.json()) as any).code === "not_available");

  // An admin grant to an investor must protect their inbox by default.
  const investor = await member("fresh-investor");
  const invRole = await addRole(investor, "investor");
  const admin = await member("verifier");
  await sql`update "user" set is_admin = true where id = ${admin.userId}`;

  const granted = await fetch(`${API}/admin/verifications`, {
    method: "POST", headers: H(admin),
    body: JSON.stringify({ member_role_id: invRole, verification: "investor" }),
  });
  const grantBody = await granted.json() as any;
  check("admin can grant investor verification", granted.status === 200, `status=${granted.status}`);
  check("investor grants carry an expiry", Boolean(grantBody.expires_at));

  const invPolicy = await (await fetch(`${API}/me/dm-policy`, { headers: H(investor) })).json() as any;
  check("VERIFIED INVESTOR defaults to introductions_only",
    invPolicy.accepts === "introductions_only", `accepts=${invPolicy.accepts}`);

  const founderReach = await member("founder-reaching-investor", { paid: true });
  await addRole(founderReach, "founder");
  await sql`insert into org_memberships (profile_id, entry_id, relationship, authority)
            values (${founderReach.profileId}, ${acme.id}, 'founder', 'admin')`;
  const pitch = await dm(founderReach, investor, "fundraising");
  check("a founder cannot cold-pitch a verified investor", pitch.status === 403, `status=${pitch.status}`);
  check("...and is pointed at introductions",
    ((await pitch.json()) as any).code === "intro_required");

  const revoked = await fetch(`${API}/admin/verifications/revoke`, {
    method: "POST", headers: H(admin),
    body: JSON.stringify({ member_role_id: invRole, verification: "investor", reason: "smoke" }),
  });
  check("admin can revoke a grant", revoked.status === 200, `status=${revoked.status}`);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
