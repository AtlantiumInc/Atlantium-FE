import { motion } from "motion/react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepNameProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepName({ formData, errors, onUpdate }: StepNameProps) {
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
          What's your name?
        </h2>
        <p className="text-muted-foreground">
          This is how you'll appear to other members.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            type="text"
            placeholder="Jane"
            value={formData.first_name ?? ""}
            onChange={(e) => onUpdate("first_name", e.target.value)}
            autoFocus
          />
          {errors.first_name && (
            <p className="text-sm text-destructive">{errors.first_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            type="text"
            placeholder="Doe"
            value={formData.last_name ?? ""}
            onChange={(e) => onUpdate("last_name", e.target.value)}
          />
          {errors.last_name && (
            <p className="text-sm text-destructive">{errors.last_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone number</Label>
          <Input
            id="phone_number"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone_number ?? ""}
            onChange={(e) => onUpdate("phone_number", e.target.value)}
          />
          {errors.phone_number && (
            <p className="text-sm text-destructive">{errors.phone_number}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
