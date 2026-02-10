import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Check, Mail } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../contexts/AuthContext";
import { useOnboardingForm } from "../hooks/useOnboardingForm";
import type { OnboardingFormData } from "../lib/onboarding-schema";
import { api } from "../lib/api";
import {
  getPendingAction,
  clearPendingAction,
  getPendingRedirect,
  clearPendingRedirect,
} from "../lib/pendingAction";

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
  const { user, checkAuth, logout } = useAuth();

  // Extract initial data from user profile (for Google auth pre-fill)
  const userAny = user as unknown as Record<string, unknown> | null;
  const profile = userAny?._profile as Record<string, unknown> | undefined;
  const googleAvatarUrl = user?.avatar || (profile?.avatar_url as string);

  // Check onboarding status
  const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
  const isOnboardingCompleted = registrationDetails?.is_completed === true;
  const isPendingApproval = registrationDetails?.pending_approval === true;
  const isApproved = isOnboardingCompleted && !isPendingApproval;

  // Redirect to dashboard only if onboarding is completed AND approved by admin
  useEffect(() => {
    if (isApproved) {
      navigate("/dashboard", { replace: true });
    }
  }, [isApproved, navigate]);

  const executePendingAction = useCallback(async (): Promise<string | null> => {
    // First check for pending redirect (already joined, just need to redirect)
    const pendingRedirect = getPendingRedirect();
    if (pendingRedirect) {
      clearPendingRedirect();
      return pendingRedirect;
    }

    // Then check for pending action
    const action = getPendingAction();
    if (!action) return null;

    clearPendingAction();

    try {
      switch (action.type) {
        case "group_join":
          if (action.slug) {
            const result = await api.joinPublicGroup(action.slug);
            return `/chat/${result.thread_id}`;
          }
          break;
        case "event_rsvp":
          if (action.eventId) {
            await api.rsvpPublicEvent(action.eventId);
            return `/events/${action.eventId}`;
          }
          break;
        case "invite_claim":
          if (action.token) {
            const claimResult = await api.claimInvite(action.token);
            return claimResult.redirect_to;
          }
          break;
        case "user_connect":
          // Connection was already made, just redirect
          return "/dashboard";
      }
    } catch (error) {
      // If action fails (e.g., already joined), just go to dashboard
      console.error("Failed to execute pending action:", error);
    }

    return null;
  }, []);

  const handleComplete = useCallback(
    async (data: OnboardingFormData) => {
      // Separate profile fields from registration_details
      const { first_name, last_name, avatar_url, ...registrationFields } = data;

      const registrationDetails = {
        ...registrationFields,
        is_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        pending_approval: true, // Mark as pending admin approval
      };

      // Build display_name from first and last name
      const display_name = [first_name, last_name].filter(Boolean).join(" ");

      await api.updateProfile({
        first_name,
        last_name,
        display_name,
        avatar_url: avatar_url || googleAvatarUrl || null,
        bio: profile?.bio || null,
        location: profile?.location || null,
        website_url: profile?.website_url || null,
        linkedin_url: profile?.linkedin_url || null,
        registration_details: registrationDetails,
      });

      // Refresh auth context to get updated profile
      await checkAuth();

      toast.success("Onboarding submitted! You'll be contacted shortly.");
      // Stay on onboarding page to show pending approval message
    },
    [googleAvatarUrl, checkAuth]
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
      avatar_url: googleAvatarUrl || "",
    },
    onComplete: handleComplete,
  });

  // Handle keyboard navigation (disabled on pricing step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard nav on pricing step (has its own flow)
      if (currentStep === 5) return;
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
  }, [currentStep, isLastStep, nextStep, submit]);

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


  const renderPendingApprovalScreen = () => {
    return (
      <div className="space-y-8 text-center max-w-md mx-auto py-12">
        <div className="flex justify-center">
          <div className="relative">
            {/* Pulsing background circle */}
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
            {/* Icon */}
            <div className="relative bg-primary/10 rounded-full p-4 border border-primary/30">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Thank you for joining!
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Your onboarding is submitted and pending approval. Our team will review your application and contact you shortly with next steps.
          </p>
        </div>

        <div className="bg-background/50 border border-border/30 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            In the meantime, check your email for updates from <span className="font-medium text-foreground">team@atlantium.ai</span>
          </p>
        </div>

        <Button onClick={logout} variant="outline" className="w-full">
          Sign out
        </Button>
      </div>
    );
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
      case 6:
        return <StepProjectStatus {...stepProps} />;
      case 7:
        return <StepProjectDescription {...stepProps} />;
      case 8:
        return <StepTechnicalLevel {...stepProps} />;
      case 9:
        return <StepCommunityHopes {...stepProps} />;
      case 10:
        return <StepTimeCommitment {...stepProps} />;
      case 11:
        return <StepSuccessDefinition {...stepProps} />;
      case 12:
        return <StepAvatar {...stepProps} googleAvatarUrl={googleAvatarUrl} />;
      default:
        return null;
    }
  };

  // If pending approval, show the approval screen
  if (isPendingApproval) {
    return (
      <OnboardingLayout onLogout={logout}>
        {renderPendingApprovalScreen()}
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      wide={currentStep === 5}
      progress={
        <OnboardingProgress
          currentStep={visibleStepNumber}
          totalSteps={totalVisibleSteps}
        />
      }
      preview={<ProfilePreview formData={formData} email={user?.email} />}
      onLogout={logout}
    >
      <div className="space-y-8">
        {/* Step content with animation */}
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

        {/* Navigation buttons */}
        {(
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
        )}

        {/* Skip hint for optional steps */}
        {(currentStep === 10 || currentStep === 11 || currentStep === 12) && (
          <p className="text-center text-sm text-muted-foreground">
            Press Enter or click Continue to skip this step
          </p>
        )}
      </div>
    </OnboardingLayout>
  );
}
