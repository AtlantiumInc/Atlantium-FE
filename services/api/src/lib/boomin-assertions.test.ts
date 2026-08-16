import { describe, expect, it } from "vitest";
import {
  MANAGED_ASSERTION_KEYS,
  desiredAssertions,
  primaryOperatingType,
} from "./boomin-assertions";

const past = new Date("2020-01-01T00:00:00Z");
const future = new Date("2030-01-01T00:00:00Z");
const further = new Date("2031-01-01T00:00:00Z");

describe("desiredAssertions", () => {
  it("projects confirmed personas only — inferred/unconfirmed roles assert nothing", () => {
    const desired = desiredAssertions({
      roles: [
        { role: "advisor", confirmedAt: past },
        { role: "founder", confirmedAt: null },
      ],
      grants: [],
      membershipTier: "free",
    });
    expect(Object.keys(desired)).toEqual(["persona_advisor"]);
    expect(desired.persona_advisor).toEqual({ value: true });
  });

  it("projects live grants as <type>_verified, FORWARDING expiry", () => {
    const desired = desiredAssertions({
      roles: [],
      grants: [
        { verification: "advisor", expiresAt: future },
        { verification: "identity", expiresAt: null },
      ],
    });
    expect(desired.advisor_verified).toEqual({ value: true, expiresAt: future.toISOString() });
    expect(desired.identity_verified).toEqual({ value: true });
  });

  it("several live grants of one type: non-expiring wins, else the furthest expiry", () => {
    const dated = desiredAssertions({
      roles: [],
      grants: [
        { verification: "investor", expiresAt: future },
        { verification: "investor", expiresAt: further },
      ],
    });
    expect(dated.investor_verified?.expiresAt).toBe(further.toISOString());

    const open = desiredAssertions({
      roles: [],
      grants: [
        { verification: "investor", expiresAt: null },
        { verification: "investor", expiresAt: future },
      ],
    });
    expect(open.investor_verified).toEqual({ value: true });
  });

  it("the domain verification type never projects — it is org plumbing", () => {
    const desired = desiredAssertions({
      roles: [],
      grants: [{ verification: "domain", expiresAt: null }],
    });
    expect(Object.keys(desired)).toEqual([]);
  });

  it("club_member follows a paid tier; free / absent grants nothing", () => {
    expect(desiredAssertions({ roles: [], grants: [], membershipTier: "club" }).club_member).toEqual({ value: true });
    expect(desiredAssertions({ roles: [], grants: [], membershipTier: "club_annual" }).club_member).toEqual({ value: true });
    expect(desiredAssertions({ roles: [], grants: [], membershipTier: "free" }).club_member).toBeUndefined();
    expect(desiredAssertions({ roles: [], grants: [] }).club_member).toBeUndefined();
  });

  it("PRIVACY INVARIANT: nothing resembling seeking status can ever project", () => {
    // The function only reads roles/grants/tier — but pin the output namespace
    // too, so a future edit cannot smuggle a seeking key past review.
    const desired = desiredAssertions({
      roles: [
        { role: "professional", confirmedAt: past },
        { role: "advisor", confirmedAt: past },
      ],
      grants: [
        { verification: "advisor", expiresAt: null },
        { verification: "identity", expiresAt: null },
        { verification: "employment", expiresAt: null },
        { verification: "org_authority", expiresAt: null },
        { verification: "investor", expiresAt: null },
      ],
      membershipTier: "club",
    });
    for (const key of Object.keys(desired)) {
      expect((MANAGED_ASSERTION_KEYS as readonly string[]).includes(key)).toBe(true);
      expect(key).not.toMatch(/seek/i);
    }
    expect((MANAGED_ASSERTION_KEYS as readonly string[]).some((k) => /seek/i.test(k))).toBe(false);
  });
});

describe("primaryOperatingType", () => {
  it("orders advisor > investor > founder > professional over CONFIRMED roles", () => {
    const all = [
      { role: "professional", confirmedAt: past },
      { role: "founder", confirmedAt: past },
      { role: "investor", confirmedAt: past },
      { role: "advisor", confirmedAt: past },
    ];
    expect(primaryOperatingType(all)).toBe("advisor");
    expect(primaryOperatingType(all.slice(0, 3))).toBe("investor");
    expect(primaryOperatingType(all.slice(0, 2))).toBe("founder");
    expect(primaryOperatingType(all.slice(0, 1))).toBe("professional");
  });

  it("unconfirmed roles do not count; nothing confirmed = undefined", () => {
    expect(primaryOperatingType([{ role: "advisor", confirmedAt: null }])).toBeUndefined();
    expect(primaryOperatingType([])).toBeUndefined();
  });
});
