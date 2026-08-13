/**
 * P1 S1 smoke — conversations.
 *
 * Authorization is the whole risk here: a thread is readable only by its
 * participants, a block severs an existing thread in both directions, and a
 * stranger gets 404 rather than 403 so ids can't be probed for existence.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-threads.ts    (worker on :8788)
 */
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:8788/v1";
const TAG = "th-smoke";
const sql = neon(process.env.DATABASE_URL!);

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}

async function member(slug: string, paid = false) {
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
            values (${row.profile_id}, 'professional', 'self_declared', true, now()) on conflict do nothing`;
  if (paid) {
    await sql`insert into memberships (user_id, membership_tier, subscription_status)
              values (${row.user_id}, 'club', 'active')
              on conflict (user_id) do update set membership_tier='club', subscription_status='active'`;
  }
  return { email, cookie, profileId: row.profile_id, userId: row.user_id };
}

const H = (m: { cookie: string }) => ({ "content-type": "application/json", cookie: m.cookie });

async function cleanup() {
  await sql`delete from "user" where email like ${TAG + "%"}`;
}

async function main() {
  await cleanup();
  const alice = await member("alice", true);
  const bob = await member("bob");
  const stranger = await member("stranger", true);

  // Alice requests, Bob accepts — the flow that previously dead-ended.
  const req = await (await fetch(`${API}/dm/requests`, {
    method: "POST", headers: H(alice),
    body: JSON.stringify({ profile_id: bob.profileId, purpose: "peer", body: "Saw your talk — can I ask about your stack?" }),
  })).json() as any;
  const accepted = await (await fetch(`${API}/dm/requests/${req.request_id}/decide`, {
    method: "POST", headers: H(bob), body: JSON.stringify({ accept: true }),
  })).json() as any;
  const threadId = accepted.thread_id;
  check("accepting a request yields a thread", Boolean(threadId));

  const asBob = await (await fetch(`${API}/threads/${threadId}/messages`, { headers: H(bob) })).json() as any;
  check("the original request body IS the first message",
    asBob.messages?.[0]?.body?.startsWith("Saw your talk"), asBob.messages?.[0]?.body?.slice(0, 24));
  check("recipient sees it as not-mine", asBob.messages?.[0]?.mine === false);
  check("counterpart resolved", Boolean(asBob.conversation?.other_profile_id));

  const reply = await fetch(`${API}/threads/${threadId}/messages`, {
    method: "POST", headers: H(bob), body: JSON.stringify({ body: "Sure — mostly Postgres and Workers." }),
  });
  check("participant can reply", reply.status === 200, `status=${reply.status}`);

  const asAlice = await (await fetch(`${API}/threads/${threadId}/messages`, { headers: H(alice) })).json() as any;
  check("both messages visible to the other side", asAlice.messages?.length === 2, `n=${asAlice.messages?.length}`);
  check("authorship is per-viewer", asAlice.messages?.[1]?.mine === false && asAlice.messages?.[0]?.mine === true);

  const list = await (await fetch(`${API}/threads`, { headers: H(alice) })).json() as any;
  check("thread appears in the list with its last message",
    list.conversations?.[0]?.id === threadId && list.conversations?.[0]?.last_message?.body?.startsWith("Sure"),
    `n=${list.conversations?.length}`);

  // ── the authorization surface ────────────────────────────────────────────
  const peek = await fetch(`${API}/threads/${threadId}/messages`, { headers: H(stranger) });
  check("non-participant gets 404 (not 403)", peek.status === 404, `status=${peek.status}`);
  const intrude = await fetch(`${API}/threads/${threadId}/messages`, {
    method: "POST", headers: H(stranger), body: JSON.stringify({ body: "hello" }),
  });
  check("non-participant cannot post", intrude.status === 404, `status=${intrude.status}`);

  // ── a block severs the thread both ways ──────────────────────────────────
  await fetch(`${API}/blocks`, {
    method: "POST", headers: H(bob), body: JSON.stringify({ profile_id: alice.profileId }),
  });
  const afterBlockAlice = await fetch(`${API}/threads/${threadId}/messages`, { headers: H(alice) });
  check("blocked sender loses access to the thread", afterBlockAlice.status === 404, `status=${afterBlockAlice.status}`);
  const afterBlockBob = await fetch(`${API}/threads/${threadId}/messages`, { headers: H(bob) });
  check("blocker loses it too (severed, not one-sided)", afterBlockBob.status === 404, `status=${afterBlockBob.status}`);
  const listAfter = await (await fetch(`${API}/threads`, { headers: H(alice) })).json() as any;
  check("and it disappears from the list", (listAfter.conversations?.length ?? 0) === 0,
    `n=${listAfter.conversations?.length}`);

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1); });
