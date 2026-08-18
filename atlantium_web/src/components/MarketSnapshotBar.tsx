import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getReferralCode, clearReferralCode } from "@/lib/referral";

const OTP_LENGTH = 6;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

/**
 * Daily snapshot of the Atlanta Technology Market: the board's live counts as
 * a full-width strip, with an email field that opts the visitor straight into
 * signup — submit sends the OTP immediately and the modal opens on the code
 * step, then hands off to the normal authed onboarding flow.
 */
export function MarketSnapshotBar({ showStats = true }: { showStats?: boolean } = {}) {
  const [stats, setStats] = useState<{
    total: number;
    remote: number;
    hybrid: number;
    new_this_week: number;
    no_degree: number;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login, checkAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getJobPostingsPaged({ limit: 1 })
      .then((r) =>
        setStats({
          total: r.total,
          remote: r.counts?.remote ?? 0,
          hybrid: r.counts?.hybrid ?? 0,
          new_this_week: r.counts?.new_this_week ?? 0,
          no_degree: r.counts?.no_degree ?? 0,
        }),
      )
      .catch(() => {});
  }, []);

  const handleOptIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.requestOtp(trimmed);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setModalOpen(true);
      toast.success("Verification code sent to your email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const refCode = getReferralCode();
      const response = await api.verifyOtp(email.trim(), code, refCode || undefined);
      if (refCode) clearReferralCode();
      localStorage.setItem("userEmail", email.trim());
      login(response.auth_token, response.user);
      await checkAuth();
      setModalOpen(false);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.requestOtp(email.trim());
      toast.success("Code resent to your email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const tiles: Array<{ value: number; label: string; className: string }> = !showStats
    ? []
    : stats
    ? [
        { value: stats.total, label: "Open roles", className: "text-foreground" },
        { value: stats.remote, label: "Remote", className: "text-emerald-400" },
        { value: stats.hybrid, label: "Hybrid", className: "text-violet-400" },
        { value: stats.new_this_week, label: "New this week", className: "text-cyan-400" },
        { value: stats.no_degree, label: "No degree", className: "text-teal-400" },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur px-5 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Label */}
        <div className="shrink-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Daily snapshot
          </p>
          <p className="text-sm font-semibold text-foreground whitespace-nowrap">
            Atlanta Technology Market
          </p>
        </div>

        {/* Stats */}
        <div className={`flex flex-1 items-center justify-start lg:justify-center gap-6 sm:gap-8 overflow-x-auto ${showStats ? "" : "lg:justify-end"}`}>
          {tiles.map((t) => (
            <div key={t.label} className="text-center shrink-0">
              <div className={`text-lg font-bold tabular-nums ${t.className}`}>
                {t.value.toLocaleString()}
              </div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                {t.label}
              </p>
            </div>
          ))}
        </div>

        {/* Opt-in */}
        <form onSubmit={handleOptIn} className="flex shrink-0 items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email for the daily brief"
            className="h-10 w-full sm:w-56 text-sm"
          />
          <Button type="submit" disabled={isLoading} className="h-10 gap-1.5 whitespace-nowrap">
            {isLoading && !modalOpen ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Get access
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Inline signup: OTP step, then the authed app takes over onboarding */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter the code</DialogTitle>
            <DialogDescription>
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{maskEmail(email.trim())}</span>. Enter
              it to create your account and get the daily brief.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="flex gap-2" onPaste={handleOtpPaste}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={otpDigits[i]}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="h-12 w-full rounded-lg border-2 border-border bg-background text-center text-lg font-semibold text-foreground outline-none transition-colors focus:border-foreground"
                />
              ))}
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <p className="text-center text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors disabled:opacity-50"
              >
                Send code again
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
