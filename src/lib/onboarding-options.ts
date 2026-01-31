// Onboarding step options for multi-select and single-select fields

export const PRIMARY_GOAL_OPTIONS = [
  { value: "build_startup", label: "Build a startup or indie product" },
  { value: "career_transition", label: "Transition into AI/tech career" },
  { value: "upskill_current_role", label: "Upskill for my current role" },
  { value: "learn_ai_fundamentals", label: "Learn AI fundamentals" },
  { value: "find_collaborators", label: "Find collaborators or co-founders" },
  { value: "network_community", label: "Network and be part of a community" },
  { value: "explore_curious", label: "Just exploring / curious" },
] as const;

export const INTERESTS_OPTIONS = [
  { value: "ai_fundamentals", label: "AI fundamentals & concepts" },
  { value: "building_agents", label: "Building AI agents" },
  { value: "prompt_engineering", label: "Prompt engineering" },
  { value: "llm_applications", label: "LLM applications" },
  { value: "machine_learning", label: "Machine learning" },
  { value: "software_engineering", label: "Software engineering" },
  { value: "product_design", label: "Product design & UX" },
  { value: "startups_entrepreneurship", label: "Startups & entrepreneurship" },
  { value: "no_code_tools", label: "No-code/low-code AI tools" },
  { value: "research_papers", label: "AI research & papers" },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: "yes_actively", label: "Yes - actively building" },
  { value: "yes_early", label: "Yes - early stages / ideation" },
  { value: "looking_for_ideas", label: "No - looking for project ideas" },
  { value: "not_right_now", label: "No - not right now" },
] as const;

export const TECHNICAL_LEVEL_OPTIONS = [
  { value: "no_experience", label: "No technical experience" },
  { value: "some_exposure", label: "Some exposure (used ChatGPT, tried tutorials)" },
  { value: "intermediate", label: "Intermediate (can code, built small projects)" },
  { value: "advanced", label: "Advanced (professional developer / ML engineer)" },
] as const;

export const COMMUNITY_HOPES_OPTIONS = [
  { value: "accountability", label: "Accountability & motivation" },
  { value: "mentorship", label: "Mentorship & guidance" },
  { value: "networking", label: "Networking & connections" },
  { value: "feedback", label: "Feedback on my work" },
  { value: "collaboration", label: "Finding collaborators" },
  { value: "learning_resources", label: "Learning resources & content" },
  { value: "job_opportunities", label: "Job opportunities" },
] as const;

export const TIME_COMMITMENT_OPTIONS = [
  { value: "1_5_hours", label: "1-5 hours per week" },
  { value: "5_10_hours", label: "5-10 hours per week" },
  { value: "10_20_hours", label: "10-20 hours per week" },
  { value: "20_plus_hours", label: "20+ hours per week" },
] as const;

// Common timezones with user-friendly labels
export const TIMEZONE_OPTIONS = [
  // Americas
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (BRT)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (ART)" },

  // Europe
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Zurich", label: "Zurich (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },

  // Asia & Pacific
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB)" },

  // Oceania
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST, no DST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },

  // Africa
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Africa/Cairo", label: "Cairo (EET)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)" },
] as const;

// Helper to get user's detected timezone
export function detectUserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it's in our list
    const found = TIMEZONE_OPTIONS.find((tz) => tz.value === detected);
    if (found) return detected;
    // Default to America/New_York if not found
    return "America/New_York";
  } catch {
    return "America/New_York";
  }
}

// Helper to get label for a value
export function getOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string
): string {
  return options.find((opt) => opt.value === value)?.label ?? value;
}

// Type exports for use in components
export type PrimaryGoal = (typeof PRIMARY_GOAL_OPTIONS)[number]["value"];
export type Interest = (typeof INTERESTS_OPTIONS)[number]["value"];
export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number]["value"];
export type TechnicalLevel = (typeof TECHNICAL_LEVEL_OPTIONS)[number]["value"];
export type CommunityHope = (typeof COMMUNITY_HOPES_OPTIONS)[number]["value"];
export type TimeCommitment = (typeof TIME_COMMITMENT_OPTIONS)[number]["value"];
export type Timezone = (typeof TIMEZONE_OPTIONS)[number]["value"];
