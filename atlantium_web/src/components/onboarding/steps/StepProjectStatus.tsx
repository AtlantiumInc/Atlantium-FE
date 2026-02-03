import { motion } from "motion/react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { PROJECT_STATUS_OPTIONS } from "../../../lib/onboarding-options";
import { cn } from "../../../lib/utils";

interface StepProjectStatusProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepProjectStatus({
  formData,
  errors,
  onUpdate,
}: StepProjectStatusProps) {
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
          Are you working on a project?
        </h2>
        <p className="text-muted-foreground">
          Let us know if you're building something with AI.
        </p>
      </div>

      <div className="space-y-2">
        {PROJECT_STATUS_OPTIONS.map((option, index) => (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onUpdate("working_on_project", option.value)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              formData.working_on_project === option.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border"
            )}
          >
            <span className="font-medium">{option.label}</span>
          </motion.button>
        ))}
        {errors.working_on_project && (
          <p className="text-sm text-destructive">{errors.working_on_project}</p>
        )}
      </div>
    </motion.div>
  );
}
