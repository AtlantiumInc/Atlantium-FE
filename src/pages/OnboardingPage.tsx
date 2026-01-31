import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../contexts/AuthContext";
import { useOnboardingForm } from "../hooks/useOnboardingForm";
import type { OnboardingFormData } from "../lib/onboarding-schema";
import { api } from "../lib/api";

import { OnboardingLayout } from "../components/onboarding/OnboardingLayout";
import { OnboardingProgress } from "../components/onboarding/OnboardingProgress";
import { ProfilePreview } from "../components/onboarding/ProfilePreview";
import { Button } from "../components/ui/button";

// Step components
import { StepName } from "../components/onboarding/steps/StepName";
import { StepTimezone } from "../components/onboarding/steps/StepTimezone";
import { StepPrimaryGoal } from "../components/onboarding/steps/StepPrimaryGoal";
import { StepInterests } from "../components/onboarding/steps/StepInterests";
import { StepProjectStatus } from "../components/onboarding/steps/StepProjectStatus";
import { StepProjectDescription } from "../components/onboarding/steps/StepProjectDescription";
import { StepTechnicalLevel } from "../components/onboarding/steps/StepTechnicalLevel";
import { StepCommunityHopes } from "../components/onboarding/steps/StepCommunityHopes";
import { StepTimeCommitment } from "../components/onboarding/steps/StepTimeCommitment";
import { StepSuccessDefinition } from "../components/onboarding/steps/StepSuccessDefinition";
import { StepAvatar } from "../components/onboarding/steps/StepAvatar";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();

  // Extract initial data from user profile (for Google auth pre-fill)
  const profile = (user as Record<string, unknown>)?._profile as
    | Record<string, unknown>
    | undefined;
  const googleAvatarUrl = user?.avatar || (profile?.avatar_url as string);

  const handleComplete = useCallback(
    async (data: OnboardingFormData) => {
      // Separate profile fields from registration_details
      const { first_name, last_name, avatar_url, ...registrationFields } = data;

      const registrationDetails = {
        ...registrationFields,
        onboarding_completed_at: new Date().toISOString(),
      };

      // Build display_name from first and last name
      const display_name = [first_name, last_name].filter(Boolean).join(" ");

      await api.updateProfile({
        first_name,
        last_name,
        display_name,
        avatar_url: avatar_url || googleAvatarUrl || undefined,
        registration_details: registrationDetails,
      });

      // Refresh auth context to get updated profile
      await checkAuth();

      toast.success("Welcome to Atlantium!");
      navigate("/dashboard", { replace: true });
    },
    [googleAvatarUrl, checkAuth, navigate]
  );

  const {
    currentStep,
    formData,
    errors,
    isSubmitting,
    isFirstStep,
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
      avatar_url: googleAvatarUrl || "",
    },
    onComplete: handleComplete,
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Don't trigger on textareas
        if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
        e.preventDefault();
        if (isLastStep) {
          submit();
        } else {
          nextStep();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLastStep, nextStep, submit]);

  const handleNext = async () => {
    if (isLastStep) {
      try {
        await submit();
      } catch (error) {
        console.error("Onboarding error:", error);
        toast.error("Something went wrong. Please try again.");
      }
    } else {
      nextStep();
    }
  };

  const renderStep = () => {
    const stepProps = {
      formData,
      errors,
      onUpdate: updateField,
    };

    switch (currentStep) {
      case 1:
        return <StepName {...stepProps} />;
      case 2:
        return <StepTimezone {...stepProps} />;
      case 3:
        return <StepPrimaryGoal {...stepProps} />;
      case 4:
        return <StepInterests {...stepProps} />;
      case 5:
        return <StepProjectStatus {...stepProps} />;
      case 6:
        return <StepProjectDescription {...stepProps} />;
      case 7:
        return <StepTechnicalLevel {...stepProps} />;
      case 8:
        return <StepCommunityHopes {...stepProps} />;
      case 9:
        return <StepTimeCommitment {...stepProps} />;
      case 10:
        return <StepSuccessDefinition {...stepProps} />;
      case 11:
        return <StepAvatar {...stepProps} googleAvatarUrl={googleAvatarUrl} />;
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      progress={
        <OnboardingProgress
          currentStep={visibleStepNumber}
          totalSteps={totalVisibleSteps}
        />
      }
      preview={<ProfilePreview formData={formData} email={user?.email} />}
    >
      <div className="space-y-8">
        {/* Step content with animation */}
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={prevStep}
            disabled={!canGoBack || isSubmitting}
            className={canGoBack ? "" : "invisible"}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip hint for optional steps */}
        {(currentStep === 9 || currentStep === 10 || currentStep === 11) && (
          <p className="text-center text-sm text-muted-foreground">
            Press Enter or click Continue to skip this step
          </p>
        )}
      </div>
    </OnboardingLayout>
  );
}
