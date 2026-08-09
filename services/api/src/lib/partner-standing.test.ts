import { describe, expect, it } from "vitest";
import { localPartnerExternalUserId, profileExternalUserId } from "./partner-standing";

describe("profileExternalUserId", () => {
  it("derives the handoff external user id from the active profile", () => {
    expect(profileExternalUserId({ id: "abc-123" })).toBe("atlantium_profile_abc-123");
  });
});

describe("localPartnerExternalUserId", () => {
  it("reads the handoff externalUserId from connectMetadata", () => {
    expect(localPartnerExternalUserId({
      connectMetadata: { issuer: "atlantium.ai", externalUserId: "atlantium_profile_p1" },
    })).toBe("atlantium_profile_p1");
  });

  it("reads snake_case variants", () => {
    expect(localPartnerExternalUserId({
      connect_metadata: { external_user_id: "atlantium_profile_p2" },
    })).toBe("atlantium_profile_p2");
    expect(localPartnerExternalUserId({
      metadata: { external_user_id: "atlantium_profile_p3" },
    })).toBe("atlantium_profile_p3");
  });

  it("returns null when the row carries no external user id — the scoped filter must then EXCLUDE it", () => {
    const row = { connectMetadata: { issuer: "atlantium.ai" } };
    const id = localPartnerExternalUserId(row);
    expect(id).toBeNull();

    // The member-scoping contract used by /v1/dashboard/creators' fallback:
    // a row that cannot prove it belongs to the caller never reaches them.
    const externalUserId = "atlantium_profile_me";
    const rows = [
      row,
      { connectMetadata: { externalUserId: "atlantium_profile_someone_else" } },
      { connectMetadata: { externalUserId } },
    ];
    const scoped = rows.filter((r) => localPartnerExternalUserId(r) === externalUserId);
    expect(scoped).toHaveLength(1);
    expect(localPartnerExternalUserId(scoped[0])).toBe(externalUserId);
  });
});
