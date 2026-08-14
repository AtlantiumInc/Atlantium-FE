import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { useAuth } from "../contexts/AuthContext";
import { OnboardingLayout } from "../components/onboarding/OnboardingLayout";
import { OnboardingFlow } from "../components/onboarding/OnboardingFlow";
import { ProfilePreview } from "../components/onboarding/ProfilePreview";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userAny = user as unknown as Record<string, unknown> | null;
  const profile = userAny?._profile as Record<string, unknown> | undefined;
  const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
  const isOnboardingCompleted = registrationDetails?.is_completed === true;

  useEffect(() => {
    if (isOnboardingCompleted) navigate("/dashboard", { replace: true });
  }, [isOnboardingCompleted, navigate]);

  return (
    <OnboardingFlow
      onComplete={() => {
        toast.success("Welcome to Atlantium!");
        navigate("/dashboard", { replace: true });
      }}
      render={({ step, nav, progress, formData, currentStep, stepId }) => (
        <OnboardingLayout
          wide={stepId === "pricing"}
          progress={progress}
          preview={<ProfilePreview formData={formData} email={user?.email} currentStep={currentStep} />}
          onLogout={logout}
        >
          <div className="space-y-8">
            <AnimatePresence mode="wait">{step}</AnimatePresence>
            {nav}
          </div>
        </OnboardingLayout>
      )}
    />
  );
}
