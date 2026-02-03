import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { INTERESTS_OPTIONS } from "../../../lib/onboarding-options";
import { cn } from "../../../lib/utils";

interface StepInterestsProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepInterests({
  formData,
  errors,
  onUpdate,
}: StepInterestsProps) {
  const selected = formData.interests ?? [];

  const toggleInterest = (value: string) => {
    const newInterests = selected.includes(value)
      ? selected.filter((i) => i !== value)
      : [...selected, value];
    onUpdate("interests", newInterests);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          What are you most interested in?
        </h2>
        <p className="text-muted-foreground">
          Select all that apply. This helps us connect you with relevant content
          and people.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {INTERESTS_OPTIONS.map((option, index) => {
          const isSelected = selected.includes(option.value);
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => toggleInterest(option.value)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span className="text-sm font-medium">{option.label}</span>
            </motion.button>
          );
        })}
      </div>

      {errors.interests && (
        <p className="text-sm text-destructive">{errors.interests}</p>
      )}

      {selected.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selected.length} selected
        </p>
      )}
    </motion.div>
  );
}
