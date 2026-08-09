import { describe, expect, it } from "vitest";
import type { CreatorDashboardResponse, CreatorDeployment } from "./api";
import { deploymentCard, deriveMyStanding, minorToDollars } from "./partners";

// Fixture mirroring Boomin's /v1/connect/standing deployments[] entry
// (api/src/routes/connect.ts activeDeploymentsByEnrollment DeploymentView).
const liveDeployment: CreatorDeployment = {
  id: "dep_1",
  status: "active",
  observed_status: "live",
  channel: "instagram",
  format: "reel",
  distribution: {
    id: "dist_1",
    name: "Fall Enrollment Push",
    objective: "signups",
    status: "active",
  },
  link: {
    code: "atl-fall-9k2",
    url: "https://atlantium.ai/r/atl-fall-9k2",
    status: "active",
  },
  performance: { events: 42, value_minor: 123450 },
};

const pausedDeployment: CreatorDeployment = {
  id: "dep_2",
  status: "paused",
  observed_status: "paused",
  channel: "instagram",
  format: "story",
  distribution: { id: "dist_2", name: "Winter Teaser", objective: "awareness", status: "active" },
  link: { code: "atl-wint-3fa", url: "https://atlantium.ai/r/atl-wint-3fa", status: "active" },
  performance: { events: 0, value_minor: 0 },
};

describe("minorToDollars", () => {
  it("converts value_minor cents to a two-decimal dollar label", () => {
    expect(minorToDollars(123450)).toBe("$1,234.50");
    expect(minorToDollars(5)).toBe("$0.05");
  });

  it("treats missing or bad values as zero", () => {
    expect(minorToDollars(0)).toBe("$0.00");
    expect(minorToDollars(null)).toBe("$0.00");
    expect(minorToDollars(undefined)).toBe("$0.00");
    expect(minorToDollars(Number.NaN)).toBe("$0.00");
  });
});

describe("deploymentCard", () => {
  it("derives the full card for a live deployment", () => {
    expect(deploymentCard(liveDeployment)).toEqual({
      id: "dep_1",
      name: "Fall Enrollment Push",
      objective: "signups",
      channel: "instagram",
      format: "reel",
      paused: false,
      linkCode: "atl-fall-9k2",
      linkUrl: "https://atlantium.ai/r/atl-fall-9k2",
      events: 42,
      valueLabel: "$1,234.50",
    });
  });

  it("marks paused deployments as paused", () => {
    const card = deploymentCard(pausedDeployment);
    expect(card.paused).toBe(true);
    expect(card.name).toBe("Winter Teaser");
    expect(card.valueLabel).toBe("$0.00");
  });

  it("survives a deployment with no link and no performance", () => {
    const card = deploymentCard({ id: "dep_3", status: "active", distribution: { name: "Bare" } });
    expect(card.linkCode).toBeNull();
    expect(card.linkUrl).toBeNull();
    expect(card.events).toBe(0);
    expect(card.valueLabel).toBe("$0.00");
  });

  it("falls back to a generic name when the distribution is unnamed", () => {
    expect(deploymentCard({ id: "dep_4" }).name).toBe("Campaign");
  });
});

describe("deriveMyStanding", () => {
  const response: CreatorDashboardResponse = {
    success: true,
    partners: [
      {
        member: {
          id: "member_1",
          approvalStatus: "approved",
          qualificationStatus: "qualified",
          referralCode: "atl-me-77",
        },
        referral: {
          code: "atl-me-77",
          url: "https://atlantium.ai/r/atl-me-77",
          active: true,
        },
        tier: { name: "Gold", rank: 2 },
        deployments: [liveDeployment, pausedDeployment],
      },
    ],
  };

  it("derives standing, referral, and campaign cards from the scoped row", () => {
    const standing = deriveMyStanding(response);
    expect(standing).not.toBeNull();
    expect(standing?.approval).toBe("approved");
    expect(standing?.qualification).toBe("qualified");
    expect(standing?.tierName).toBe("Gold");
    expect(standing?.referralCode).toBe("atl-me-77");
    expect(standing?.referralUrl).toBe("https://atlantium.ai/r/atl-me-77");
    expect(standing?.deployments.map((d) => d.id)).toEqual(["dep_1", "dep_2"]);
  });

  it("returns null when the member is not a partner (empty scoped roster)", () => {
    expect(deriveMyStanding({ success: true, partners: [] })).toBeNull();
    expect(deriveMyStanding(null)).toBeNull();
  });

  it("reads snake_case member fields and defaults missing statuses to pending", () => {
    const standing = deriveMyStanding({
      success: true,
      partners: [{ member: { id: "m2", approval_status: "pending", referral_code: "atl-x" } }],
    });
    expect(standing?.approval).toBe("pending");
    expect(standing?.qualification).toBe("pending");
    expect(standing?.referralCode).toBe("atl-x");
    expect(standing?.referralUrl).toBeNull();
    expect(standing?.deployments).toEqual([]);
  });
});
