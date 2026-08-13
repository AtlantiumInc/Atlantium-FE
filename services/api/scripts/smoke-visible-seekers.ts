/**
 * P0B smoke — the privacy invariants of visibleSeekers() (plan §3.4, §8.7).
 *
 * This is the most important test in the codebase. If it regresses, Atlantium
 * becomes a searchable database of people quietly looking for work, and their
 * current employers are among the searchers.
 *
 *   DATABASE_URL=... npx tsx scripts/smoke-visible-seekers.ts
 */
import { eq, inArray, sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import {
  directoryEntries,
  memberRoles,
  orgMemberships,
  professionalPreferences,
  profiles,
  user,
} from "../src/db/schema";
import { grantVerification } from "../src/lib/verification";
import { visibleSeekers } from "../src/lib/seeking";

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL! } as never);
const TAG = "vs-smoke";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function makeMember(name: string) {
  const id = `${TAG}-${name}-${Math.random().toString(36).slice(2, 10)}`;
  await db.insert(user).values({ id, name, email: `${id}@atlantium.test`, emailVerified: true });
  const [profile] = await db
    .insert(profiles)
    .values({ ownerUserId: id, displayName: name, slug: id })
    .returning();
  return profile;
}

async function makeSeeker(
  name: string,
  visibility: "private" | "matched_only" | "verified_employers" | "all_members",
  opts: { entryId?: string; updatedAt?: Date; seeking?: "open" | "actively_looking" } = {},
) {
  const profile = await makeMember(name);
  const [role] = await db
    .insert(memberRoles)
    .values({ profileId: profile.id, role: "professional", entryId: opts.entryId ?? null, confirmedAt: new Date() })
    .returning();
  await db.insert(professionalPreferences).values({
    roleId: role.id,
    seeking: opts.seeking ?? "actively_looking",
    seekingUpdatedAt: opts.updatedAt ?? new Date(),
    visibility,
  });
  if (opts.entryId) {
    await db.insert(orgMemberships).values({
      profileId: profile.id, entryId: opts.entryId, relationship: "employee", authority: "none",
    });
  }
  return profile;
}

async function cleanup() {
  await db.delete(user).where(sql`${user.id} LIKE ${TAG + "%"}`);
  await db.delete(directoryEntries).where(sql`${directoryEntries.slug} LIKE ${TAG + "%"}`);
}

async function main() {
  await cleanup();

  const [acme] = await db.insert(directoryEntries)
    .values({ kind: "company", slug: `${TAG}-acme`, name: "VS Smoke Acme" }).returning();
  const [globex] = await db.insert(directoryEntries)
    .values({ kind: "company", slug: `${TAG}-globex`, name: "VS Smoke Globex" }).returning();

  // Candidates, all actively looking, differing only in visibility / freshness.
  const hidden = await makeSeeker("hidden-matched-only", "matched_only", { entryId: acme.id });
  const employersOnly = await makeSeeker("employers-only", "verified_employers", { entryId: acme.id });
  const open = await makeSeeker("open-to-all", "all_members", { entryId: acme.id, seeking: "open" });
  const priv = await makeSeeker("private", "private");
  const stale = await makeSeeker("stale", "all_members", { updatedAt: daysAgo(120) });

  // Viewers.
  const plain = await makeMember("viewer-plain");
  const acmeColleague = await makeMember("viewer-acme-colleague");
  await db.insert(orgMemberships).values({
    profileId: acmeColleague.id, entryId: acme.id, relationship: "recruiter", authority: "hiring",
  });
  const verifiedRecruiter = await makeMember("viewer-globex-verified");
  const [vrMembership] = await db.insert(orgMemberships)
    .values({ profileId: verifiedRecruiter.id, entryId: globex.id, relationship: "recruiter", authority: "hiring" })
    .returning();
  await grantVerification(db, {
    subject: { orgMembershipId: vrMembership.id },
    verification: "org_authority",
    evidence: "admin_review",
  });
  const unverifiedRecruiter = await makeMember("viewer-globex-unverified");
  await db.insert(orgMemberships).values({
    profileId: unverifiedRecruiter.id, entryId: globex.id, relationship: "recruiter", authority: "hiring",
  });

  const ids = async (viewerProfileId: string) =>
    (await visibleSeekers(db, { profileId: viewerProfileId }, { limit: 100 }))
      .filter((s) => s.displayName.startsWith("hidden") || s.displayName.startsWith("employers")
        || s.displayName.startsWith("open") || s.displayName.startsWith("private") || s.displayName.startsWith("stale"))
      .map((s) => s.displayName);

  const asPlain = await ids(plain.id);
  check("matched_only is never listed", !asPlain.includes("hidden-matched-only"), asPlain.join(",") || "none");
  check("private is never listed", !asPlain.includes("private"));
  check("stale (>90d) is treated as unknown", !asPlain.includes("stale"));
  check("all_members visible to a plain member", asPlain.includes("open-to-all"));
  check("verified_employers hidden from a plain member", !asPlain.includes("employers-only"));

  const asVerified = await ids(verifiedRecruiter.id);
  check("verified hiring authority sees verified_employers", asVerified.includes("employers-only"), asVerified.join(","));
  check("...but still NOT matched_only", !asVerified.includes("hidden-matched-only"));
  check("...and still NOT private", !asVerified.includes("private"));

  const asUnverified = await ids(unverifiedRecruiter.id);
  check("hiring authority WITHOUT verification cannot see verified_employers",
    !asUnverified.includes("employers-only"), asUnverified.join(",") || "none");

  // The headline rule: your own employer never sees you looking.
  const asColleague = await ids(acmeColleague.id);
  check("EMPLOYER EXCLUSION: same-org recruiter sees no Acme candidate",
    !asColleague.includes("open-to-all") && !asColleague.includes("employers-only")
      && !asColleague.includes("hidden-matched-only"),
    asColleague.join(",") || "none");

  // ...while an outside recruiter still sees the same person.
  check("outside recruiter still sees that candidate", asVerified.includes("open-to-all"));

  const asSelf = await ids(open.id);
  check("a member is not listed to themselves", !asSelf.includes("open-to-all"));

  await cleanup();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  process.exit(1);
});
