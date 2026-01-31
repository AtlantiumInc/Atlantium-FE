import { motion, AnimatePresence } from "motion/react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import type { OnboardingFormData } from "../../lib/onboarding-schema";
import {
  getOptionLabel,
  PRIMARY_GOAL_OPTIONS,
  INTERESTS_OPTIONS,
  TECHNICAL_LEVEL_OPTIONS,
  TIME_COMMITMENT_OPTIONS,
} from "../../lib/onboarding-options";

interface ProfilePreviewProps {
  formData: Partial<OnboardingFormData>;
  email?: string;
}

export function ProfilePreview({ formData, email }: ProfilePreviewProps) {
  const hasName = formData.first_name || formData.last_name;
  const fullName =
    [formData.first_name, formData.last_name].filter(Boolean).join(" ") ||
    "Your Name";

  const initials = hasName
    ? [formData.first_name?.[0], formData.last_name?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <motion.div
        className="bg-background rounded-xl border border-border p-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Avatar and Name */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            key={formData.avatar_url}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Avatar className="h-20 w-20 mb-3">
              <AvatarImage src={formData.avatar_url} alt={fullName} />
              <AvatarFallback className="text-lg">
                {initials || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.h3
              key={fullName}
              className="text-xl font-semibold"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {fullName}
            </motion.h3>
          </AnimatePresence>

          {email && (
            <p className="text-sm text-muted-foreground mt-1">{email}</p>
          )}
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          {/* Goal */}
          <AnimatePresence>
            {formData.primary_goal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Goal
                </p>
                <p className="text-sm font-medium">
                  {getOptionLabel(PRIMARY_GOAL_OPTIONS, formData.primary_goal)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Technical Level */}
          <AnimatePresence>
            {formData.technical_level && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Experience
                </p>
                <p className="text-sm font-medium">
                  {getOptionLabel(
                    TECHNICAL_LEVEL_OPTIONS,
                    formData.technical_level
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interests */}
          <AnimatePresence>
            {formData.interests && formData.interests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {formData.interests.slice(0, 4).map((interest) => (
                      <motion.div
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Badge variant="secondary" className="text-xs">
                          {getOptionLabel(INTERESTS_OPTIONS, interest)}
                        </Badge>
                      </motion.div>
                    ))}
                    {formData.interests.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{formData.interests.length - 4} more
                      </Badge>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time Commitment */}
          <AnimatePresence>
            {formData.time_commitment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Time Available
                </p>
                <p className="text-sm font-medium">
                  {getOptionLabel(
                    TIME_COMMITMENT_OPTIONS,
                    formData.time_commitment
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Helper text */}
      <motion.p
        className="text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Your profile is building as you go
      </motion.p>
    </div>
  );
}
