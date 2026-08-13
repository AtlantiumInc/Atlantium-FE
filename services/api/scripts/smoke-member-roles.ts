/**
 * P0A smoke — personas, affiliations, and the professional surface.
 *
 * Covers the invariants that matter rather than just happy paths: preferences
 * default to matched_only, a seeking update never silently widens visibility,
 * claims are rejected for orgs not in the catalog, and one member cannot touch
 * another's roles.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-member-roles.ts   (worker on :8788)
 */
import { neon } from '@neondatabase/serverless';
const API = 'http://localhost:8788/v1';
let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
}
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const email = 'p0a-smoke@atlantium.test';
  await sql`delete from "user" where lower(email) = ${email}`;
  await fetch(`${API}/auth/otp`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email })});
  const [v] = await sql`select value from verification where identifier = ${'sign-in-otp-'+email} order by created_at desc limit 1` as any;
  const res = await fetch(`${API}/auth/verify`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email, code: String(v.value).split(':')[0] })});
  const cookie = (res.headers.get('set-cookie')||'').split(';')[0];
  const H = { 'content-type':'application/json', cookie };

  const empty = await fetch(`${API}/me/roles`, { headers: H }).then(r => r.json()) as any;
  check('new member has no roles', Array.isArray(empty.roles) && empty.roles.length === 0);

  const prof = await fetch(`${API}/me/roles`, { method:'POST', headers:H,
    body: JSON.stringify({ role:'professional', is_primary:true, title:'Staff Engineer' })}).then(r=>r.json()) as any;
  const p = prof.roles.find((r: any) => r.role === 'professional');
  check('professional role created', !!p);
  check('self-declared + confirmed', p?.source === 'self_declared' && p?.confirmed === true, `source=${p?.source}`);
  check('preferences auto-created at matched_only', p?.professional?.visibility === 'matched_only', `vis=${p?.professional?.visibility}`);
  check('seeking defaults to not_seeking', p?.professional?.seeking === 'not_seeking');

  const dupe = await fetch(`${API}/me/roles`, { method:'POST', headers:H,
    body: JSON.stringify({ role:'professional', title:'Principal Engineer' })}).then(r=>r.json()) as any;
  check('re-declaring upserts, does not duplicate', dupe.roles.filter((r:any)=>r.role==='professional').length === 1);
  check('upsert updated the title', dupe.roles.find((r:any)=>r.role==='professional')?.title === 'Principal Engineer');

  const seek = await fetch(`${API}/me/roles/${p.id}/seeking`, { method:'PATCH', headers:H,
    body: JSON.stringify({ seeking:'actively_looking', stack:['typescript','postgres'], seniority:'staff' })}).then(r=>r.json()) as any;
  const sp = seek.roles.find((r:any)=>r.id===p.id);
  check('seeking updated', sp?.professional?.seeking === 'actively_looking');
  check('seeking_updated_at stamped', !!sp?.professional?.seeking_updated_at);
  check('visibility STAYS matched_only when not asked to change', sp?.professional?.visibility === 'matched_only',
        `vis=${sp?.professional?.visibility}`);
  check('typed fields stored', JSON.stringify(sp?.professional?.stack) === '["typescript","postgres"]');

  const [entry] = await sql`select id, name from directory_entries where kind='company' limit 1` as any;
  const founder = await fetch(`${API}/me/roles`, { method:'POST', headers:H,
    body: JSON.stringify({ role:'founder', entry_id: entry.id })}).then(r=>r.json()) as any;
  check('second persona coexists', founder.roles.length === 2, `roles=${founder.roles.map((r:any)=>r.role).join(',')}`);
  check('affiliation resolved to org', founder.roles.find((r:any)=>r.role==='founder')?.org?.name === entry.name);

  const bogus = await fetch(`${API}/me/roles`, { method:'POST', headers:H,
    body: JSON.stringify({ role:'investor', entry_id:'11111111-1111-4111-8111-111111111111' })});
  check('claim-only: unknown org rejected', bogus.status === 404, `status=${bogus.status}`);

  const notPro = await fetch(`${API}/me/roles/${founder.roles.find((r:any)=>r.role==='founder').id}/seeking`,
    { method:'PATCH', headers:H, body: JSON.stringify({ seeking:'open' })});
  check('seeking rejected on non-professional role', notPro.status === 400, `status=${notPro.status}`);

  // Cross-tenant: another member must not be able to touch these roles.
  const email2 = 'p0a-smoke2@atlantium.test';
  await sql`delete from "user" where lower(email) = ${email2}`;
  await fetch(`${API}/auth/otp`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: email2 })});
  const [v2] = await sql`select value from verification where identifier = ${'sign-in-otp-'+email2} order by created_at desc limit 1` as any;
  const res2 = await fetch(`${API}/auth/verify`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: email2, code: String(v2.value).split(':')[0] })});
  const cookie2 = (res2.headers.get('set-cookie')||'').split(';')[0];
  const steal = await fetch(`${API}/me/roles/${p.id}/seeking`, { method:'PATCH',
    headers:{'content-type':'application/json', cookie: cookie2}, body: JSON.stringify({ seeking:'open' })});
  check("another member cannot edit someone else's role", steal.status === 404, `status=${steal.status}`);
  const del = await fetch(`${API}/me/roles/${p.id}`, { method:'DELETE', headers:{cookie: cookie2}});
  check("another member cannot delete someone else's role", del.status === 404, `status=${del.status}`);

  await sql`delete from "user" where lower(email) in (${email}, ${email2})`;
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}
main();
