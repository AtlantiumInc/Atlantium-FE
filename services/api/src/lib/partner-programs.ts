/**
 * The partner-program registry (task #23 hub): the two Boomin programs a
 * logged-in member can join from /creator-program, each with its own Connect
 * surface (one surface = one program on Boomin's side).
 *
 * - tech_creator — Instagram-scoped; the channel gates + the 1000-follower
 *   floor live as Boomin requirements and arrive via the live program card.
 * - head_hunter — approval-gated (surface default_approval_status=pending);
 *   tiers ladder over the tenant metrics `x:qualified_candidates` /
 *   `x:revenue_startups`, which Atlantium emits from onboarding-derived facts
 *   (education bachelors+, venture stage "revenue").
 *
 * Program CARDS (requirements + tiers) are read live from the platform API
 * with BOOMIN_PLATFORM_SECRET and cached briefly per isolate. Reward copy is
 * static here and mirrors the REAL reward rules configured on Boomin — the
 * rules fire server-side either way; the copy is display.
 */

import type { Env } from "../env";

export type PartnerProgramKey = "tech_creator" | "head_hunter";

export interface PartnerProgramDef {
  key: PartnerProgramKey;
  name: string;
  tagline: string;
  details: string[];
  rewards: Array<{ label: string; amount: string }>;
  /** Present only when the env carries the surface — absent config hides the
   *  program rather than serving a broken join button. */
  publicKey: (env: Env) => string | undefined;
  programId: (env: Env) => string | undefined;
  signingSecret: (env: Env) => string | undefined;
  approvalRequired: boolean;
}

export const PARTNER_PROGRAMS: PartnerProgramDef[] = [
  {
    key: "tech_creator",
    name: "Tech Creator Program",
    tagline: "Create for Atlanta tech. Your reach, your link, your standing.",
    details: [
      "Connect your Instagram — the program is scoped to it.",
      "Keep 1,000+ followers to stay qualified.",
      "Your referral link credits every signup you drive.",
    ],
    rewards: [{ label: "Referred member signup", amount: "250 credits" }],
    publicKey: (env) => env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h",
    programId: (env) => env.BOOMIN_CONNECT_PROGRAM_ID,
    signingSecret: (env) => env.HANDOFF_SIGNING_SECRET,
    approvalRequired: false,
  },
  {
    key: "head_hunter",
    name: "Head Hunter Program",
    tagline: "Bring Atlanta's best into the network — and earn on every placement.",
    details: [
      "Approval required — apply and we review every head hunter.",
      "A qualified candidate is a referred member who completes onboarding holding a bachelor's degree or higher.",
      "A revenue startup is a referred founder whose company is making revenue.",
      "Climb Scout → Recruiter (3 candidates) → Rainmaker (10, or land a revenue startup).",
    ],
    rewards: [
      { label: "Qualified candidate placed", amount: "500 credits" },
      { label: "Revenue startup landed", amount: "2,000 credits" },
    ],
    publicKey: (env) => env.BOOMIN_HEADHUNTER_PUBLIC_KEY,
    programId: (env) => env.BOOMIN_HEADHUNTER_PROGRAM_ID,
    signingSecret: (env) => env.BOOMIN_HEADHUNTER_SIGNING_SECRET,
    approvalRequired: true,
  },
];

export function partnerProgram(key: string): PartnerProgramDef | undefined {
  return PARTNER_PROGRAMS.find((p) => p.key === key);
}

/** A program is SERVABLE when its surface is fully configured in this env. */
export function servablePrograms(env: Env): PartnerProgramDef[] {
  return PARTNER_PROGRAMS.filter((p) => p.publicKey(env) && p.programId(env) && p.signingSecret(env));
}

// ── Live program cards (platform reads, brief per-isolate cache) ─────────────

export interface ProgramCardRequirement {
  metricKey: string;
  operator: string | null;
  threshold: number | null;
  windowDays: number | null;
  required: boolean;
  scope: string;
  /** Tier name when the requirement is a tier rung. */
  tier: string | null;
}

export interface ProgramCard {
  requirements: ProgramCardRequirement[];
  tiers: Array<{ name: string; rank: number }>;
}

const cardCache = new Map<string, { at: number; card: ProgramCard }>();
const CARD_TTL_MS = 5 * 60 * 1000;

async function platformGet(env: Env, path: string): Promise<Record<string, unknown> | null> {
  const secret = env.BOOMIN_PLATFORM_SECRET;
  if (!secret) return null;
  const base = (env.BOOMIN_PLATFORM_API_BASE || "https://api.boomin.ai/v1/platform").replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return null;
  return await res.json() as Record<string, unknown>;
}

/**
 * The live card: active requirements + tiers straight off the platform API —
 * the page shows what the evaluator actually enforces, never a copy that can
 * drift. Null when the platform secret is absent or Boomin is unreachable
 * (the FE renders the static details instead).
 */
export async function loadProgramCard(env: Env, programId: string): Promise<ProgramCard | null> {
  const cached = cardCache.get(programId);
  if (cached && Date.now() - cached.at < CARD_TTL_MS) return cached.card;
  try {
    const [reqs, tiers] = await Promise.all([
      platformGet(env, `/programs/prog_${programId}/requirements?limit=100`),
      platformGet(env, `/programs/prog_${programId}/tiers?limit=100`),
    ]);
    if (!reqs || !tiers) return null;
    const tierRows = ((tiers.data ?? []) as Array<Record<string, unknown>>)
      .filter((t) => t.status !== "archived")
      .map((t) => ({ id: String(t.id), name: String(t.name), rank: Number(t.rank ?? 0) }))
      .sort((a, b) => a.rank - b.rank);
    const tierName = new Map(tierRows.map((t) => [t.id, t.name]));
    const card: ProgramCard = {
      tiers: tierRows.map(({ name, rank }) => ({ name, rank })),
      requirements: ((reqs.data ?? []) as Array<Record<string, unknown>>)
        .filter((r) => r.status === "active")
        .map((r) => ({
          metricKey: String(r.metric_key),
          operator: r.operator == null ? null : String(r.operator),
          threshold: r.threshold == null ? null : Number(r.threshold),
          windowDays: r.window_days == null ? null : Number(r.window_days),
          required: Boolean(r.required),
          scope: String(r.scope),
          tier: r.scope === "tier" ? (tierName.get(String(r.scope_id)) ?? null) : null,
        })),
    };
    cardCache.set(programId, { at: Date.now(), card });
    return card;
  } catch {
    return null;
  }
}
