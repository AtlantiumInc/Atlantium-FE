import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

export function ProtectedRoute({
  children,
  skipOnboardingCheck = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if onboarding is needed (unless we're on the onboarding page itself)
  if (!skipOnboardingCheck) {
    const profile = (user as Record<string, unknown>)?._profile as
      | Record<string, unknown>
      | undefined;
    const registrationDetails = profile?.registration_details as
      | Record<string, unknown>
      | undefined;
    const needsOnboarding = !registrationDetails?.onboarding_completed_at;

    if (needsOnboarding && location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
