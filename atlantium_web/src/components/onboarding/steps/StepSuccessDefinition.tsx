import { motion } from "motion/react";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepSuccessDefinitionProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepSuccessDefinition({
  formData,
  errors,
  onUpdate,
}: StepSuccessDefinitionProps) {
  const charCount = formData.success_definition?.length ?? 0;
  const maxChars = 500;

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
          What would success look like for you?
        </h2>
        <p className="text-muted-foreground">
          In 6 months, what would make you feel like joining Atlantium was
          worthwhile? This is optional but helps us understand your goals.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="success_definition">Your definition of success</Label>
        <Textarea
          id="success_definition"
          placeholder="I'd consider it a success if..."
          value={formData.success_definition ?? ""}
          onChange={(e) => onUpdate("success_definition", e.target.value)}
          rows={4}
          maxLength={maxChars}
          className="resize-none"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Optional</span>
          <span>
            {charCount}/{maxChars}
          </span>
        </div>
        {errors.success_definition && (
          <p className="text-sm text-destructive">{errors.success_definition}</p>
        )}
      </div>
    </motion.div>
  );
}
