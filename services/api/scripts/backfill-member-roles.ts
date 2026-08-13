/**
 * P0A backfill (plan §5.3) — give existing members a persona guessed from the
 * answers they already gave.
 *
 * The guess is written as source='inferred' with confirmed_at NULL, NEVER as
 * 'self_declared'. Inference is not assertion: an inferred persona displays,
 * but grants no initiation rights until the member confirms it. Knowing the
 * difference between what a member told us and what we guessed is a core
 * property of a trust product.
 *
 * Idempotent: re-running never overwrites a persona the member has confirmed.
 *
 *   DATABASE_URL=... npx tsx scripts/backfill-member-roles.ts          # dry run
 *   DATABASE_URL=... npx tsx scripts/backfill-member-roles.ts --apply
 */
import { neon } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");

type Registration = Record<string, unknown>;

/**
 * Map the old questionnaire onto a persona. Deliberately conservative: when the
 * answers don't clearly indicate anything, we infer `professional` — the
 * persona with the fewest rights (peer graph only) — rather than guessing
 * someone into founder or investor, which carry org claims and comped access.
 */
function inferRole(reg: Registration): { role: string; why: string } {
  const goal = String(reg.primary_goal ?? "").toLowerCase();
  const project = String(reg.working_on_project ?? "").toLowerCase();
  const hopes = Array.isArray(reg.community_hopes) ? reg.community_hopes.map(String) : [];
  const tier = String(reg.membership_tier ?? "");

  if (goal.includes("invest") || hopes.some((h) => h.toLowerCase().includes("invest"))) {
    return { role: "investor", why: "goal/hopes mention investing" };
  }
  if (goal.includes("found") || goal.includes("start") || goal.includes("launch")
      || project === "yes_actively" || project === "yes_early") {
    return { role: "founder", why: `goal=${goal || "-"} project=${project || "-"}` };
  }
  if (goal.includes("mentor") || goal.includes("advis")) {
    return { role: "advisor", why: "goal mentions mentoring/advising" };
  }
  return { role: "professional", why: `default (goal=${goal || "-"}, tier=${tier || "-"})` };
}

/** Only members with a completed questionnaire have answers worth inferring from. */
async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const profiles = await sql`
    SELECT p.id, p.display_name, p.registration_details, p.onboarding_completed_at
    FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM member_roles mr WHERE mr.profile_id = p.id)
    ORDER BY p.created_at
  ` as Array<{ id: string; display_name: string; registration_details: Registration; onboarding_completed_at: string | null }>;

  const counts: Record<string, number> = {};
  let skipped = 0;

  for (const p of profiles) {
    const reg = p.registration_details ?? {};
    const completed = Boolean(p.onboarding_completed_at) || reg.is_completed === true;
    if (!completed) {
      // No answers to reason from. They'll pick a persona in onboarding.
      skipped++;
      continue;
    }
    const { role, why } = inferRole(reg);
    counts[role] = (counts[role] ?? 0) + 1;
    console.log(`  ${role.padEnd(12)} ${(p.display_name || "(no name)").slice(0, 28).padEnd(30)} ${why}`);

    if (!APPLY) continue;

    const [inserted] = await sql`
      INSERT INTO member_roles (profile_id, role, source, is_primary, confirmed_at)
      VALUES (${p.id}, ${role}::member_role, 'inferred'::role_source, true, NULL)
      ON CONFLICT (profile_id, role, COALESCE(entry_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO NOTHING
      RETURNING id
    ` as Array<{ id: string }>;

    // A professional role always gets its preferences row, at the safe default
    // (matched_only). Nothing about their job search becomes visible here.
    if (inserted && role === "professional") {
      await sql`
        INSERT INTO professional_preferences (role_id) VALUES (${inserted.id})
        ON CONFLICT (role_id) DO NOTHING
      `;
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${profiles.length} profiles without roles`);
  console.log(`  inferred: ${JSON.stringify(counts)}`);
  console.log(`  skipped (questionnaire incomplete): ${skipped}`);
  if (!APPLY) console.log("\nRe-run with --apply to write.");
}

main();
