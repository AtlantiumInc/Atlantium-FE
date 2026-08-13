import { z } from "zod";
import {
  PRIMARY_GOAL_OPTIONS,
  INTERESTS_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  TECHNICAL_LEVEL_OPTIONS,
  COMMUNITY_HOPES_OPTIONS,
  TIME_COMMITMENT_OPTIONS,
  TIMEZONE_OPTIONS,
} from "./onboarding-options";

// Extract values for validation
const primaryGoalValues = PRIMARY_GOAL_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const interestValues = INTERESTS_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const projectStatusValues = PROJECT_STATUS_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const technicalLevelValues = TECHNICAL_LEVEL_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const communityHopeValues = COMMUNITY_HOPES_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const timeCommitmentValues = TIME_COMMITMENT_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const timezoneValues = TIMEZONE_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];

// Individual step schemas
export const nameSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  phone_number: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be 20 characters or less")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
});

export const timezoneSchema = z.object({
  timezone: z.enum(timezoneValues, {
    message: "Please select a timezone",
  }),
  is_georgia_resident: z.boolean().optional(),
});

export const primaryGoalSchema = z.object({
  primary_goal: z.enum(primaryGoalValues, {
    message: "Please select your primary goal",
  }),
});

export const interestsSchema = z.object({
  interests: z
    .array(z.enum(interestValues))
    .min(1, "Please select at least one interest"),
});

export const personaSchema = z.object({
  persona: z.enum(["professional", "founder", "investor", "advisor"], {
    message: "Pick the role that fits you best — you can add others later",
  }),
});

export const seekingSchema = z.object({
  seeking: z.enum(["not_seeking", "open", "actively_looking"]).optional(),
  seeking_visibility: z
    .enum(["private", "matched_only", "verified_employers", "all_members"])
    .optional(),
});

export const membershipTierSchema = z.object({
  membership_tier: z.enum(["free", "club", "club_annual"], {
    message: "Pick how you're joining — Club, Annual, or free for now",
  }),
});

export const projectStatusSchema = z.object({
  working_on_project: z.enum(projectStatusValues, {
    message: "Please select your project status",
  }),
});

export const projectDescriptionSchema = z.object({
  project_description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),
});

export const technicalLevelSchema = z.object({
  technical_level: z.enum(technicalLevelValues, {
    message: "Please select your technical level",
  }),
});

export const communityHopesSchema = z.object({
  community_hopes: z
    .array(z.enum(communityHopeValues))
    .min(1, "Please select at least one option"),
});

export const timeCommitmentSchema = z.object({
  time_commitment: z.enum(timeCommitmentValues).optional(),
});

export const successDefinitionSchema = z.object({
  success_definition: z
    .string()
    .max(500, "Response must be 500 characters or less")
    .optional(),
});

export const avatarSchema = z.object({
  avatar_url: z.string().url().optional().or(z.literal("")),
});

// Full onboarding form schema
export const onboardingFormSchema = z
  .object({
    // Profile columns
    first_name: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must be 50 characters or less"),
    last_name: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must be 50 characters or less"),
    phone_number: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .max(20, "Phone number must be 20 characters or less")
      .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
    avatar_url: z.string().url().optional().or(z.literal("")),

    // registration_details fields
    timezone: z.enum(timezoneValues),
    is_georgia_resident: z.boolean().optional(),
    primary_goal: z.enum(primaryGoalValues),
    interests: z.array(z.enum(interestValues)).min(1),
    persona: z.enum(["professional", "founder", "investor", "advisor"]).optional(),
    seeking: z.enum(["not_seeking", "open", "actively_looking"]).optional(),
    seeking_visibility: z.enum(["private", "matched_only", "verified_employers", "all_members"]).optional(),
    membership_tier: z.enum(["free", "club", "club_annual"]).optional(),
    working_on_project: z.enum(projectStatusValues),
    project_description: z.string().max(1000).optional(),
    technical_level: z.enum(technicalLevelValues),
    community_hopes: z.array(z.enum(communityHopeValues)).min(1),
    time_commitment: z.enum(timeCommitmentValues).optional(),
    success_definition: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // project_description is optional but only relevant if working on a project
      if (
        data.working_on_project === "yes_actively" ||
        data.working_on_project === "yes_early"
      ) {
        return true; // description is optional but shown
      }
      return true;
    },
    {
      message: "Project description validation failed",
      path: ["project_description"],
    }
  );

// Type exports
export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;
export type NameStepData = z.infer<typeof nameSchema>;
export type TimezoneStepData = z.infer<typeof timezoneSchema>;
export type PrimaryGoalStepData = z.infer<typeof primaryGoalSchema>;
export type InterestsStepData = z.infer<typeof interestsSchema>;
export type MembershipTierStepData = z.infer<typeof membershipTierSchema>;
export type ProjectStatusStepData = z.infer<typeof projectStatusSchema>;
export type ProjectDescriptionStepData = z.infer<
  typeof projectDescriptionSchema
>;
export type TechnicalLevelStepData = z.infer<typeof technicalLevelSchema>;
export type CommunityHopesStepData = z.infer<typeof communityHopesSchema>;
export type TimeCommitmentStepData = z.infer<typeof timeCommitmentSchema>;
export type SuccessDefinitionStepData = z.infer<typeof successDefinitionSchema>;
export type AvatarStepData = z.infer<typeof avatarSchema>;

// Validation helpers for individual steps
export function validateStep(
  step: number,
  data: Partial<OnboardingFormData>
): { success: boolean; errors?: z.ZodError } {
  const schemas: Record<number, z.ZodSchema> = {
    1: nameSchema,
    2: personaSchema,          // the branch point
    3: timezoneSchema,
    4: primaryGoalSchema,
    5: interestsSchema,
    6: seekingSchema,          // professionals only
    7: projectStatusSchema,    // founders only
    8: projectDescriptionSchema,
    9: technicalLevelSchema,
    10: communityHopesSchema,
    11: timeCommitmentSchema,
    12: successDefinitionSchema,
    13: avatarSchema,
    14: membershipTierSchema,  // the money question, asked last
  };

  const schema = schemas[step];
  if (!schema) return { success: true };

  const result = schema.safeParse(data);
  return result.success
    ? { success: true }
    : { success: false, errors: result.error };
}

/**
 * Persona branches the questionnaire (plan §5.1). The point is that each member
 * answers FEWER screens than the old flat 11 — while the answers they do give
 * are all relevant to who they are.
 */
export function shouldShowStep(
  step: number,
  data: Partial<OnboardingFormData>
): boolean {
  const persona = data.persona;

  // Seeking + visibility: professionals only.
  if (step === 6) return persona === "professional";

  // Project status: founders (and advisors, who often build alongside).
  if (step === 7) return persona === "founder" || persona === "advisor";

  // Project description: only when there's actually a project.
  if (step === 8) {
    if (persona !== "founder" && persona !== "advisor") return false;
    return (
      data.working_on_project === "yes_actively" ||
      data.working_on_project === "yes_early"
    );
  }

  // Technical level is meaningful for people who build; investors skip it.
  if (step === 9) return persona !== "investor";

  // Time commitment reads as "how much will you show up" — relevant to
  // advisors and professionals, noise for investors we're comping anyway.
  if (step === 11) return persona !== "investor";

  return true;
}

// Get the next valid step, skipping conditional ones that shouldn't show
export function getNextStep(
  currentStep: number,
  data: Partial<OnboardingFormData>,
  totalSteps: number
): number {
  let next = currentStep + 1;
  while (next <= totalSteps && !shouldShowStep(next, data)) {
    next++;
  }
  return Math.min(next, totalSteps);
}

// Get the previous valid step
export function getPrevStep(
  currentStep: number,
  data: Partial<OnboardingFormData>
): number {
  let prev = currentStep - 1;
  while (prev >= 1 && !shouldShowStep(prev, data)) {
    prev--;
  }
  return Math.max(prev, 1);
}
