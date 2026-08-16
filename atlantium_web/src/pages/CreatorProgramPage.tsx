/**
 * /creator-program — the partner-programs hub (task #23).
 *
 * Logged-out: hero + the INLINE login (email → the OTP grid populates in the
 * same card — the LoginPage flow, kept on this page so joining never bounces
 * through /login). Logged-in: the two programs, one card each — live
 * requirements + tier ladder straight off Boomin, reward rules, and the
 * member's own membership state (join → pending approval → approved standing
 * with referral link and requirement checklist).
 *
 * Referral codes captured on arrival ride the OTP verify (first-touch
 * attribution) — that is what the Head Hunter Program pays on.
 */
import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  Instagram,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserSearch,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { api, type PartnerProgramSummary, type PartnerProgramsResponse } from "@/lib/api";
import { captureReferralCode, clearReferralCode, getReferralCode } from "@/lib/referral";
import { publicRuntimeUrl } from "@/lib/runtimeEnv";
import { cn } from "@/lib/utils";

const ATLANTIUM_API_BASE = publicRuntimeUrl(
  import.meta.env.VITE_ATLANTIUM_API_BASE,
  "https://api.atlantium.ai/v1",
);
const OTP_LENGTH = 6;

// ── Requirement rendering: wire vocabulary → member language ─────────────────

const METRIC_LABELS: Record<string, string> = {
  followers: "Instagram followers",
  channel_connected: "Instagram connected",
  "channel:instagram": "Instagram connected",
  link_clicks: "Link clicks",
  referral_count: "Referred signups",
  gmv_cents: "Referred revenue",
  "x:qualified_candidates": "Qualified candidates placed",
  "x:revenue_startups": "Revenue startups landed",
};

function requirementLine(req: NonNullable<PartnerProgramSummary["card"]>["requirements"][number]): string {
  const label = METRIC_LABELS[req.metricKey]
    ?? req.metricKey.replace(/^assert:/, "verified: ").replace(/^x:/, "").replace(/_/g, " ");
  if (req.operator === "exists" || req.threshold == null) return label;
  const window = req.windowDays ? ` in ${req.windowDays} days` : "";
  const op = req.operator === "lte" ? "at most" : "at least";
  return `${label}: ${op} ${req.threshold.toLocaleString()}${window}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CreatorProgramPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    captureReferralCode();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-28 sm:px-6">
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Partner programs
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Earn with the Atlantium network
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Two ways in: create for Atlanta tech, or bring its best people and
            companies into the network. Your standing, requirements, and rewards
            live right here.
          </p>
        </header>

        {authLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-80 animate-pulse rounded-xl border border-border/60 bg-background/60" />
            <div className="h-80 animate-pulse rounded-xl border border-border/60 bg-background/60" />
          </div>
        ) : isAuthenticated ? (
          <ProgramHub />
        ) : (
          <LoggedOutIntro />
        )}
      </main>
    </div>
  );
}

// ── Logged-out: program teasers + the inline login ───────────────────────────

function LoggedOutIntro() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <TeaserCard
          icon={<Instagram className="h-5 w-5" />}
          name="Tech Creator Program"
          line="Instagram-scoped. Keep 1,000+ followers, share your link, earn on every signup you drive."
        />
        <TeaserCard
          icon={<UserSearch className="h-5 w-5" />}
          name="Head Hunter Program"
          line="Approval required. Earn 500 credits per degree-holding candidate (bachelor's+) and 2,000 per revenue-generating startup you bring in."
        />
        <p className="text-sm leading-6 text-muted-foreground">
          Sign in to see live requirements, your standing, and your links. Both
          programs run on the same account.
        </p>
      </div>
      <InlineLogin />
    </div>
  );
}

function TeaserCard({ icon, name, line }: { icon: React.ReactNode; name: string; line: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-5">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <h2 className="font-semibold">{name}</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{line}</p>
    </div>
  );
}

/** The LoginPage email→OTP flow, inline: submit an email and the OTP grid
 *  populates in the same card; verify refreshes auth in place — no /login
 *  round trip, and the captured referral code rides the verify. */
function InlineLogin() {
  const { login, checkAuth } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp(value);
      setStep("otp");
      if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        const dev = await api.getDevOtpCode(value).catch(() => null);
        setDevCode(dev?.code ?? null);
      }
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (event: FormEvent) => {
    event.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const refCode = getReferralCode();
      const response = await api.verifyOtp(email, code, refCode || undefined);
      if (refCode) clearReferralCode();
      localStorage.setItem("userEmail", email);
      login(response.auth_token, response.user);
      await checkAuth();
      // No navigation: the hub takes this card's place.
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't verify.");
      setBusy(false);
    }
  };

  const onDigit = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const onDigitKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setOtpDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="h-fit rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-6">
      <div className="flex items-center gap-2 text-cyan-300">
        {step === "email" ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          {step === "email" ? "Sign in to get started" : "Enter your code"}
        </h2>
      </div>

      {step === "email" ? (
        <form onSubmit={submitEmail} className="mt-4 space-y-3">
          <label className="sr-only" htmlFor="hub-email">Email</label>
          <input
            id="hub-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-md border border-border/60 bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-cyan-400/60"
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Email me a code
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            New here? The code creates your account — no password, ever.
          </p>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Sent to <span className="font-medium text-foreground">{email}</span>
          </p>
          <div className="flex justify-between gap-2" onPaste={onPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => onDigit(index, e.target.value)}
                onKeyDown={(e) => onDigitKey(index, e)}
                className="h-12 w-full rounded-md border border-border/60 bg-background/70 text-center font-mono text-lg outline-none focus:border-cyan-400/60"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
          {devCode ? (
            <p className="font-mono text-xs text-muted-foreground">Local dev code: {devCode}</p>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify and continue
          </Button>
          <button
            type="button"
            onClick={() => { setStep("email"); setOtpDigits(Array(OTP_LENGTH).fill("")); setError(null); setDevCode(null); }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Different email
          </button>
        </form>
      )}

      {error ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── Logged-in: the two program cards ─────────────────────────────────────────

function ProgramHub() {
  const [data, setData] = useState<PartnerProgramsResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await api.getPartnerPrograms());
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the programs.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    // A join round-trip lands back here with ?boomin_status= — surface it,
    // clean the URL, and show fresh membership state.
    const params = new URLSearchParams(window.location.search);
    const status = params.get("boomin_status");
    if (status) {
      if (status === "failed") {
        toast.error(params.get("boomin_error_detail") || "Joining didn't complete — try again.");
      } else if (status === "pending_approval") {
        toast.success("Application received — you're in review.");
      } else {
        toast.success("You're in.");
      }
      ["boomin_status", "boomin_session_id", "boomin_username", "boomin_error", "boomin_error_detail"].forEach((k) => params.delete(k));
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
    void load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-96 animate-pulse rounded-xl border border-border/60 bg-background/60" />
        <div className="h-96 animate-pulse rounded-xl border border-border/60 bg-background/60" />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="flex items-start gap-2 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error ?? "Could not load the programs."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  const capacity = data.atlantium?.primary_operating_type ?? null;

  return (
    <div className="space-y-5">
      {capacity ? (
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          <BadgeCheck className="h-3.5 w-3.5" />
          Operating as <span className="capitalize">{capacity}</span>
        </p>
      ) : null}
      <div className="grid items-start gap-5 md:grid-cols-2">
        {data.programs.map((program) => (
          <ProgramCard key={program.key} program={program} onChanged={() => void load()} />
        ))}
      </div>
    </div>
  );
}

function ProgramCard({ program, onChanged }: { program: PartnerProgramSummary; onChanged: () => void }) {
  const membership = program.membership;
  const approval = membership?.member?.approvalStatus ?? membership?.member?.approval_status ?? null;
  const qualification = membership?.member?.qualificationStatus ?? membership?.member?.qualification_status ?? null;
  const referralCode = membership?.referral?.code ?? membership?.member?.referralCode ?? membership?.member?.referral_code ?? null;
  const referralUrl = membership?.referral?.url ?? null;
  const met = membership?.qualification?.requirementsMet ?? membership?.qualification?.requirements_met ?? [];
  const failed = membership?.qualification?.requirementsFailed ?? membership?.qualification?.requirements_failed ?? [];
  const icon = program.key === "tech_creator" ? <Instagram className="h-5 w-5" /> : <UserSearch className="h-5 w-5" />;

  const join = () => {
    window.location.assign(`${ATLANTIUM_API_BASE}/handoff/boomin/join?program=${program.key}`);
  };

  return (
    <section className="flex flex-col rounded-xl border border-border/60 bg-background/60">
      <header className="border-b border-border/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-cyan-300">
            {icon}
            <h2 className="font-semibold">{program.name}</h2>
          </div>
          {program.approval_required ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200">
              <ShieldCheck className="h-3 w-3" />
              Approval required
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{program.tagline}</p>
      </header>

      <div className="flex-1 space-y-5 p-5">
        <ul className="space-y-1.5">
          {program.details.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-cyan-400" />
              {line}
            </li>
          ))}
        </ul>

        {program.card && program.card.requirements.length > 0 ? (
          <div>
            {program.card.requirements.some((r) => r.scope !== "tier") ? (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirements</h3>
                <ul className="mt-2 space-y-1.5">
                  {program.card.requirements.filter((r) => r.scope !== "tier").map((req, i) => (
                    <li key={`${req.metricKey}-${i}`} className="flex items-start gap-2 text-sm">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{requirementLine(req)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {program.card.tiers.length > 1 ? (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier ladder</h3>
                <ul className="mt-2 space-y-1.5">
                  {program.card.tiers.map((tier) => {
                    const rungs = program.card!.requirements.filter((r) => r.tier === tier.name);
                    return (
                      <li key={tier.name} className="flex items-start gap-2 text-sm">
                        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
                        <span>
                          <span className="font-medium">{tier.name}</span>
                          {rungs.length ? (
                            <span className="text-muted-foreground"> — {rungs.map(requirementLine).join(" · ")}</span>
                          ) : (
                            <span className="text-muted-foreground"> — everyone starts here</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rewards</h3>
          <ul className="mt-2 space-y-1.5">
            {program.rewards.map((reward) => (
              <li key={reward.label} className="flex items-center justify-between gap-3 text-sm">
                <span>{reward.label}</span>
                <span className="font-mono text-xs text-cyan-200">{reward.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        {membership && (met.length + failed.length > 0) ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your standing</h3>
            <ul className="mt-2 space-y-1.5">
              {met.map((key) => (
                <li key={`met-${key}`} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="font-mono text-xs text-muted-foreground">{METRIC_LABELS[key] ?? key}</span>
                </li>
              ))}
              {failed.map((key) => (
                <li key={`failed-${key}`} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="font-mono text-xs text-muted-foreground">{METRIC_LABELS[key] ?? key}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="border-t border-border/40 p-5">
        {!membership ? (
          <Button onClick={join} className="w-full">
            {program.approval_required ? "Apply to join" : "Join the program"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : approval === "pending" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-amber-200">Application received — pending review.</p>
            <Button variant="outline" size="sm" onClick={onChanged}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        ) : approval === "rejected" ? (
          <p className="text-sm text-muted-foreground">
            This application wasn't approved. Reach out if you think that's wrong.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill value={approval ?? "approved"} />
              <StatusPill value={qualification ?? "pending"} />
              {membership.tier?.name ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Trophy className="h-3 w-3" />
                  {membership.tier.name}
                </span>
              ) : null}
            </div>
            {referralCode ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-background/70 px-2.5 py-1 font-mono text-sm">{referralCode}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(referralUrl ?? referralCode);
                    toast.success("Link copied");
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-xs hover:border-cyan-500/40"
                >
                  <Copy className="h-3 w-3" />
                  Copy link
                </button>
              </div>
            ) : null}
          </div>
        )}
      </footer>
    </section>
  );
}

function StatusPill({ value }: { value: string }) {
  const good = value === "approved" || value === "qualified";
  const warm = value === "pending" || value === "grace";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        good && "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        warm && "border border-amber-500/30 bg-amber-500/10 text-amber-200",
        !good && !warm && "border border-border/60 bg-muted/60 text-muted-foreground",
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export default CreatorProgramPage;
