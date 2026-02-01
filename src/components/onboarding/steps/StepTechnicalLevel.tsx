import { motion } from "motion/react";
import { Sparkles, Lightbulb, Code, Cpu, Check } from "lucide-react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { cn } from "../../../lib/utils";

interface StepTechnicalLevelProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

const TECHNICAL_LEVELS = [
  {
    value: "no_experience",
    label: "Beginner",
    description: "New to tech",
    icon: Sparkles,
  },
  {
    value: "some_exposure",
    label: "Intermediate",
    description: "Started projects",
    icon: Lightbulb,
  },
  {
    value: "intermediate",
    label: "Builder",
    description: "Finished projects",
    icon: Code,
  },
  {
    value: "advanced",
    label: "Expert",
    description: "Scaled software",
    icon: Cpu,
  },
] as const;

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
          Helps us recommend the right resources for you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TECHNICAL_LEVELS.map((level, index) => {
          const isSelected = formData.technical_level === level.value;
          const Icon = level.icon;

          return (
            <motion.button
              key={level.value}
              type="button"
              onClick={() => onUpdate("technical_level", level.value)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center mb-3",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <span className="font-semibold text-base">{level.label}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {level.description}
              </span>
            </motion.button>
          );
        })}
      </div>

      {errors.technical_level && (
        <p className="text-sm text-destructive">{errors.technical_level}</p>
      )}
    </motion.div>
  );
}
