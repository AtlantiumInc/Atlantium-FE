import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, ExternalLink, Instagram, MousePointerClick, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { AccessPendingOverlay } from "@/components/AccessPendingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { api, type CreatorDashboardResponse, type CreatorStandingPartner } from "@/lib/api";
import { cn } from "@/lib/utils";

type LoadState = "idle" | "loading" | "ready" | "error";

export function DashboardPage() {
  const { user, logout, hasAccess } = useAuth();
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<CreatorDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testClickState, setTestClickState] = useState<"idle" | "loading">("idle");

  const loadCreators = async () => {
    setState("loading");
    setError(null);
    try {
      const response = await api.getCreatorDashboard();
      setData(response);
      setState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load creator standing.");
      setState("error");
    }
  };

  const recordTestClick = async () => {
    setTestClickState("loading");
    setError(null);
    try {
      const response = await api.recordCreatorDashboardTestClick();
      setData(response);
      setState("ready");
    } catch (clickError) {
      setError(clickError instanceof Error ? clickError.message : "Could not record test click.");
      setState("error");
    } finally {
      setTestClickState("idle");
    }
  };

  useEffect(() => {
    void loadCreators();
  }, []);

  const totals = data?.totals ?? {
    total: data?.partners.length ?? 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    qualified: 0,
    grace: 0,
    notQualified: 0,
    connected: 0,
  };
  const partners = useMemo(() => data?.partners ?? [], [data]);

  if (!hasAccess) {
    return <AccessPendingOverlay onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-[#030a10] text-slate-100">
      <header className="border-b border-cyan-500/10 bg-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              A
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">Atlantium</p>
              <p className="text-xs text-slate-500">Creator operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileDropdown user={user} onLogout={logout} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 px-3 py-1 text-xs font-medium text-cyan-300">
              <Users className="h-3.5 w-3.5" />
              Creators
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Partner standing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Atlantium users who joined through Boomin handoff, with approval, channel, tier, and qualification state mirrored from Boomin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCreators()}
              disabled={state === "loading"}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 hover:border-cyan-400/50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", state === "loading" && "animate-spin")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void recordTestClick()}
              disabled={testClickState === "loading"}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-300/60 disabled:cursor-wait disabled:opacity-60"
            >
              <MousePointerClick className={cn("h-4 w-4", testClickState === "loading" && "animate-pulse")} />
              Test click
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total partners" value={totals.total} />
          <Metric label="Approved" value={totals.approved} tone="good" />
          <Metric label="Qualified" value={totals.qualified} tone="good" />
          <Metric label="Grace / not qualified" value={totals.grace + totals.notQualified} tone={totals.grace + totals.notQualified > 0 ? "warn" : "neutral"} />
        </section>

        {state === "error" && (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
          <div className="grid grid-cols-[minmax(220px,1.35fr)_120px_130px_130px_160px_180px_220px] gap-4 border-b border-slate-800 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Partner</span>
            <span>Approval</span>
            <span>Qualification</span>
            <span>Tier</span>
            <span>Channel</span>
            <span>Referral</span>
            <span>Metrics</span>
          </div>

          {state === "loading" && !partners.length ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading creator standing...</div>
          ) : partners.length ? (
            partners.map((partner) => <CreatorRow key={partner.member.id} partner={partner} />)
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No partners have joined yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "good" | "warn" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn(
        "mt-2 text-2xl font-semibold",
        tone === "good" && "text-emerald-300",
        tone === "warn" && "text-amber-300",
        tone === "neutral" && "text-slate-50",
      )}>
        {value}
      </p>
    </div>
  );
}

function CreatorRow({ partner }: { partner: CreatorStandingPartner }) {
  const approval = partner.member.approvalStatus ?? partner.member.approval_status ?? "pending";
  const qualification = partner.member.qualificationStatus ?? partner.member.qualification_status ?? partner.qualification?.status ?? "pending";
  const displayName = partner.externalIdentity?.name || partner.partner?.name || partner.partner?.email || "Unknown partner";
  const email = partner.externalIdentity?.email || partner.partner?.email || "No email";
  const username = partner.instagram?.username;
  const followers = partner.instagram?.followerCount ?? partner.instagram?.follower_count;
  const referralCode = partner.referral?.code ?? partner.referralCode ?? partner.member.referralCode ?? partner.member.referral_code;
  const referralLink = partner.referral?.url ?? partner.referralLink;
  const metrics = getPartnerMetrics(partner);

  return (
    <div className="grid grid-cols-[minmax(220px,1.35fr)_120px_130px_130px_160px_180px_220px] items-center gap-4 border-b border-slate-900 px-4 py-4 text-sm last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-100">{displayName}</p>
        <p className="truncate text-xs text-slate-500">{email}</p>
      </div>
      <StatusPill value={approval} />
      <StatusPill value={qualification} />
      <span className="text-slate-300">{partner.tier?.name ?? "No tier"}</span>
      <div className="min-w-0">
        {username ? (
          <div className="flex items-center gap-2 text-cyan-200">
            <Instagram className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="truncate">@{username}</p>
              <p className="text-xs text-slate-500">{typeof followers === "number" ? `${followers.toLocaleString()} followers` : "Connected"}</p>
            </div>
          </div>
        ) : (
          <span className="text-slate-500">No channel</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-slate-300">{referralCode ?? "No code"}</p>
        {referralLink && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200" href={referralLink} target="_blank" rel="noreferrer">
              Open
              <ExternalLink className="h-3 w-3" />
            </a>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-slate-100" onClick={() => void navigator.clipboard.writeText(referralLink)}>
              Copy
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
        <MetricMini label="Clicks" value={metrics.linkClicks} />
        <MetricMini label="Signups" value={metrics.signups} />
        <MetricMini label="Sales" value={metrics.sales} />
        <MetricMini label="GMV" value={`$${(metrics.gmvCents / 100).toLocaleString()}`} />
      </div>
    </div>
  );
}

function getPartnerMetrics(partner: CreatorStandingPartner) {
  const fromApi = partner.metrics ?? {};
  const fromRollups = new Map((partner.rollups ?? []).map((rollup) => [rollup.metricKey ?? rollup.metric_key, Number(rollup.total ?? 0)]));
  return {
    linkClicks: Number(fromApi.linkClicks ?? fromRollups.get("link_clicks") ?? 0),
    signups: Number(fromApi.signups ?? fromRollups.get("referral_count") ?? 0),
    sales: Number(fromApi.sales ?? fromRollups.get("sales_count") ?? 0),
    gmvCents: Number(fromApi.gmvCents ?? fromRollups.get("gmv_cents") ?? 0),
    productUsage: Number(fromApi.productUsage ?? fromRollups.get("product_usage_count") ?? 0),
  };
}

function MetricMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-600">{label}</p>
      <p className="font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.replace("_", " ");
  const good = value === "approved" || value === "qualified" || value === "connected";
  const warn = value === "pending" || value === "pending_approval" || value === "grace";
  const bad = value === "rejected" || value === "not_qualified";
  return (
    <span className={cn(
      "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
      good && "bg-emerald-500/10 text-emerald-300",
      warn && "bg-amber-500/10 text-amber-300",
      bad && "bg-red-500/10 text-red-300",
      !good && !warn && !bad && "bg-slate-800 text-slate-300",
    )}>
      {good && <ShieldCheck className="h-3 w-3" />}
      {normalized}
    </span>
  );
}
