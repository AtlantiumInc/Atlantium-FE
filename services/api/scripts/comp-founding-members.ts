/**
 * Comp founding members (execution plan R6).
 *
 * Live billing is deliberately deferred, so nobody could otherwise start a
 * conversation on production — `dm.send` comes from a paid tier. This grants it
 * directly, the same way investors are comped: a dated, revocable
 * `entitlement_grants` row, never a fake paid membership.
 *
 * CAPPED and DATED on purpose. An uncapped, undated comp stops being a launch
 * decision and quietly becomes the pricing.
 *
 *   DATABASE_URL=... npx tsx scripts/comp-founding-members.ts                 # dry run
 *   DATABASE_URL=... npx tsx scripts/comp-founding-members.ts --apply --limit 100 --days 180
 */
import { neon } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");
const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]) || fallback;
};
const LIMIT = arg("limit", 100);
const DAYS = arg("days", 180);
const REASON = "founding member — launch comp";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const expiresAt = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000);

  // Only members who finished the questionnaire: the comp is for people who
  // actually joined the lab, not every address that ever hit signup.
  const candidates = await sql`
    SELECT u.id, u.email, p.display_name
    FROM "user" u
    JOIN profiles p ON p.owner_user_id = u.id
    WHERE u.is_approved = true
      AND (p.onboarding_completed_at IS NOT NULL OR p.registration_details->>'is_completed' = 'true')
      AND NOT EXISTS (
        SELECT 1 FROM entitlement_grants g
        WHERE g.user_id = u.id AND g.entitlement = 'dm.send' AND g.revoked_at IS NULL
      )
    ORDER BY u.created_at ASC
    LIMIT ${LIMIT}
  ` as Array<{ id: string; email: string; display_name: string }>;

  for (const c of candidates) {
    console.log(`  ${c.email.padEnd(38)} ${c.display_name}`);
    if (!APPLY) continue;
    await sql`
      INSERT INTO entitlement_grants (user_id, entitlement, reason, expires_at)
      VALUES (${c.id}, 'dm.send', ${REASON}, ${expiresAt.toISOString()})
    `;
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${candidates.length} member(s), cap ${LIMIT}`);
  console.log(`  entitlement: dm.send`);
  console.log(`  expires:     ${expiresAt.toISOString().slice(0, 10)} (${DAYS} days)`);
  if (!APPLY) console.log("\nRe-run with --apply to grant.");
}

main();
