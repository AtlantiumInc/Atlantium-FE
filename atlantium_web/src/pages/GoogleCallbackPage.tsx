import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Landing page for the better-auth Google flow. By the time the browser gets
 * here the session cookie is already set (better-auth handled the OAuth code
 * exchange on api.atlantium.ai) — so this page just reads the session and
 * routes to onboarding or the dashboard.
 */
export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      setMessage(
        error === "access_denied"
          ? "Google authorization was denied"
          : "Google sign-in didn't complete. Please try again.",
      );
      return;
    }

    const finishSignIn = async () => {
      try {
        const fullUser = await checkAuth();
        if (!fullUser) {
          setStatus("error");
          setMessage("Sign-in didn't complete. Please try again.");
          return;
        }

        setStatus("success");
        setMessage("Signed in with Google!");

        const profile = (fullUser as unknown as Record<string, unknown>)?._profile as Record<string, unknown> | undefined;
        const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
        const isOnboardingCompleted = registrationDetails?.is_completed === true;

        setTimeout(() => {
          if (isOnboardingCompleted) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        }, 800);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to sign in with Google");
      }
    };

    finishSignIn();
  }, [searchParams, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {status === "loading" && (
            <div className="p-4 bg-muted rounded-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
          {status === "success" && (
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          )}
          {status === "error" && (
            <div className="p-4 bg-destructive/10 rounded-full">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold">Google Sign-In</h1>
          <p className="text-muted-foreground mt-2">
            {status === "loading" && "Signing you in..."}
            {status === "success" && message}
            {status === "error" && message}
          </p>
        </div>

        {status === "error" && (
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:underline text-sm"
          >
            Return to login
          </button>
        )}
      </div>
    </div>
  );
}
