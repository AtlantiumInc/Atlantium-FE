import { useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { IntakeChart } from "@/components/IntakeChart";

type Insights = Awaited<ReturnType<typeof api.getJobInsights>>;

/* Salary bands: width_bucket(x, 40k, 300k, 13) → 13 interior buckets of $20k,
   bucket 0 = under $40k, bucket 14 = $300k+. */
function bandLabel(bucket: number): string {
  if (bucket <= 0) return "<40";
  if (bucket >= 14) return "300+";
  const lo = 40 + (bucket - 1) * 20;
  return `${lo}`;
}

function Bars({
  data,
  color,
  labelEvery = 1,
}: {
  data: Array<{ label: string; value: number; title?: string }>;
  color: string;
  labelEvery?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={d.title ?? `${d.label}: ${d.value}`}>
          <span className="text-[9px] font-mono text-muted-foreground leading-none">
            {d.value > 0 ? d.value : ""}
          </span>
          <div
            className={`w-full rounded-t ${color}`}
            style={{ height: `${Math.max(2, (d.value / max) * 88)}px` }}
          />
          <span className="text-[8px] font-mono text-muted-foreground leading-none truncate w-full text-center">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Realtime view: what Atlanta employers are asking for, aggregated over the
 * last 7 days of intake and refreshed every sync. Every number is computed
 * from the live board — nothing editorial, nothing estimated except where
 * the salary chart folds in the labeled comp estimates to cover no-salary
 * postings (the tooltip carries the published count).
 */
export function RealtimeMarketPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getJobInsights().then(setData).catch(() => setError(true));
  }, []);

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
  const salaryData = Array.from({ length: 15 }, (_, b) => {
    const row = data.salary_bands.find((r) => r.bucket === b);
    return {
      label: bandLabel(b),
      value: row?.n ?? 0,
      title: row ? `$${bandLabel(b)}k band: ${row.n} roles (${row.published} published pay)` : undefined,
    };
  });
  const senMax = Math.max(1, ...data.seniority_mix.map((s) => s.n));

  return (
    <div className="space-y-6">
      {/* Pulse header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Live market read · updates every 24h
          </span>
        </div>
        <div className="flex gap-5 text-sm">
          <span><span className="font-bold text-foreground tabular-nums">{t.total_7d.toLocaleString()}</span> <span className="text-muted-foreground text-xs">new · 7d</span></span>
          <span><span className="font-bold text-cyan-400 tabular-nums">{t.total_24h.toLocaleString()}</span> <span className="text-muted-foreground text-xs">last 24h</span></span>
          {t.med_min != null && t.med_max != null && (
            <span><span className="font-bold text-emerald-400 tabular-nums">${Math.round(t.med_min / 1000)}k–${Math.round(t.med_max / 1000)}k</span> <span className="text-muted-foreground text-xs">median pay</span></span>
          )}
          <span><span className="font-bold text-violet-400 tabular-nums">{t.ai_roles}</span> <span className="text-muted-foreground text-xs">AI roles</span></span>
        </div>
      </div>

      {/* Salary distribution — the chart */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-bold">Where the money is</h3>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">roles added 7d × salary band ($k/yr)</span>
        </div>
        <Bars data={salaryData} color="bg-emerald-500/70" labelEvery={2} />
      </div>

      {/* Intake — full-width, 5h buckets, hover/tap reveals the roles */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-bold">Intake</h3>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">roles arriving · 5h buckets · hover a bar for the roles</span>
        </div>
        <IntakeChart jobs={data.intake_5h ?? []} />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Seniority demand */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-bold">Who they want</h3>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">seniority · 7d</span>
          </div>
          <div className="space-y-2">
            {data.seniority_mix.map((s2) => (
              <div key={s2.name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] text-muted-foreground truncate">{s2.name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500/70" style={{ width: `${(s2.n / senMax) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-[11px] font-mono text-foreground tabular-nums">{s2.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech demand */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-bold">What they're asking for</h3>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">tech · 7d</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.top_tech.map((tech) => (
              <span key={tech.name} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-1 text-[11px] text-cyan-300">
                {tech.name}
                <span className="font-mono text-[10px] text-cyan-500/80 tabular-nums">{tech.n}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Top hirers */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-bold">Who's hiring hardest</h3>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">companies · 7d</span>
          </div>
          <div className="space-y-1.5">
            {data.top_companies.map((co, i) => (
              <div key={co.name} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-[10px] font-mono text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-foreground">{co.name}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{co.n} roles</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        Computed from live postings on this board — no estimates except the labeled comp bands in the salary chart.
      </p>
    </div>
  );
}
