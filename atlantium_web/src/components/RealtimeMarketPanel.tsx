import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { SalaryCurveChart } from "@/components/SalaryCurveChart";
import { CompanyLogo } from "@/components/CompanyLogo";

type Insights = Awaited<ReturnType<typeof api.getJobInsights>>;

/* Salary bands from width_bucket(x, 40k, 300k, 13): bucket 1 starts at $40k,
   each interior bucket spans $20k, bucket 14 = $300k+. */
function bandRange(bucket: number): string {
  if (bucket <= 0) return "under $40k";
  if (bucket >= 14) return "$300k+";
  const lo = 40 + (bucket - 1) * 20;
  return `$${lo}k–$${lo + 20}k`;
}

/**
 * Realtime view: one chart — roles arriving in 5h buckets, hover/tap for the
 * roles themselves — and beneath it, the market read as written insights with
 * the figures highlighted. Every number is computed from the live board.
 */
export function RealtimeMarketPanel({ preloaded = null }: { preloaded?: Insights | null }) {
  const [data, setData] = useState<Insights | null>(preloaded);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (preloaded) { setData(preloaded); return; }
    api.getJobInsights().then(setData).catch(() => setError(true));
  }, [preloaded]);

  if (error) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Couldn't load the market read. Try again shortly.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Reading the market…</span>
      </div>
    );
  }

  const t = data.totals;
  const bands = data.salary_bands ?? [];
  const peak = bands.reduce((a, b) => (b.n > (a?.n ?? 0) ? b : a), bands[0]);
  const high = bands.filter((b) => b.bucket >= 9).reduce((s, b) => s + b.n, 0); // $200k+
  const sen = data.seniority_mix ?? [];
  const senBy = (name: string) => sen.find((s) => s.name.toLowerCase().includes(name))?.n ?? 0;
  const seniorish = senBy("senior") + senBy("lead");
  const entry = senBy("entry") + senBy("intern");
  const topCo = data.top_companies?.[0];

  const intake = data.intake_5h ?? [];

  return (
    <div className="space-y-5">
      {/* KPI strip — the week at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 px-4 py-3">
          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-cyan-500/10 blur-2xl" />
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">New this week</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{t.total_7d.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{t.total_24h > 0 ? `${t.total_24h} in the last 24h` : "rolling release, live"}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 px-4 py-3">
          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Median pay</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
            {t.med_min != null && t.med_max != null ? `$${Math.round(t.med_min / 1000)}–${Math.round(t.med_max / 1000)}k` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">published ranges</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 px-4 py-3">
          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Paying $200k+</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{high}</p>
          <p className="text-[11px] text-muted-foreground">roles this week</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card/30 px-4 py-3">
          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-violet-500/10 blur-2xl" />
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Heaviest hirer</p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-foreground leading-tight truncate">
            {topCo && <CompanyLogo name={topCo.name} logo={(topCo as { logo?: string | null }).logo} size={18} />}
            <span className="truncate">{topCo?.name ?? "—"}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{topCo ? `${topCo.n} open roles` : ""}</p>
        </div>
      </div>

      {/* Hero — the salary curve */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <h3 className="text-base font-bold whitespace-nowrap">Salaries · last 7 days</h3>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground uppercase tracking-wide truncate">live · hover to inspect · click to pin</span>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
          <SalaryCurveChart jobs={intake} />
        </div>
      </div>

      {/* Two sharp reads */}
      <div className="grid sm:grid-cols-2 gap-3">
        {peak && (
          <div className="rounded-xl border-l-2 border-emerald-500/60 bg-card/30 px-4 py-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The money concentrates at <span className="font-bold text-emerald-400 tabular-nums">{bandRange(peak.bucket)}</span> —{" "}
              <span className="font-bold text-foreground tabular-nums">{peak.n}</span> of this week's roles landed there.
            </p>
          </div>
        )}
        {sen.length > 0 && (
          <div className="rounded-xl border-l-2 border-violet-500/60 bg-card/30 px-4 py-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Employers are buying experience: <span className="font-bold text-violet-400 tabular-nums">{seniorish}</span> senior-and-above
              roles against <span className="font-bold text-foreground tabular-nums">{entry}</span> entry-level this week.
            </p>
          </div>
        )}
      </div>

      {/* Tech demand */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-bold">What they're asking for</h3>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">tech · 7d</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(data.top_tech ?? []).map((tech) => (
            <span key={tech.name} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-1 text-[11px] text-cyan-300">
              {tech.name}
              <span className="font-mono text-[10px] text-cyan-500/80 tabular-nums">{tech.n}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
