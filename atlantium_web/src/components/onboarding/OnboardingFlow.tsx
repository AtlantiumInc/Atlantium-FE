import { useEffect, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../contexts/AuthContext";
import { useOnboardingForm } from "../../hooks/useOnboardingForm";
import type { OnboardingFormData } from "../../lib/onboarding-schema";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { OnboardingProgress } from "./OnboardingProgress";

import { StepName } from "./steps/StepName";
import { StepTimezone } from "./steps/StepTimezone";
import { StepPrimaryGoal } from "./steps/StepPrimaryGoal";
import { StepInterests } from "./steps/StepInterests";
import { StepProjectStatus } from "./steps/StepProjectStatus";
import { StepProjectDescription } from "./steps/StepProjectDescription";
import { StepTechnicalLevel } from "./steps/StepTechnicalLevel";
import { StepCommunityHopes } from "./steps/StepCommunityHopes";
import { StepTimeCommitment } from "./steps/StepTimeCommitment";
import { StepSuccessDefinition } from "./steps/StepSuccessDefinition";
import { StepAvatar } from "./steps/StepAvatar";
import { StepPricing } from "./steps/StepPricing";

type RenderArgs = {
  step: React.ReactNode;
  nav: React.ReactNode;
  progress: React.ReactNode;
  formData: Partial<OnboardingFormData>;
  currentStep: number;
};

type Props = {
  /** Called after the profile has been saved and auth refreshed. */
  onComplete?: () => void;
  /** Page mode wraps this in its own layout; modal mode renders inline. */
  render?: (args: RenderArgs) => React.ReactNode;
};

/**
 * The member questionnaire. Every member completes it — the page at
 * /onboarding and the signup popup both drive this same flow, so a member who
 * joins from a job page answers exactly what a member who joins from the lab
 * does.
 */
export function OnboardingFlow({ onComplete, render }: Props) {
  const { user, checkAuth } = useAuth();

  const userAny = user as unknown as Record<string, unknown> | null;
  const profile = userAny?._profile as Record<string, unknown> | undefined;
  const googleAvatarUrl = user?.avatar || (profile?.avatar_url as string);

  const handleComplete = useCallback(
    async (data: OnboardingFormData) => {
      const { first_name, last_name, avatar_url, membership_tier, ...registrationFields } = data;

      const registrationDetails = {
        ...registrationFields,
        membership_tier,
        is_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      const display_name = [first_name, last_name].filter(Boolean).join(" ");

      await api.updateProfile({
        first_name,
        last_name,
        display_name,
        avatar_url: avatar_url || googleAvatarUrl || null,
        bio: (profile?.bio as string) || null,
        location: (profile?.location as string) || null,
        website_url: (profile?.website_url as string) || null,
        linkedin_url: (profile?.linkedin_url as string) || null,
        registration_details: registrationDetails,
      });

      await checkAuth();
      onComplete?.();
    },
    [googleAvatarUrl, checkAuth, onComplete, profile]
  );

  const {
    currentStep,
    formData,
    errors,
    isSubmitting,
    isLastStep,
    canGoBack,
    visibleStepNumber,
    totalVisibleSteps,
    updateField,
    nextStep,
    prevStep,
    submit,
  } = useOnboardingForm({
    initialData: {
      first_name: user?.first_name || (profile?.first_name as string) || "",
      last_name: user?.last_name || (profile?.last_name as string) || "",
      phone_number: "",
      avatar_url: googleAvatarUrl || "",
    },
    onComplete: handleComplete,
  });

  const handleNext = useCallback(async () => {
    if (!isLastStep) {
      nextStep();
      return;
    }
    try {
      await submit();
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  }, [isLastStep, nextStep, submit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      e.preventDefault();
      void handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext]);

  const stepProps = { formData, errors, onUpdate: updateField };
  const stepNode = (() => {
    switch (currentStep) {
      case 1: return <StepName {...stepProps} />;
      case 2: return <StepPricing {...stepProps} />;
      case 3: return <StepTimezone {...stepProps} />;
      case 4: return <StepPrimaryGoal {...stepProps} />;
      case 5: return <StepInterests {...stepProps} />;
      case 6: return <StepProjectStatus {...stepProps} />;
      case 7: return <StepProjectDescription {...stepProps} />;
      case 8: return <StepTechnicalLevel {...stepProps} />;
      case 9: return <StepCommunityHopes {...stepProps} />;
      case 10: return <StepTimeCommitment {...stepProps} />;
      case 11: return <StepSuccessDefinition {...stepProps} />;
      case 12: return <StepAvatar {...stepProps} googleAvatarUrl={googleAvatarUrl} />;
      default: return null;
    }
  })();

  const nav = (
    <div className="flex items-center justify-between pt-4">
      <Button
        type="button"
        variant="ghost"
        onClick={prevStep}
        disabled={!canGoBack || isSubmitting}
        className={canGoBack ? "gap-2" : "gap-2 invisible"}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <Button type="button" onClick={handleNext} disabled={isSubmitting} className="gap-2">
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : isLastStep ? (
          <>Finish <Check className="h-4 w-4" /></>
        ) : (
          <>Continue <ArrowRight className="h-4 w-4" /></>
        )}
      </Button>
    </div>
  );

  const progress = (
    <OnboardingProgress currentStep={visibleStepNumber} totalSteps={totalVisibleSteps} />
  );

  if (render) return <>{render({ step: stepNode, nav, progress, formData, currentStep })}</>;

  return (
    <div className="space-y-6">
      {progress}
      <AnimatePresence mode="wait">{stepNode}</AnimatePresence>
      {nav}
    </div>
  );
}
