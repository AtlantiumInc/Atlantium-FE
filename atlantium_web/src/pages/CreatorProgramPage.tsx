import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Mail, Radio, Share2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { useAuth } from "@/contexts/AuthContext";
import Boomin from "@boomin/connect";
import { captureReferralCode, getReferralCode } from "@/lib/referral";
import { publicRuntimeUrl } from "@/lib/runtimeEnv";

type ConnectState = "details" | "otp" | "instagram" | "pending" | "connected" | "error";

type CurrentCreatorResult = {
  creator?: {
    email?: string;
    name?: string;
  };
  user?: {
    email?: string;
    name?: string;
  };
  member?: {
    approval_status?: string;
    connection_status?: string;
    integration_id?: string;
  };
  integration?: {
    username?: string;
    status?: string;
  };
  status?: string;
};

type BoominStatusResult = {
  success?: boolean;
  boomin?: {
    status?: string;
    sessionId?: string;
    session_id?: string;
    username?: string | null;
    member?: {
      approvalStatus?: string;
      approval_status?: string;
      connectionStatus?: string;
      connection_status?: string;
    } | null;
    instagram?: {
      username?: string | null;
    } | null;
  };
};

const BOOMIN_PUBLIC_KEY = import.meta.env.VITE_BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h";
const BOOMIN_API_BASE = publicRuntimeUrl(
  import.meta.env.VITE_BOOMIN_CONNECT_API_BASE,
  "https://api.boomin.ai/v1/connect"
).replace(/\/+$/, "");
const BOOMIN_REDIRECT_URI = publicRuntimeUrl(
  import.meta.env.VITE_BOOMIN_CONNECT_REDIRECT_URI,
  "https://atlantium.ai/creator-program"
);
const ATLANTIUM_API_BASE = publicRuntimeUrl(
  import.meta.env.VITE_ATLANTIUM_API_BASE,
  "https://api.atlantium.ai/v1"
).replace(/\/+$/, "");
const CONNECT_RESULT_STORAGE_KEY = "atlantium_creator_connect_result";
const BOOMIN_REDIRECT_RESULT_STORAGE_KEY = "boomin_connect_redirect_result";
const CONNECT_RESULT_PARAMS = [
  "boomin_status",
  "boomin_session_id",
  "boomin_username",
  "boomin_error",
  "boomin_error_detail",
];

function formatConnectError(error: string, detail?: string | null) {
  const suffix = detail ? ` Detail: ${detail}` : "";

  if (error === "instagram_oauth_no_code" || error === "instagram_oauth_cancelled") {
    return `Instagram did not return an authorization code. Choose Allow/Continue on the Instagram permission screen, then try again.${suffix}`;
  }

  if (error === "access_denied") {
    return `Instagram access was not approved. Choose Allow/Continue on the Instagram permission screen, then try again.${suffix}`;
  }

  if (error === "connect_session_not_found") {
    return `Boomin could not recover this connect session. Start Instagram connect again from this page.${suffix}`;
  }

  if (error === "instagram_callback_failed") {
    return `Instagram authorized, but Boomin could not finish saving the connection.${suffix}`;
  }

  return `Instagram connection did not finish (${error}). You can try again.${suffix}`;
}

export function CreatorProgramPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [connectState, setConnectState] = useState<ConnectState>("details");
  const [statusText, setStatusText] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRestoringHandoff, setIsRestoringHandoff] = useState(false);

  useEffect(() => {
    captureReferralCode();
    setReferralCode(getReferralCode());

    const params = new URLSearchParams(window.location.search);
    const status = params.get("boomin_status");
    const returnedSessionId = params.get("boomin_session_id");
    const username = params.get("boomin_username");
    const error = params.get("boomin_error");
    const errorDetail = params.get("boomin_error_detail");
    const hasConnectResult = params.has("boomin_status")
      || params.has("boomin_session_id")
      || params.has("boomin_username")
      || params.has("boomin_error")
      || params.has("boomin_error_detail");

    if (hasConnectResult) {
      try {
        window.sessionStorage.setItem(CONNECT_RESULT_STORAGE_KEY, JSON.stringify({
          status,
          sessionId: returnedSessionId,
          username,
          error,
          errorDetail,
          at: new Date().toISOString(),
        }));
      } catch {
        // Some embedded/privacy contexts deny storage; the visible status still works.
      }
    }

    if (status === "pending_approval") {
      setConnectState("pending");
      if (returnedSessionId) setSessionId(returnedSessionId);
      // Only claim Instagram is connected when the flow actually returned one.
      setStatusText(username ? `@${username} is connected and pending approval.` : "Application received — pending approval.");
    } else if (status === "approved" || status === "connected") {
      setConnectState("connected");
      setStatusText(username ? `@${username} is connected.` : "You are approved and active.");
    } else if (error) {
      if (returnedSessionId) setSessionId(returnedSessionId);
      setConnectState("error");
      setStatusText(formatConnectError(error, errorDetail));
    }

    if (hasConnectResult) {
      const cleanUrl = new URL(window.location.href);
      CONNECT_RESULT_PARAMS.forEach((key) => {
        cleanUrl.searchParams.delete(key);
      });
      if (cleanUrl.hash === "#_") cleanUrl.hash = "";
      window.history.replaceState({}, "", cleanUrl.toString());
    }

    if (hasConnectResult) return;

    let cancelled = false;

    const restoreCreator = async () => {
      try {
        const boomin = await getBoomin();
        const current = await boomin.getCurrentCreator() as CurrentCreatorResult;
        if (cancelled) return;

        const creator = current.creator || current.user;
        if (creator?.email) setCreatorEmail(creator.email);
        if (creator?.name) setCreatorName(creator.name);

        const approvalStatus = current.status || current.member?.approval_status || "pending";
        const isConnected = Boolean(current.integration)
          || current.member?.connection_status === "connected"
          || Boolean(current.member?.integration_id);

        if (approvalStatus === "approved") {
          setConnectState("connected");
          setStatusText(current.integration?.username
            ? `@${current.integration.username} is approved and connected.`
            : "Approved. You are active in the Atlantium creator program.");
        } else if (approvalStatus === "rejected") {
          setConnectState("error");
          setStatusText("Your creator application was not approved.");
        } else if (isConnected) {
          setConnectState("pending");
          setStatusText(current.integration?.username
            ? `@${current.integration.username} is connected and pending approval.`
            : "Your Instagram is connected and pending approval.");
        } else {
          setConnectState("instagram");
          setStatusText("Email verified. Connect Instagram to finish your creator application.");
        }
      } catch {
        // No saved creator token yet; show the first-time signup form.
      }
    };

    void restoreCreator();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    const hasConnectResult = CONNECT_RESULT_PARAMS.some((key) => params.has(key));
    if (hasConnectResult) return;

    let cancelled = false;

    const restoreSignedHandoff = async () => {
      setIsRestoringHandoff(true);
      try {
        const response = await fetch(`${ATLANTIUM_API_BASE}/handoff/boomin/status`, {
          method: "GET",
          credentials: "include",
        });
        const result = await response.json().catch(() => ({})) as BoominStatusResult;
        if (!response.ok || !result.boomin) return;
        if (cancelled) return;

        const boomin = result.boomin;
        const nextSessionId = boomin.sessionId || boomin.session_id;
        if (nextSessionId) setSessionId(nextSessionId);

        const approvalStatus = boomin.member?.approvalStatus || boomin.member?.approval_status || boomin.status || "";
        const connectionStatus = boomin.member?.connectionStatus || boomin.member?.connection_status || "";
        const username = boomin.instagram?.username || boomin.username || "";

        if (approvalStatus === "approved" || boomin.status === "approved") {
          setConnectState("connected");
          setStatusText(username
            ? `@${username} is approved and connected.`
            : "Approved. You are active in the Atlantium creator program.");
        } else if (approvalStatus === "rejected" || boomin.status === "rejected") {
          setConnectState("error");
          setStatusText("Your creator application was not approved.");
        } else if (boomin.status === "pending_approval" || connectionStatus === "connected") {
          setConnectState("pending");
          // "Instagram is connected" only when the membership actually has one.
          setStatusText(username && connectionStatus === "connected"
            ? `@${username} is connected and pending approval.`
            : "Application received — pending approval.");
        } else if (boomin.status === "needs_instagram") {
          setConnectState("instagram");
          setStatusText("Connect Instagram to finish your creator application.");
        }
      } catch {
        // Keep the default join CTA if the status restore fails.
      } finally {
        if (!cancelled) setIsRestoringHandoff(false);
      }
    };

    void restoreSignedHandoff();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const getBoomin = async () => {
    Boomin.init({
      publicKey: BOOMIN_PUBLIC_KEY,
      apiBase: BOOMIN_API_BASE,
      redirectUri: BOOMIN_REDIRECT_URI,
    });
    return Boomin;
  };

  const startSignedHandoff = () => {
    setStatusText("");
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent("/creator-program")}`);
      return;
    }
    setIsBusy(true);
    try {
      window.sessionStorage.removeItem(CONNECT_RESULT_STORAGE_KEY);
      window.sessionStorage.removeItem(BOOMIN_REDIRECT_RESULT_STORAGE_KEY);
    } catch {
      // Storage cleanup is best-effort in private or embedded contexts.
    }
    window.location.assign(`${ATLANTIUM_API_BASE}/handoff/boomin/join`);
  };

  const requestOtp = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatusText("");
    try {
      const boomin = await getBoomin();
      await boomin.requestOtp({
        email: creatorEmail,
        name: creatorName,
        referralCode,
        metadata: {
          customer: "atlantium",
          surface: "creator_program_page",
        },
      });
      setConnectState("otp");
      setStatusText("Check your email for your Atlantium creator verification code.");
    } catch (error) {
      setConnectState("details");
      setStatusText(error instanceof Error ? error.message : "Could not send verification code.");
    } finally {
      setIsBusy(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setStatusText("");
    try {
      const boomin = await getBoomin();
      await boomin.verifyOtp({
        email: creatorEmail,
        name: creatorName,
        code: otpCode,
        referralCode,
        metadata: {
          customer: "atlantium",
          surface: "creator_program_page",
        },
      });
      setConnectState("instagram");
      setStatusText("Email verified. Connect Instagram to finish your creator application.");
    } catch (error) {
      setConnectState("otp");
      setStatusText(error instanceof Error ? error.message : "Could not verify that code.");
    } finally {
      setIsBusy(false);
    }
  };

  const connectInstagram = async () => {
    if (isAuthenticated) {
      startSignedHandoff();
      return;
    }
    setIsBusy(true);
    setStatusText("");
    try {
      try {
        window.sessionStorage.removeItem(CONNECT_RESULT_STORAGE_KEY);
        window.sessionStorage.removeItem(BOOMIN_REDIRECT_RESULT_STORAGE_KEY);
      } catch {
        // Storage cleanup is best-effort in private or embedded contexts.
      }

      const boomin = await getBoomin();

      boomin.on("connect:pending_approval", () => {
        setConnectState("pending");
        setStatusText("Your Instagram is connected and pending approval.");
      });

      const session = await boomin.connectInstagram({
        referralCode,
        mode: "manual",
        requireCreator: true,
        redirectUri: BOOMIN_REDIRECT_URI,
        metadata: {
          customer: "atlantium",
          surface: "creator_program_page",
        },
      });
      if (session.sessionId) setSessionId(session.sessionId);
      if (session.authUrl) window.location.assign(session.authUrl);
      else setIsBusy(false);
    } catch (error) {
      setConnectState("instagram");
      setStatusText(error instanceof Error ? error.message : "Could not start Instagram connect.");
      setIsBusy(false);
    }
  };

  const refreshStatus = async () => {
    if (!sessionId) return;
    setIsBusy(true);
    setStatusText("");
    try {
      const boomin = await getBoomin();
      const status = await boomin.getConnectStatus(sessionId);
      const nextStatus = String(status.status || "");
      if (nextStatus === "approved") {
        setConnectState("connected");
        setStatusText("Approved. You are active in the Atlantium creator program.");
      } else if (nextStatus === "rejected") {
        setConnectState("error");
        setStatusText("Your creator application was not approved.");
      } else {
        setConnectState("pending");
        setStatusText("Still pending approval.");
      }
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Could not refresh status.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="relative overflow-hidden">
        <section className="relative min-h-[calc(100vh-4rem)] border-b border-border/40">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1800&h=1100&fit=crop&q=85"
            alt="Creators building with laptops and cameras"
            className="absolute inset-0 h-full w-full object-cover opacity-30 dark:opacity-30"
          />
          <div className="absolute inset-0 bg-background/88 dark:bg-background/78" />
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 content-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                <Radio className="h-3.5 w-3.5" />
                Atlantium Creator Program
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                Help ambitious builders find the frontier.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Partner with Atlantium to distribute useful AI education, founder resources, jobs, and events to the people already building what comes next.
              </p>

              <div className="mt-8 max-w-xl">
                {connectState === "details" ? (
                  isAuthenticated ? (
                    <button
                      type="button"
                      onClick={startSignedHandoff}
                      disabled={isBusy || authLoading || isRestoringHandoff}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-70"
                    >
                      {isBusy || isRestoringHandoff ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                      {isRestoringHandoff ? "Checking status" : "Connect Instagram"}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={startSignedHandoff}
                        disabled={authLoading}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-70"
                      >
                        {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        Sign in to join
                      </button>
                      <form onSubmit={requestOtp} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <label className="sr-only" htmlFor="creator-name">Name</label>
                        <input
                          id="creator-name"
                          value={creatorName}
                          onChange={(event) => setCreatorName(event.target.value)}
                          placeholder="Name"
                          className="h-12 rounded-md border border-border/70 bg-background/80 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400"
                        />
                        <label className="sr-only" htmlFor="creator-email">Email</label>
                        <input
                          id="creator-email"
                          value={creatorEmail}
                          onChange={(event) => setCreatorEmail(event.target.value)}
                          placeholder="Email-only fallback"
                          type="email"
                          required
                          className="h-12 rounded-md border border-border/70 bg-background/80 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400"
                        />
                        <button
                          type="submit"
                          disabled={isBusy}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border/70 bg-background/80 px-5 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-70"
                        >
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          Send code
                        </button>
                      </form>
                    </div>
                  )
                ) : null}

                {connectState === "otp" ? (
                  <form onSubmit={verifyOtp} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <label className="sr-only" htmlFor="creator-otp">Verification code</label>
                    <input
                      id="creator-otp"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      placeholder="Verification code"
                      inputMode="numeric"
                      required
                      className="h-12 rounded-md border border-border/70 bg-background/80 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-gray-100"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Verify
                    </button>
                  </form>
                ) : null}

                {connectState === "instagram" ? (
                  <button
                    type="button"
                    onClick={connectInstagram}
                    disabled={isBusy}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-70"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                    Connect Instagram
                  </button>
                ) : null}

                {connectState === "error" ? (
                  <button
                    type="button"
                    onClick={connectInstagram}
                    disabled={isBusy}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-70"
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                    Try Instagram again
                  </button>
                ) : null}

                {connectState === "pending" ? (
                  <button
                    type="button"
                    onClick={refreshStatus}
                    disabled={!sessionId || isBusy}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Pending approval
                  </button>
                ) : null}

                {connectState === "connected" ? (
                  <div className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500/15 px-5 text-sm font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Approved
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/mission">
                  <Button variant="outline" className="h-12 gap-2">
                    Why Atlantium
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {statusText ? (
                <div className={`mt-4 inline-flex max-w-xl items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  connectState === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                }`}>
                  {connectState === "error" ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {statusText}
                </div>
              ) : null}

              {referralCode ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Referral code captured: <span className="font-semibold text-foreground">{referralCode}</span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 self-center">
              {[
                ["Build distribution loops", "Share Atlantium programs, resources, and events with your audience."],
                ["Earn from referred members", "Use your creator referral code across campaigns and onboarding pages."],
                ["Bring better signal", "Help builders discover practical AI education instead of noisy feeds."],
              ].map(([title, body], index) => (
                <div key={title} className="rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                      index === 0 ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" :
                      index === 1 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}>
                      {index === 0 ? <Share2 className="h-4 w-4" /> : index === 1 ? <Users className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
