import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { profileMembers, profiles, user } from "../db/schema";

export type AuthUser = typeof user.$inferSelect;

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "profile";
}

export async function ensureDefaultProfile(db: Db, authUser: AuthUser) {
  const existing = await getActiveProfile(db, authUser.id);
  if (existing) return existing;

  const rows = await db
    .select({ profile: profiles, membership: profileMembers })
    .from(profileMembers)
    .innerJoin(profiles, eq(profiles.id, profileMembers.profileId))
    .where(eq(profileMembers.userId, authUser.id))
    .limit(1);

  if (rows[0]) {
    await setActiveProfile(db, authUser.id, rows[0].profile.id);
    return { ...rows[0].profile, role: rows[0].membership.role, isActive: true };
  }

  const displayName = authUser.name || authUser.email.split("@")[0] || "Atlantium Member";
  const slug = `${slugify(displayName)}-${authUser.id.slice(0, 8)}`;
  const [profile] = await db
    .insert(profiles)
    .values({
      ownerUserId: authUser.id,
      displayName,
      slug,
      type: "personal",
      avatarUrl: authUser.image ?? null,
      metadata: { source: "better_auth_first_login" },
    })
    .returning();

  await db.insert(profileMembers).values({
    profileId: profile.id,
    userId: authUser.id,
    role: "owner",
    isActive: true,
  });

  return { ...profile, role: "owner" as const, isActive: true };
}

export async function getActiveProfile(db: Db, userId: string) {
  const [row] = await db
    .select({ profile: profiles, membership: profileMembers })
    .from(profileMembers)
    .innerJoin(profiles, eq(profiles.id, profileMembers.profileId))
    .where(and(eq(profileMembers.userId, userId), eq(profileMembers.isActive, true)))
    .limit(1);
  if (!row) return null;
  return { ...row.profile, role: row.membership.role, isActive: row.membership.isActive };
}

export async function listProfiles(db: Db, userId: string) {
  const rows = await db
    .select({ profile: profiles, membership: profileMembers })
    .from(profileMembers)
    .innerJoin(profiles, eq(profiles.id, profileMembers.profileId))
    .where(eq(profileMembers.userId, userId));
  return rows.map((row) => ({ ...row.profile, role: row.membership.role, isActive: row.membership.isActive }));
}

export async function setActiveProfile(db: Db, userId: string, profileId: string) {
  const [membership] = await db
    .select()
    .from(profileMembers)
    .where(and(eq(profileMembers.userId, userId), eq(profileMembers.profileId, profileId)))
    .limit(1);
  if (!membership) return null;
  await db.update(profileMembers).set({ isActive: false, updatedAt: new Date() }).where(eq(profileMembers.userId, userId));
  const [updated] = await db
    .update(profileMembers)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(profileMembers.userId, userId), eq(profileMembers.profileId, profileId)))
    .returning();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile || !updated) return null;
  return { ...profile, role: updated.role, isActive: updated.isActive };
}

export function publicUser(authUser: AuthUser, activeProfile: Awaited<ReturnType<typeof ensureDefaultProfile>>) {
  return {
    id: authUser.id,
    email: authUser.email,
    is_email_verified: authUser.emailVerified,
    created_at: authUser.createdAt?.toISOString?.() ?? authUser.createdAt,
    avatar: authUser.image,
    display_name: activeProfile.displayName,
    first_name: activeProfile.displayName.split(" ")[0] || activeProfile.displayName,
    last_name: activeProfile.displayName.split(" ").slice(1).join(" ") || undefined,
    has_access: true,
    is_admin: false,
    _profile: {
      id: activeProfile.id,
      display_name: activeProfile.displayName,
      avatar_url: activeProfile.avatarUrl,
      type: activeProfile.type,
      registration_details: {
        is_completed: true,
      },
    },
  };
}
