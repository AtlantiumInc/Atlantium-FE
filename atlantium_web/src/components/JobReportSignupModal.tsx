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
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

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

export type SignupStep = "pitch" | "otp";
type ModalStep = SignupStep | "questionnaire" | "done";

interface JobReportSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill for the email step (e.g. from the alerts card). */
  initialEmail?: string;
  /** "otp" when the code was already sent (alerts card path). */
  initialStep?: ModalStep;
}

export function JobReportSignupModal({
  open,
  onOpenChange,
  initialEmail,
  initialStep = "pitch",
}: JobReportSignupModalProps) {
  const { checkAuth } = useAuth();
  const [step, setStep] = useState<ModalStep>(initialStep);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Re-sync entry state each time the dialog opens: the alerts card opens it
  // straight on the OTP step with the email already set.
  useEffect(() => {
    if (open) {
      setStep(initialStep);
      if (initialEmail) setEmail(initialEmail);
      setCode("");
    }
  }, [open, initialStep, initialEmail]);

  const googleCallbackURL = (() => {
    const target = new URL(window.location.href);
    target.searchParams.set("welcome", "1");
    return target.toString();
  })();

  const close = (value: boolean) => {
    if (!value && step === "questionnaire") return;
    if (!value && step !== "done") snooze();
    onOpenChange(value);
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
      const me = await checkAuth();
      const done = (me as { _profile?: { registration_details?: { is_completed?: boolean } } } | null)
        ?._profile?.registration_details?.is_completed === true;
      // Every member answers the questionnaire — returning members skip it.
      setStep(done ? "done" : "questionnaire");
      if (done) toast.success("Welcome back!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={step === "questionnaire"
        ? "max-w-2xl p-0 overflow-hidden border-cyan-500/20"
        : "max-w-md p-0 overflow-hidden border-cyan-500/20"}>
        {step === "questionnaire" ? (
          <div className="p-6 sm:p-7 max-h-[85vh] overflow-y-auto">
            <DialogTitle className="text-lg mb-1">Tell us who you are</DialogTitle>
            <p className="text-xs text-muted-foreground mb-5">
              Every Atlantium member answers these — it's how we match you to roles, rooms and people.
            </p>
            <OnboardingFlow
              onComplete={() => {
                setStep("done");
                toast.success("Welcome to Atlantium!");
              }}
            />
          </div>
        ) : step === "done" ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl">You're in!</DialogTitle>
            <DialogDescription className="leading-relaxed">
              You're an Atlantium member. The Weekly Job Report — new Atlanta AI &amp; tech
              roles — is on its way to your inbox and feeds.
            </DialogDescription>
            <Button
              className="mt-3 w-full h-11 bg-cyan-500 text-cyan-950 hover:bg-cyan-400 font-semibold"
              onClick={() => close(false)}
            >
              Back to the board
            </Button>
          </div>
        ) : (
          <>
            {/* Accent header band */}
            <div className="px-6 pt-6 pb-5 bg-gradient-to-b from-cyan-500/10 to-transparent border-b border-border/40">
              <DialogHeader>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <Newspaper className="h-5 w-5 text-cyan-400" />
                  </div>
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
                    Atlantium · Free Membership
                  </p>
                </div>
                <DialogTitle className="text-2xl tracking-tight">
                  Get the Weekly Job Report
                </DialogTitle>
                <DialogDescription className="leading-relaxed">
                  Every week's new Atlanta AI &amp; tech roles — salaries, stacks, and who's
                  actually hiring — in your inbox and on YouTube, Instagram, TikTok, and
                  Threads.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 pb-6 pt-5">
              {step === "pitch" ? (
                <div className="space-y-4">
                  <GoogleSignInButton callbackURL={googleCallbackURL} label="Join with Google" />
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">or with email</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                    <Input
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 gap-2 bg-cyan-500 text-cyan-950 hover:bg-cyan-400 font-semibold"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Join free
                    </Button>
                  </form>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Membership is free. Members can also book{" "}
                    <span className="text-foreground font-medium">Office Hours</span> — daily,
                    hands-on help from working engineers.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVerify} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
                  </p>
                  <Input
                    autoFocus
                    inputMode="numeric"
                    placeholder="123456"
                    className="h-12 text-center text-lg tracking-[0.4em] font-mono"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 bg-cyan-500 text-cyan-950 hover:bg-cyan-400 font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Verify &amp; join
                  </Button>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setStep("pitch")}
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Use a different email
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Auto-open behavior for job pages: opens once after a short delay for
 * signed-out visitors, snoozes for a few days when dismissed. Pages can also
 * open it manually — either at the pitch, or straight at the OTP step after
 * sending a code (startWithEmail, used by the alerts card).
 */
export function useJobReportSignup() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState<string | undefined>();
  const [initialStep, setInitialStep] = useState<ModalStep>("pitch");

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
      setInitialStep("questionnaire");
      setOpen(true);
      params.delete("welcome");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      );
    }
  }, []);

  /** Drop a signed-in member straight into the questionnaire. */
  const openQuestionnaire = useCallback(() => {
    setInitialStep("questionnaire");
    setOpen(true);
  }, []);

  const openWithEmail = useCallback((email?: string) => {
    setInitialEmail(email);
    setInitialStep("pitch");
    setOpen(true);
  }, []);

  /** Send the OTP right away and open the modal on the code step. */
  const startWithEmail = useCallback(async (email: string) => {
    try {
      await api.requestOtp(email);
      toast.success("Code sent — check your email");
      setInitialEmail(email);
      setInitialStep("otp");
      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the code");
      setInitialEmail(email);
      setInitialStep("pitch");
      setOpen(true);
    }
  }, []);

  const onboardingDone =
    (user as { _profile?: { registration_details?: { is_completed?: boolean } } } | null)
      ?._profile?.registration_details?.is_completed === true;

  return {
    open, setOpen, initialEmail, initialStep, openWithEmail, startWithEmail, openQuestionnaire,
    isMember: !!user,
    isOnboarded: !!user && onboardingDone,
  };
}
