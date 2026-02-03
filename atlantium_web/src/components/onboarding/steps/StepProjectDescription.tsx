import { motion } from "motion/react";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepProjectDescriptionProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepProjectDescription({
  formData,
  errors,
  onUpdate,
}: StepProjectDescriptionProps) {
  const charCount = formData.project_description?.length ?? 0;
  const maxChars = 1000;

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
          Tell us about your project
        </h2>
        <p className="text-muted-foreground">
          A brief description helps members understand what you're building.
          This is optional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="project_description">Project description</Label>
        <Textarea
          id="project_description"
          placeholder="I'm building an AI-powered tool that..."
          value={formData.project_description ?? ""}
          onChange={(e) => onUpdate("project_description", e.target.value)}
          rows={5}
          maxLength={maxChars}
          className="resize-none"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Optional</span>
          <span>
            {charCount}/{maxChars}
          </span>
        </div>
        {errors.project_description && (
          <p className="text-sm text-destructive">{errors.project_description}</p>
        )}
      </div>
    </motion.div>
  );
}
