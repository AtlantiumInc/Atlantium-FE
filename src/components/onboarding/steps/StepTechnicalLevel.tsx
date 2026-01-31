import { motion } from "motion/react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { TECHNICAL_LEVEL_OPTIONS } from "../../../lib/onboarding-options";
import { cn } from "../../../lib/utils";

interface StepTechnicalLevelProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepTechnicalLevel({
  formData,
  errors,
  onUpdate,
}: StepTechnicalLevelProps) {
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
          What's your technical level?
        </h2>
        <p className="text-muted-foreground">
          This helps us recommend appropriate resources and connect you with
          members at a similar level.
        </p>
      </div>

      <div className="space-y-2">
        {TECHNICAL_LEVEL_OPTIONS.map((option, index) => (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onUpdate("technical_level", option.value)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              formData.technical_level === option.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border"
            )}
          >
            <span className="font-medium">{option.label}</span>
          </motion.button>
        ))}
        {errors.technical_level && (
          <p className="text-sm text-destructive">{errors.technical_level}</p>
        )}
      </div>
    </motion.div>
  );
}
