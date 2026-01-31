import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("Google authorization was denied");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received");
      return;
    }

    const handleGoogleAuth = async () => {
      try {
        const response = await api.googleAuth(code);
        login(response.auth_token, response.user);
        setStatus("success");
        setMessage("Signed in with Google!");

        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to sign in with Google");
      }
    };

    handleGoogleAuth();
  }, [searchParams, navigate, login]);

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
