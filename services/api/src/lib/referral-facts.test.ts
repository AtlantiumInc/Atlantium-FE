import { describe, expect, it } from "vitest";
import { qualifyingFacts } from "./referral-facts";

const confirmed = new Date("2026-01-01T00:00:00Z");

describe("qualifyingFacts", () => {
  it("bachelor's and higher on a CONFIRMED persona = qualified candidate", () => {
    for (const education of ["bachelors", "masters", "doctorate"]) {
      expect(qualifyingFacts({ roles: [{ role: "professional", confirmedAt: confirmed, education }] }))
        .toContain("qualified_candidate");
    }
  });

  it("below bachelor's, missing, or unconfirmed emits nothing", () => {
    expect(qualifyingFacts({ roles: [{ role: "professional", confirmedAt: confirmed, education: "high_school" }] })).toEqual([]);
    expect(qualifyingFacts({ roles: [{ role: "professional", confirmedAt: confirmed, education: "associate" }] })).toEqual([]);
    expect(qualifyingFacts({ roles: [{ role: "professional", confirmedAt: confirmed, education: null }] })).toEqual([]);
    expect(qualifyingFacts({ roles: [{ role: "professional", confirmedAt: null, education: "doctorate" }] })).toEqual([]);
  });

  it("a confirmed founder at venture stage 'revenue' = revenue startup; raising is NOT revenue", () => {
    expect(qualifyingFacts({ roles: [{ role: "founder", confirmedAt: confirmed, ventureStage: "revenue" }] }))
      .toEqual(["revenue_startup"]);
    for (const stage of ["idea", "building", "live", "raising", null]) {
      expect(qualifyingFacts({ roles: [{ role: "founder", confirmedAt: confirmed, ventureStage: stage }] })).toEqual([]);
    }
    // The stage only counts on the FOUNDER persona.
    expect(qualifyingFacts({ roles: [{ role: "advisor", confirmedAt: confirmed, ventureStage: "revenue" }] })).toEqual([]);
  });

  it("both facts can hold at once, each exactly once", () => {
    expect(qualifyingFacts({
      roles: [
        { role: "professional", confirmedAt: confirmed, education: "masters" },
        { role: "founder", confirmedAt: confirmed, ventureStage: "revenue", education: "masters" },
      ],
    })).toEqual(["qualified_candidate", "revenue_startup"]);
  });
});
