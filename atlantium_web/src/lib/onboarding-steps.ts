import { INTERESTS_OPTIONS } from "./onboarding-options";

/**
 * The questionnaire, as data.
 *
 * It used to be a numeric switch over fourteen screens that every member saw,
 * which is how an investor ended up being asked their technical level and how
 * many hours a week they could commit to learning. Here the flow is an ordered
 * list and each entry declares which branches see it, so "what does a founder
 * actually answer" is something you can read rather than trace.
 *
 * The rule for adding one: an answer must either route the member to someone or
 * unlock a capability. If it does neither it belongs in the profile editor, not
 * in the thing standing between a person and the network.
 */
export type Branch = "professional" | "founder" | "investor" | "advisor" | "hiring";

export type StepKind =
  | "identity"   // name + photo
  | "branch"     // the fork
  | "text"       // one line, or a short list one-per-line
  | "choice"     // pick one
  | "multi"      // pick several
  | "org"        // directory picker, starts a claim
  | "seeking"    // status + who can see it, asked together
  | "pricing";

export type StepOption = {
  value: string;
  label: string;
  hint?: string;
  /** Noun form. The branch labels are first-person sentences ("I invest"),
   *  which read wrong as a field on a profile. */
  short?: string;
};

export type StepDef = {
  id: string;
  kind: StepKind;
  /** Which branches see this step. Absent means everyone. */
  branches?: Branch[];
  question: string;
  help?: string;
  /** The formData key this step writes. */
  field?: string;
  options?: readonly StepOption[];
  optional?: boolean;
  placeholder?: string;
  /** org steps: the relationship a claim from this step asserts. */
  relationship?: "employee" | "founder" | "executive" | "recruiter" | "representative";
  /** org steps: label for the "no organization" escape hatch. */
  noOrgLabel?: string;
  /** org steps: also ask for a title. */
  withTitle?: boolean;
  /** text steps: render a textarea and split the value on newlines. */
  multiline?: boolean;
};

export const BRANCH_OPTIONS: readonly StepOption[] = [
  { value: "professional", label: "I work in tech", short: "Professional", hint: "Employed, contracting, or between things" },
  { value: "founder", label: "I'm building a company", short: "Founder", hint: "Any stage, including nights and weekends" },
  { value: "investor", label: "I invest", short: "Investor", hint: "Angel, syndicate, or a fund" },
  { value: "advisor", label: "I advise", short: "Advisor", hint: "Operators others come to for help" },
  { value: "hiring", label: "I'm hiring for a company", short: "Hiring", hint: "Recruiting or building out a team" },
];

/**
 * The fork answer is not the same thing as the persona we store. A recruiter is
 * a professional whose affiliation carries hiring authority — persona,
 * affiliation and status are separate axes (plan §3), so "hiring" resolves to a
 * professional persona with a recruiter claim rather than a fifth persona.
 */
export const PERSONA_FOR_BRANCH: Record<Branch, "professional" | "founder" | "investor" | "advisor"> = {
  professional: "professional",
  founder: "founder",
  investor: "investor",
  advisor: "advisor",
  hiring: "professional",
};

/** Check bands, in whole dollars. `null` upper bound means "and up". */
export const CHECK_BANDS: Record<string, { min: number | null; max: number | null }> = {
  under_25k: { min: 0, max: 25_000 },
  "25_100k": { min: 25_000, max: 100_000 },
  "100_500k": { min: 100_000, max: 500_000 },
  "500k_plus": { min: 500_000, max: null },
  varies: { min: null, max: null },
};

export const ONBOARDING_STEPS: readonly StepDef[] = [
  {
    id: "identity",
    kind: "identity",
    question: "What should we call you?",
    help: "Your name and a photo, if you have one handy.",
  },
  {
    id: "branch",
    kind: "branch",
    field: "branch",
    question: "Which of these sounds most like you?",
    help: "This decides what we ask next — and who we put in front of you. You can add more later.",
    options: BRANCH_OPTIONS,
  },
  {
    id: "headline",
    kind: "text",
    field: "headline",
    question: "What are you working on right now?",
    help: "One line. It's the sentence under your name everywhere in the network.",
    placeholder: "Rebuilding our payments stack at a Series A fintech",
  },
  {
    id: "interests",
    kind: "multi",
    field: "interests",
    question: "Which parts of tech are yours?",
    help: "Pick as many as fit. This is how we decide who's worth showing you.",
    options: INTERESTS_OPTIONS,
  },

  // ── professional ────────────────────────────────────────────────────────
  {
    id: "work",
    kind: "org",
    branches: ["professional"],
    field: "org_entry_id",
    question: "Where do you work, and what do you do there?",
    help: "Picking your company puts you on its page here.",
    relationship: "employee",
    withTitle: true,
    noOrgLabel: "Between things right now",
    optional: true,
  },
  {
    id: "seeking",
    kind: "seeking",
    branches: ["professional"],
    question: "Are you open to hearing about roles?",
    help: "And who gets to know. We ask both at once, because the honest answer to the first depends on the second.",
  },

  // ── founder ─────────────────────────────────────────────────────────────
  {
    id: "founder_org",
    kind: "org",
    branches: ["founder"],
    field: "org_entry_id",
    question: "Which company is yours?",
    help: "Search for it, or add it if it's not listed. We review the claim before the badge shows.",
    relationship: "founder",
    noOrgLabel: "Still deciding what to call it",
    optional: true,
  },
  {
    id: "venture_stage",
    kind: "choice",
    branches: ["founder"],
    field: "venture_stage",
    question: "Where is it right now?",
    options: [
      { value: "idea", label: "An idea", hint: "Nothing built yet" },
      { value: "building", label: "Building", hint: "Heads down, not launched" },
      { value: "live", label: "Live with users", hint: "People are using it" },
      { value: "revenue", label: "Making revenue", hint: "Customers are paying" },
      { value: "raising", label: "Raising", hint: "Actively talking to investors" },
    ],
  },
  {
    id: "needs",
    kind: "multi",
    branches: ["founder"],
    field: "needs",
    question: "What do you need most this quarter?",
    help: "The single most useful thing you'll tell us — it's what we match you on.",
    options: [
      { value: "customers", label: "Customers" },
      { value: "hires", label: "People to hire" },
      { value: "capital", label: "Capital" },
      { value: "advice", label: "Someone who's done this before" },
      { value: "cofounder", label: "A cofounder" },
    ],
  },

  // ── investor ────────────────────────────────────────────────────────────
  {
    id: "investor_org",
    kind: "org",
    branches: ["investor"],
    field: "org_entry_id",
    question: "Angel, or with a firm?",
    help: "A firm claim is reviewed the same way a founder's is. That review is what makes the badge worth anything.",
    relationship: "representative",
    noOrgLabel: "I invest on my own",
    optional: true,
  },
  {
    id: "check_band",
    kind: "choice",
    branches: ["investor"],
    field: "check_band",
    question: "What do you usually write?",
    options: [
      { value: "under_25k", label: "Under $25k" },
      { value: "25_100k", label: "$25k – $100k" },
      { value: "100_500k", label: "$100k – $500k" },
      { value: "500k_plus", label: "$500k and up" },
      { value: "varies", label: "It varies", hint: "We won't filter you on size" },
    ],
  },
  {
    id: "focus_stages",
    kind: "multi",
    branches: ["investor"],
    field: "focus_stages",
    question: "What stage do you come in at?",
    help: "Sectors carry over from what you picked earlier.",
    options: [
      { value: "pre_product", label: "Pre-product" },
      { value: "pre_seed", label: "Pre-seed" },
      { value: "seed", label: "Seed" },
      { value: "series_a", label: "Series A" },
      { value: "later", label: "Later" },
    ],
  },
  {
    id: "intro_appetite",
    kind: "choice",
    branches: ["investor"],
    field: "intro_appetite",
    question: "Do you want founder introductions?",
    help: "We read every one before it reaches you. Nothing arrives unscreened.",
    options: [
      { value: "some", label: "A couple a month", hint: "Only the ones that really fit" },
      { value: "all", label: "As many as fit", hint: "Send anything that matches your thesis" },
      { value: "none", label: "None for now", hint: "You can turn this on any time" },
    ],
  },

  // ── advisor ─────────────────────────────────────────────────────────────
  {
    id: "domains",
    kind: "multi",
    branches: ["advisor"],
    field: "domains",
    question: "What do people come to you for?",
    options: [
      { value: "gtm", label: "Going to market" },
      { value: "hiring", label: "Hiring" },
      { value: "fundraising", label: "Fundraising" },
      { value: "engineering", label: "Engineering" },
      { value: "regulation", label: "Regulation & policy" },
      { value: "design", label: "Design" },
      { value: "operations", label: "Operations" },
      { value: "finance", label: "Finance" },
    ],
  },
  {
    id: "engagement",
    kind: "multi",
    branches: ["advisor"],
    field: "engagement",
    question: "How do you like to work?",
    options: [
      { value: "advisory", label: "Formal advisory" },
      { value: "board", label: "Board seat" },
      { value: "fractional", label: "Fractional" },
      { value: "informal", label: "Just happy to answer questions" },
    ],
  },
  {
    id: "availability",
    kind: "choice",
    branches: ["advisor"],
    field: "availability",
    question: "Can founders reach you directly?",
    options: [
      { value: "open", label: "Yes, anyone can ask" },
      { value: "intro_only", label: "Only through an introduction" },
      { value: "closed", label: "Not right now" },
    ],
  },

  // ── hiring ──────────────────────────────────────────────────────────────
  {
    id: "hiring_org",
    kind: "org",
    branches: ["hiring"],
    field: "org_entry_id",
    question: "Which company are you hiring for?",
    help: "Nobody posts as a company we haven't verified them at.",
    relationship: "recruiter",
    withTitle: true,
    optional: true,
  },
  {
    id: "hiring_roles",
    kind: "text",
    branches: ["hiring"],
    field: "hiring_roles_text",
    question: "What's open right now?",
    help: "One role per line. These reach the people who told us they're listening.",
    placeholder: "Senior backend engineer\nProduct designer\nFounding AE",
    multiline: true,
    optional: true,
  },
  {
    id: "hiring_contact",
    kind: "choice",
    branches: ["hiring"],
    field: "hiring_contact",
    question: "Can candidates message you directly?",
    options: [
      { value: "anyone", label: "Yes, anyone" },
      { value: "matched", label: "Only people who match a role" },
      { value: "applications", label: "Applications only" },
    ],
  },

  // The money question, asked last — after they've seen what they're joining.
  { id: "pricing", kind: "pricing", question: "How do you want to join?" },
];

export function stepsFor(branch: Branch | undefined): StepDef[] {
  return ONBOARDING_STEPS.filter((s) => !s.branches || (branch && s.branches.includes(branch)));
}

/** Multi-select steps need at least one; text steps need a non-empty string. */
export function isAnswered(step: StepDef, value: unknown): boolean {
  if (step.optional) return true;
  switch (step.kind) {
    case "multi": return Array.isArray(value) && value.length > 0;
    case "choice":
    case "branch": return typeof value === "string" && value.length > 0;
    case "text": return typeof value === "string" && value.trim().length > 0;
    default: return true;
  }
}
