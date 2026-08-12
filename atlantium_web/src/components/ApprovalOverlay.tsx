import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Full-screen review gate shown over the dashboard for users who have not yet
 * been approved by an admin. This is purely the visible layer — the actual
 * protection is server-side: the worker returns 403 from every dashboard data
 * endpoint until `is_approved` is true, so removing this node in devtools
 * leaves an empty, non-functional dashboard.
 */
export function ApprovalOverlay() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Lock background scroll while the gate is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        backgroundColor: "rgba(3, 7, 18, 0.6)",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-7 w-7 animate-pulse text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Reviewing your application</h2>
        <p className="mt-3 text-muted-foreground">
          Thanks for signing up. An admin is reviewing your application — you'll
          get full access to the dashboard as soon as you're approved.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          We'll reach out at the email you signed up with once you're in.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6 gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Log out
        </Button>
      </div>
    </div>
  );
}
