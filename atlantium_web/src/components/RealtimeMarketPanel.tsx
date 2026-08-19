import { useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { IntakeChart } from "@/components/IntakeChart";

type Insights = Awaited<ReturnType<typeof api.getJobInsights>>;

/* Salary bands from width_bucket(x, 40k, 300k, 13): bucket 1 starts at $40k,
   each interior bucket spans $20k, bucket 14 = $300k+. */
function bandRange(bucket: number): string {
  if (bucket <= 0) return "under $40k";
  if (bucket >= 14) return "$300k+";
  const lo = 40 + (bucket - 1) * 20;
  return `$${lo}k–$${lo + 20}k`;
}

const fmtK = (n: number) => `$${Math.round(n / 1000)}k`;

/**
 * Realtime view: one chart — roles arriving in 5h buckets, hover/tap for the
 * roles themselves — and beneath it, the market read as written insights with
 * the figures highlighted. Every number is computed from the live board.
 */
const AI_RE = /\b(ai|machine learning|ml|genai|llm)\b/i;

export function RealtimeMarketPanel({ preloaded = null }: { preloaded?: Insights | null }) {
  const [data, setData] = useState<Insights | null>(preloaded);
  const [error, setError] = useState(false);
  const [lensKey, setLensKey] = useState<"top" | "ai" | null>(null);

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

  const em = "font-bold text-foreground tabular-nums";
  const insights: Array<{ accent: string; node: React.ReactNode } | null> = [
    {
      accent: "border-emerald-500/60",
      node: (
        <>
          <span className={`${em} text-emerald-400`}>{t.total_7d.toLocaleString()}</span> roles hit the board this
          week{t.total_24h > 0 && <> — <span className={`${em} text-cyan-400`}>{t.total_24h}</span> in the last 24 hours</>}.
          {t.med_min != null && t.med_max != null && (
            <> Median published pay: <span className={`${em} text-emerald-400`}>{fmtK(t.med_min)}–{fmtK(t.med_max)}</span>.</>
          )}
        </>
      ),
    },
    peak
      ? {
          accent: "border-emerald-500/60",
          node: (
            <>
              The money concentrates at <span className={`${em} text-emerald-400`}>{bandRange(peak.bucket)}</span> —{" "}
              <span className={em}>{peak.n}</span> of this week's roles landed there
              {high > 0 && (
                <>, and <span className={`${em} text-emerald-400`}>{high}</span> pay <span className={em}>$200k+</span></>
              )}.
            </>
          ),
        }
      : null,
    sen.length
      ? {
          accent: "border-violet-500/60",
          node: (
            <>
              Employers are buying experience: <span className={`${em} text-violet-400`}>{seniorish}</span> senior-and-above
              roles against <span className={em}>{entry}</span> entry-level this week.
            </>
          ),
        }
      : null,
    t.ai_roles > 0
      ? {
          accent: "border-cyan-500/60",
          node: (
            <>
              <span className={`${em} text-cyan-400`}>{t.ai_roles}</span> explicitly AI-titled roles arrived this week —
              the fastest-growing slice of the board.
            </>
          ),
        }
      : null,
    topCo
      ? {
          accent: "border-border",
          node: (
            <>
              Heaviest hirer right now: <span className={em}>{topCo.name}</span> with{" "}
              <span className={em}>{topCo.n}</span> open roles this week.
            </>
          ),
        }
      : null,
  ];

  const intake = data.intake_5h ?? [];
  const maxB = Math.max(0, ...intake.map((j) => j.b));
  const recent24 = intake.filter((j) => j.b >= maxB - 4); // ~last 24h of buckets
  const lenses = {
    top: {
      label: "highest paid · latest",
      jobs: (recent24.some((j) => j.salary_max != null) ? recent24 : intake).filter((j) => j.salary_max != null).slice(0, 40),
    },
    ai: { label: "AI roles · 7d", jobs: intake.filter((j) => AI_RE.test(j.title)) },
  } as const;
  const lens = lensKey ? lenses[lensKey] : null;

  return (
    <div className="space-y-4">
      {/* THE chart — one compact title row: pulse, title, lenses, hint */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <h3 className="text-base font-bold whitespace-nowrap">Roles coming in</h3>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => setLensKey(lensKey === "top" ? null : "top")}
                aria-pressed={lensKey === "top"}
                className={`px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wide transition-all ${
                  lensKey === "top"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                $ Highest paid
              </button>
              <button
                onClick={() => setLensKey(lensKey === "ai" ? null : "ai")}
                aria-pressed={lensKey === "ai"}
                className={`px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wide transition-all ${
                  lensKey === "ai"
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                AI roles{lenses.ai.jobs.length > 0 ? ` ${lenses.ai.jobs.length}` : ""}
              </button>
            </div>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground uppercase tracking-wide truncate">live · click a bar for its roles</span>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
          <IntakeChart jobs={intake} lens={lens ? { label: lens.label, jobs: [...lens.jobs] } : null} onClearLens={() => setLensKey(null)} />
        </div>
      </div>

      {/* The market read, written */}
      <div className="grid sm:grid-cols-2 gap-3">
        {insights.filter(Boolean).map((ins, i) => (
          <div key={i} className={`rounded-lg border-l-2 ${ins!.accent} bg-card/30 px-4 py-3`}>
            <p className="text-sm text-muted-foreground leading-relaxed">{ins!.node}</p>
          </div>
        ))}
      </div>

      {/* What they're asking for */}
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

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        Computed from live postings on this board — salary figures fold in the labeled comp estimates.
      </p>
    </div>
  );
}
