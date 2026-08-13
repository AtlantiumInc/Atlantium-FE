import { motion } from "motion/react";
import { Eye, EyeOff, Lock, Users } from "lucide-react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { cn } from "../../../lib/utils";

interface StepSeekingProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

const SEEKING = [
  { value: "not_seeking" as const, label: "Happy where I am", blurb: "Not looking right now" },
  { value: "open" as const, label: "Open to the right thing", blurb: "Not searching, but I'd listen" },
  { value: "actively_looking" as const, label: "Actively looking", blurb: "I want a new role soon" },
];

/**
 * Visibility is asked in the same breath as status, never buried in settings
 * (plan §5.2) — because the honest answer to "are you looking?" depends
 * entirely on who gets to know.
 */
const VISIBILITY = [
  {
    value: "matched_only" as const,
    icon: Lock,
    label: "Only through Atlantium",
    blurb: "We can match you to roles and make intros. You never appear in anyone's search.",
    recommended: true,
  },
  {
    value: "verified_employers" as const,
    icon: Users,
    label: "Verified hiring teams",
    blurb: "Companies we've verified can find you. Your current employer is always excluded.",
  },
  {
    value: "all_members" as const,
    icon: Eye,
    label: "Any lab member",
    blurb: "Anyone in the lab can see you're open.",
  },
  {
    value: "private" as const,
    icon: EyeOff,
    label: "Nobody",
    blurb: "Just for your own records — we won't act on it.",
  },
];

export function StepSeeking({ formData, errors, onUpdate }: StepSeekingProps) {
  const seeking = formData.seeking ?? "not_seeking";
  const visibility = formData.seeking_visibility ?? "matched_only";
  const showVisibility = seeking !== "not_seeking";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Are you looking?</h2>
        <p className="text-muted-foreground">
          Honest answers make the job board useful. Nothing here is public by default.
        </p>
        {errors?.seeking && <p className="text-sm text-red-400 pt-1">{errors.seeking}</p>}
      </div>

      <div className="space-y-2">
        {SEEKING.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onUpdate("seeking", option.value)}
            className={cn(
              "w-full flex items-baseline gap-3 rounded-xl border-2 p-4 text-left transition-all",
              seeking === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="min-w-0">
              <span className="block font-medium">{option.label}</span>
              <span className="block text-sm text-muted-foreground">{option.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      {showVisibility && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3 pt-2"
        >
          <div>
            <h3 className="text-sm font-semibold">Who should be able to see that?</h3>
            <p className="text-xs text-muted-foreground">
              Your current employer is excluded automatically, whatever you pick.
            </p>
          </div>
          <div className="space-y-2">
            {VISIBILITY.map((option) => {
              const Icon = option.icon;
              const isSelected = visibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdate("seeking_visibility", option.value)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/40"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {option.label}
                      {option.recommended && (
                        <span className="text-[10px] uppercase tracking-wider text-primary">
                          Default
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">{option.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
