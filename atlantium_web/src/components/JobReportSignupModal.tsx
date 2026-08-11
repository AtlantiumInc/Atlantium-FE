import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Newspaper, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const SNOOZE_KEY = "jobReportModalSnooze";
const SNOOZE_DAYS = 3;
const AUTO_OPEN_DELAY_MS = 6000;

function isSnoozed(): boolean {
  const raw = localStorage.getItem(SNOOZE_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
}

function snooze() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
}

function GoogleLogo() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

interface JobReportSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill for the email step (e.g. from the alerts card). */
  initialEmail?: string;
}

export function JobReportSignupModal({ open, onOpenChange, initialEmail }: JobReportSignupModalProps) {
  const { checkAuth } = useAuth();
  const [step, setStep] = useState<"pitch" | "otp" | "done">("pitch");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const close = (value: boolean) => {
    if (!value && step !== "done") snooze();
    onOpenChange(value);
    if (!value) {
      setStep("pitch");
      setCode("");
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      const target = new URL(window.location.href);
      target.searchParams.set("welcome", "1");
      const { url } = await api.googleSignInStart(target.toString());
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await api.requestOtp(email.trim());
      setStep("otp");
      toast.success("Code sent — check your email");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsLoading(true);
    try {
      await api.verifyOtp(email.trim(), code.trim());
      await checkAuth();
      setStep("done");
      toast.success("Welcome to Atlantium!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <DialogTitle>You're in!</DialogTitle>
            <DialogDescription>
              You're an Atlantium member. The Weekly Job Report — new Atlanta AI &amp; tech
              roles — is on its way to your inbox and feeds.
            </DialogDescription>
            <Button className="mt-2 w-full" onClick={() => close(false)}>
              Back to the board
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Newspaper className="h-[18px] w-[18px] text-cyan-400" />
                </div>
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  Atlantium · Free Membership
                </p>
              </div>
              <DialogTitle className="text-xl">Get the Weekly Job Report</DialogTitle>
              <DialogDescription>
                Join Atlantium free and get every week's new Atlanta AI &amp; tech roles —
                salaries, stacks, and who's actually hiring — in your inbox, plus the report
                on YouTube, Instagram, TikTok, and Threads.
              </DialogDescription>
            </DialogHeader>

            {step === "pitch" ? (
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 border-gray-300"
                  onClick={handleGoogle}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />}
                  Continue with Google
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <form onSubmit={handleEmailSubmit} className="flex gap-2">
                  <Input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit" disabled={isLoading} className="gap-1.5 flex-shrink-0">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Join free
                  </Button>
                </form>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Membership is free. Members can also book{" "}
                  <span className="text-foreground font-medium">Office Hours</span> — daily,
                  hands-on help from working engineers.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="text-foreground">{email}</span>.
                </p>
                <Input
                  autoFocus
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Verify &amp; join
                </Button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStep("pitch")}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Auto-open behavior for job pages: opens once after a short delay for
 * signed-out visitors, snoozes for a few days when dismissed. Returns state
 * the page can also open manually (alerts card, CTA buttons).
 */
export function useJobReportSignup() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState<string | undefined>();

  useEffect(() => {
    if (isLoading || user) return;
    if (isSnoozed()) return;
    const t = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [isLoading, user]);

  // Google flow lands back here with ?welcome=1 and a fresh session cookie.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      toast.success("Welcome to Atlantium! You're on the Weekly Job Report.");
      params.delete("welcome");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      );
    }
  }, []);

  const openWithEmail = useCallback((email?: string) => {
    setInitialEmail(email);
    setOpen(true);
  }, []);

  return { open, setOpen, initialEmail, openWithEmail, isMember: !!user };
}
