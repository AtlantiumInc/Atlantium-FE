import { motion } from "motion/react";
import { AvatarUpload } from "../AvatarUpload";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepAvatarProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  googleAvatarUrl?: string;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepAvatar({
  formData,
  errors,
  googleAvatarUrl,
  onUpdate,
}: StepAvatarProps) {
  const initials = [formData.first_name?.[0], formData.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Add a profile photo
        </h2>
        <p className="text-muted-foreground">
          Help other members recognize you. You can skip this or change it later.
        </p>
      </div>

      <div className="flex justify-center py-6">
        <AvatarUpload
          currentUrl={formData.avatar_url}
          fallbackUrl={googleAvatarUrl}
          initials={initials}
          onUpload={(url) => onUpdate("avatar_url", url)}
          onRemove={() => onUpdate("avatar_url", "")}
        />
      </div>

      {errors.avatar_url && (
        <p className="text-sm text-destructive text-center">{errors.avatar_url}</p>
      )}
    </motion.div>
  );
}
