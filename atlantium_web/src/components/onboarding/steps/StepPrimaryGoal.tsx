import { motion } from "motion/react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { PRIMARY_GOAL_OPTIONS } from "../../../lib/onboarding-options";
import { cn } from "../../../lib/utils";

interface StepPrimaryGoalProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepPrimaryGoal({
  formData,
  errors,
  onUpdate,
}: StepPrimaryGoalProps) {
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
          What's your primary goal?
        </h2>
        <p className="text-muted-foreground">
          This helps us personalize your experience.
        </p>
      </div>

      <div className="space-y-2">
        {PRIMARY_GOAL_OPTIONS.map((option, index) => (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onUpdate("primary_goal", option.value)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              formData.primary_goal === option.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border"
            )}
          >
            <span className="font-medium">{option.label}</span>
          </motion.button>
        ))}
        {errors.primary_goal && (
          <p className="text-sm text-destructive">{errors.primary_goal}</p>
        )}
      </div>
    </motion.div>
  );
}
