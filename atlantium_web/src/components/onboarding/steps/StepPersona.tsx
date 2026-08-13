import { motion } from "motion/react";
import { Briefcase, Rocket, TrendingUp, Compass } from "lucide-react";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { cn } from "../../../lib/utils";

interface StepPersonaProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

/**
 * The branch point (plan §5.1). Asked immediately after name because it costs
 * nothing to answer, makes every later screen relevant, and lets the tier
 * question — now at the end — speak in the member's own language.
 */
const PERSONAS = [
  {
    value: "professional" as const,
    icon: Briefcase,
    label: "A professional",
    blurb: "I work in tech — employed, contracting, or looking",
  },
  {
    value: "founder" as const,
    icon: Rocket,
    label: "A founder",
    blurb: "I'm building a company, at any stage",
  },
  {
    value: "investor" as const,
    icon: TrendingUp,
    label: "An investor",
    blurb: "I back Atlanta companies — angel, fund, or syndicate",
  },
  {
    value: "advisor" as const,
    icon: Compass,
    label: "An advisor",
    blurb: "I help founders and operators in my domain",
  },
];

export function StepPersona({ formData, errors, onUpdate }: StepPersonaProps) {
  const selected = formData.persona;

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
          How should the lab know you?
        </h2>
        <p className="text-muted-foreground">
          This shapes what we ask next and who we connect you with. You can add
          other roles later — most people wear more than one hat.
        </p>
        {errors?.persona && (
          <p className="text-sm text-red-400 pt-1">{errors.persona}</p>
        )}
      </div>

      <div className="space-y-2">
        {PERSONAS.map((option, index) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onUpdate("persona", option.value)}
              className={cn(
                "w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 mt-0.5 flex-shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {option.blurb}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
