import { z } from "zod";
import { INTERESTS_OPTIONS, TIMEZONE_OPTIONS } from "./onboarding-options";

/**
 * Shape of the answers.
 *
 * The flow itself lives in `onboarding-steps.ts` — which questions exist, who
 * sees them, and what counts as answered. This file is only the type and the
 * one screen with real field rules (a name and a phone number can be malformed;
 * "pick one of these five" cannot).
 */
const interestValues = INTERESTS_OPTIONS.map((o) => o.value) as [string, ...string[]];
const timezoneValues = TIMEZONE_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const nameSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "First name must be 50 characters or less"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name must be 50 characters or less"),
  phone_number: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be 20 characters or less")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
});

export const onboardingFormSchema = z.object({
  // Profile columns
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone_number: z.string().min(10).max(20),
  avatar_url: z.string().url().optional().or(z.literal("")),
  timezone: z.enum(timezoneValues).optional(),

  // The fork, and the answers everyone gives
  branch: z.enum(["professional", "founder", "investor", "advisor", "hiring"]).optional(),
  headline: z.string().max(140).optional(),
  interests: z.array(z.enum(interestValues)).default([]),

  // Affiliation — an entry already in the catalog, or a name to propose
  org_entry_id: z.string().uuid().optional(),
  org_proposed_name: z.string().max(120).optional(),
  /** Display name of the chosen entry, so the picker survives a reload. */
  org_name: z.string().max(120).optional(),
  org_title: z.string().max(80).optional(),

  // professional
  seeking: z.enum(["not_seeking", "open", "actively_looking"]).optional(),
  seeking_visibility: z.enum(["private", "matched_only", "verified_employers", "all_members"]).optional(),

  // founder
  venture_stage: z.string().optional(),
  needs: z.array(z.string()).default([]),

  // investor
  check_band: z.string().optional(),
  focus_stages: z.array(z.string()).default([]),
  intro_appetite: z.enum(["none", "some", "all"]).optional(),

  // advisor
  domains: z.array(z.string()).default([]),
  engagement: z.array(z.string()).default([]),
  availability: z.enum(["open", "intro_only", "closed"]).optional(),

  // recruiter
  hiring_roles_text: z.string().max(600).optional(),
  hiring_contact: z.string().optional(),

  membership_tier: z.enum(["free", "club", "club_annual"]).optional(),
});

export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;
