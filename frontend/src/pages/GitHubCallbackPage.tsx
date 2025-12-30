import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Github } from "lucide-react";
import { api } from "@/lib/api";

export function GitHubCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage("GitHub authorization was denied");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received");
      return;
    }

    const connectGitHub = async () => {
      try {
        const response = await api.connectGitHub(code);
        setStatus("success");
        setUsername(response.github_username);
        setMessage("GitHub connected successfully!");

        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to connect GitHub");
      }
    };

    connectGitHub();
  }, [searchParams, navigate]);

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
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Github className="h-6 w-6" />
            GitHub Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            {status === "loading" && "Connecting your GitHub account..."}
            {status === "success" && (
              <>
                Connected as <span className="font-semibold text-foreground">@{username}</span>
              </>
            )}
            {status === "error" && message}
          </p>
        </div>

        {status === "success" && (
          <p className="text-sm text-muted-foreground">
            Redirecting you back...
          </p>
        )}

        {status === "error" && (
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:underline text-sm"
          >
            Return to home
          </button>
        )}
      </div>
    </div>
  );
}
