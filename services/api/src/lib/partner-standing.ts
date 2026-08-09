/** Pure helpers for scoping Boomin partner-standing reads to one member.
 *
 *  The member-facing /v1/dashboard/creators endpoint must NEVER return the
 *  whole program roster — standing calls are scoped by the same externalUserId
 *  Atlantium handed to Boomin at signed-handoff time. These helpers are the
 *  single source of that derivation and of the fallback-row matcher, kept pure
 *  (and out of routes/app.ts) so the scoping contract stays unit-testable.
 */

export function getRecord(value: Record<string, unknown> | null | undefined, key: string) {
  const result = value?.[key];
  return result && typeof result === "object" && !Array.isArray(result)
    ? result as Record<string, unknown>
    : null;
}

export function getString(value: Record<string, unknown> | null | undefined, key: string) {
  const result = value?.[key];
  return typeof result === "string" && result ? result : null;
}

/** The one derivation of a Boomin external user id from an Atlantium profile —
 *  the same value handed to Boomin at signed-handoff time (see
 *  buildHandoffOptions and /handoff/current-user), so standing lookups key on
 *  exactly what enrollment stored. */
export function profileExternalUserId(profile: { id: string }) {
  return `atlantium_profile_${profile.id}`;
}

/** Boomin's enrollment metadata (surfaced as connectMetadata in app standing
 *  rows) records the handoff externalUserId — the key we scope members by. */
export function localPartnerExternalUserId(row: Record<string, unknown>) {
  const connectMetadata = getRecord(row, "connectMetadata") || getRecord(row, "connect_metadata");
  const metadata = getRecord(row, "metadata");
  return getString(connectMetadata, "externalUserId")
    || getString(connectMetadata, "external_user_id")
    || getString(metadata, "externalUserId")
    || getString(metadata, "external_user_id");
}
