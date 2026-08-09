import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Megaphone,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api, type CreatorDashboardResponse } from "@/lib/api";
import { deriveMyStanding, type DeploymentCard } from "@/lib/partners";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

const EVERGREEN_COPY =
  "This is your link. During a campaign, use the campaign's link so it counts toward that campaign.";

export function PartnersPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<CreatorDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const response = await api.getMyPartnerStanding();
      setData(response);
      setState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your partner standing.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-lg border border-border/60 bg-background/60" />
        <div className="h-40 animate-pulse rounded-lg border border-border/60 bg-background/60" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
        <div className="flex items-start gap-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm font-medium hover:border-cyan-500/40"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  const standing = deriveMyStanding(data);

  if (!standing) {
    return (
      <div className="rounded-lg border border-border/60 bg-background/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">You're not a partner yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Join the Atlantium creator program to get your own referral link, earn on
          campaigns, and track your standing right here.
        </p>
        <Link
          to="/creator-program"
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:border-cyan-300/60"
        >
          Join the creator program
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Standing header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill value={standing.approval} />
          <StatusPill value={standing.qualification} />
          <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {standing.tierName ?? "No tier"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm font-medium hover:border-cyan-500/40"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Pinned evergreen referral card */}
      <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-5">
        <div className="flex items-center gap-2 text-cyan-300">
          <Link2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Your link</h3>
        </div>
        {standing.referralCode ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-background/70 px-2.5 py-1 font-mono text-sm">
                {standing.referralCode}
              </code>
              <CopyButton value={standing.referralUrl ?? standing.referralCode} label="Copy link" />
              {standing.referralUrl && (
                <a
                  href={standing.referralUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {standing.referralUrl && (
              <p className="break-all font-mono text-xs text-muted-foreground">{standing.referralUrl}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Your referral link will appear here once your enrollment is set up.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{EVERGREEN_COPY}</p>
      </div>

      {/* Campaigns */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Campaigns
          </h3>
        </div>
        {standing.deployments.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {standing.deployments.map((deployment) => (
              <CampaignCard key={deployment.id} deployment={deployment} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-5 text-sm text-muted-foreground">
            No campaigns are running for you right now. Keep sharing your link above —
            campaign links will show up here when a campaign goes live.
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ deployment }: { deployment: DeploymentCard }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        deployment.paused
          ? "border-amber-500/30 bg-amber-500/5 opacity-80"
          : "border-border/60 bg-background/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{deployment.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[deployment.objective, deployment.channel, deployment.format]
              .filter(Boolean)
              .join(" · ") || "Campaign"}
          </p>
        </div>
        {deployment.paused ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
            <PauseCircle className="h-3 w-3" />
            Paused
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
            Live
          </span>
        )}
      </div>

      {deployment.linkCode && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-muted/60 px-2.5 py-1 font-mono text-xs">
            {deployment.linkCode}
          </code>
          <CopyButton value={deployment.linkUrl ?? deployment.linkCode} label="Copy" />
        </div>
      )}
      {deployment.paused && (
        <p className="mt-2 text-xs text-amber-300/90">
          This campaign is paused — hold off on sharing its link.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Events</p>
          <p className="mt-0.5 text-sm font-semibold">{deployment.events.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Value</p>
          <p className="mt-0.5 text-sm font-semibold">{deployment.valueLabel}</p>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs font-medium text-muted-foreground hover:border-cyan-500/40 hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.replace(/_/g, " ");
  const good = value === "approved" || value === "qualified" || value === "connected";
  const warn = value === "pending" || value === "pending_approval" || value === "grace";
  const bad = value === "rejected" || value === "not_qualified";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        good && "bg-emerald-500/10 text-emerald-300",
        warn && "bg-amber-500/10 text-amber-300",
        bad && "bg-red-500/10 text-red-300",
        !good && !warn && !bad && "bg-muted/60 text-muted-foreground",
      )}
    >
      {good && <ShieldCheck className="h-3 w-3" />}
      {normalized}
    </span>
  );
}
