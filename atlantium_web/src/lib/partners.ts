import type {
  CreatorDashboardResponse,
  CreatorDeployment,
  CreatorStandingPartner,
} from "./api";

/** Everything the Partners tab needs about the signed-in member's standing,
 *  derived once from the (member-scoped) /dashboard/creators response. */
export interface MyStanding {
  partner: CreatorStandingPartner;
  approval: string;
  qualification: string;
  tierName: string | null;
  referralCode: string | null;
  referralUrl: string | null;
  deployments: DeploymentCard[];
}

/** Display model for one campaign card. Pure derivation — unit-tested with
 *  fixture data so the card content stays honest even before prod has
 *  campaigns to render. */
export interface DeploymentCard {
  id: string;
  name: string;
  objective: string | null;
  channel: string | null;
  format: string | null;
  paused: boolean;
  linkCode: string | null;
  linkUrl: string | null;
  events: number;
  valueLabel: string;
}

export function minorToDollars(valueMinor: number | null | undefined): string {
  const cents = Number(valueMinor ?? 0);
  const dollars = (Number.isFinite(cents) ? cents : 0) / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function deploymentCard(deployment: CreatorDeployment): DeploymentCard {
  return {
    id: deployment.id,
    name: deployment.distribution?.name?.trim() || "Campaign",
    objective: deployment.distribution?.objective?.trim() || null,
    channel: deployment.channel?.trim() || null,
    format: deployment.format?.trim() || null,
    paused: deployment.status === "paused",
    linkCode: deployment.link?.code?.trim() || null,
    linkUrl: deployment.link?.url?.trim() || null,
    events: Number(deployment.performance?.events ?? 0) || 0,
    valueLabel: minorToDollars(deployment.performance?.value_minor),
  };
}

/** The member endpoint is scoped server-side, so the caller's row is simply
 *  the first (normally only) partner entry. Null = not a partner yet. */
export function deriveMyStanding(response: CreatorDashboardResponse | null): MyStanding | null {
  const partner = response?.partners?.[0];
  if (!partner) return null;
  const approval = partner.member?.approvalStatus
    ?? partner.member?.approval_status
    ?? partner.approvalStatus
    ?? "pending";
  const qualification = partner.member?.qualificationStatus
    ?? partner.member?.qualification_status
    ?? partner.qualification?.status
    ?? partner.qualificationStatus
    ?? "pending";
  const referralCode = partner.referral?.code
    ?? partner.referralCode
    ?? partner.member?.referralCode
    ?? partner.member?.referral_code
    ?? null;
  const referralUrl = partner.referral?.url ?? partner.referralLink ?? null;
  return {
    partner,
    approval,
    qualification,
    tierName: partner.tier?.name ?? null,
    referralCode,
    referralUrl,
    deployments: (partner.deployments ?? []).map(deploymentCard),
  };
}
