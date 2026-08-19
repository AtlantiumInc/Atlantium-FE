import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Pin, X } from "lucide-react";
import type { IntakeJob } from "@/components/IntakeChart";

/* Empirical salary distribution of the last 7 days' roles, smoothed into a
   curve. Bins of $10k from $40k to $300k; midpoint of a published range
   places the role. */
const BIN = 10_000;
const MIN_S = 40_000;
const MAX_S = 300_000;
const NBINS = (MAX_S - MIN_S) / BIN + 1; // last bin = 300k+

const W = 720;
const H = 240;
const PAD_L = 44;
const PAD_B = 28;
const PAD_T = 14;
const PAD_R = 12;

function salaryMid(j: IntakeJob): number | null {
  if (j.salary_max == null) return null;
  return j.salary_min != null ? (j.salary_min + j.salary_max) / 2 : j.salary_max;
}

function binIndex(mid: number): number {
  if (mid < MIN_S) return 0;
  if (mid >= MAX_S) return NBINS - 1;
  return Math.floor((mid - MIN_S) / BIN);
}

function binLabel(i: number): string {
  if (i >= NBINS - 1) return "$300k+";
  const lo = (MIN_S + i * BIN) / 1000;
  return `$${lo}k–$${lo + 10}k`;
}

function fmtPay(min: number | null, max: number | null): string | null {
  if (max == null) return null;
  return `${min != null ? `$${Math.round(min / 1000)}k` : ""}–$${Math.round(max / 1000)}k`;
}

/** Catmull-Rom → cubic bezier path through the bin points. */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function SalaryCurveChart({ jobs = [] }: { jobs?: IntakeJob[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { bins, priced, unpriced, medianBin } = useMemo(() => {
    const bins: IntakeJob[][] = Array.from({ length: NBINS }, () => []);
    const mids: number[] = [];
    let unpriced = 0;
    for (const j of jobs) {
      const m = salaryMid(j);
      if (m == null) { unpriced++; continue; }
      bins[binIndex(m)].push(j);
      mids.push(m);
    }
    mids.sort((a, b) => a - b);
    const med = mids.length ? mids[Math.floor(mids.length / 2)] : null;
    return { bins, priced: mids.length, unpriced, medianBin: med != null ? binIndex(med) : null };
  }, [jobs]);

  const maxN = Math.max(1, ...bins.map((b) => b.length));
  const x = (i: number) => PAD_L + (i / (NBINS - 1)) * (W - PAD_L - PAD_R);
  const y = (n: number) => H - PAD_B - (n / maxN) * (H - PAD_B - PAD_T);
  const pts: Array<[number, number]> = bins.map((b, i) => [x(i), y(b.length)]);
  const curve = smoothPath(pts);
  const area = curve ? `${curve} L ${x(NBINS - 1)},${H - PAD_B} L ${x(0)},${H - PAD_B} Z` : "";

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * (NBINS - 1));
    setHover(Math.min(NBINS - 1, Math.max(0, i)));
  };

  // hover previews; a click pins the band so it stays mounted after the
  // cursor leaves; falls back to the median band.
  const active = hover ?? pinned ?? medianBin;
  const activeJobs = active != null ? [...bins[active]].sort((a, b) => (b.salary_max ?? 0) - (a.salary_max ?? 0)) : [];

  // X ticks every $50k
  const ticks = [50, 100, 150, 200, 250, 300].map((k) => k * 1000);

  return (
    <div className="flex flex-col md:flex-row items-stretch">
      {/* The curve */}
      <div className="flex-1 min-w-0 p-4 sm:p-5">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={() => hover != null && setPinned(pinned === hover ? null : hover)}
          style={{ cursor: "crosshair" }}
        >
          {/* Y axis */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="currentColor" className="text-border" strokeWidth="1" />
          {[maxN, Math.round(maxN / 2)].map((n) => (
            <g key={n}>
              <text x={PAD_L - 8} y={y(n) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9" fontFamily="monospace">{n}</text>
              <line x1={PAD_L} y1={y(n)} x2={W - PAD_R} y2={y(n)} stroke="currentColor" className="text-border/40" strokeWidth="0.5" strokeDasharray="3 4" />
            </g>
          ))}
          {/* X axis */}
          <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="currentColor" className="text-border" strokeWidth="1" />
          {ticks.map((t) => {
            const i = (t - MIN_S) / BIN;
            return (
              <g key={t}>
                <line x1={x(i)} y1={H - PAD_B} x2={x(i)} y2={H - PAD_B + 4} stroke="currentColor" className="text-border" strokeWidth="1" />
                <text x={x(i)} y={H - PAD_B + 16} textAnchor="middle" className="fill-muted-foreground" fontSize="9" fontFamily="monospace">
                  ${t / 1000}k{t === MAX_S ? "+" : ""}
                </text>
              </g>
            );
          })}
          {/* Area + curve */}
          <defs>
            <linearGradient id="salaryFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#salaryFill)" />}
          {curve && <path d={curve} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" strokeLinecap="round" />}
          {/* Median marker */}
          {medianBin != null && (
            <line x1={x(medianBin)} y1={PAD_T} x2={x(medianBin)} y2={H - PAD_B} stroke="rgb(148 163 184)" strokeWidth="1" strokeDasharray="2 4" />
          )}
          {/* Pinned guide */}
          {pinned != null && pinned !== active && (
            <line x1={x(pinned)} y1={PAD_T} x2={x(pinned)} y2={H - PAD_B} stroke="rgb(34 211 238)" strokeWidth="1" opacity="0.5" strokeDasharray="4 3" />
          )}
          {/* Hover guide + dot */}
          {active != null && (
            <g>
              <line x1={x(active)} y1={PAD_T} x2={x(active)} y2={H - PAD_B} stroke="rgb(52 211 153)" strokeWidth="1" opacity="0.5" />
              <circle cx={x(active)} cy={y(bins[active].length)} r="4" fill="rgb(110 231 183)" stroke="rgb(6 78 59)" strokeWidth="1.5" />
            </g>
          )}
        </svg>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
          x = salary · y = roles · {priced} priced roles this week{unpriced > 0 ? ` · ${unpriced} unpriced not shown` : ""}
        </p>
      </div>

      {/* Hover card — one card, follows the cursor's salary band */}
      <div className="md:w-72 lg:w-80 shrink-0 md:border-l border-t md:border-t-0 border-border/40 bg-background/40 p-3 flex flex-col">
        {active != null ? (
          <>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
              <span className="flex items-center gap-1.5 text-sm font-bold">
                {pinned === active && hover == null && <Pin className="h-3 w-3 text-cyan-400" />}
                {binLabel(active)}
              </span>
              <span className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
                {bins[active].length} role{bins[active].length === 1 ? "" : "s"} · {Math.round((bins[active].length / Math.max(1, priced)) * 100)}%
                {pinned != null && (
                  <button
                    aria-label="Unpin band"
                    onClick={() => setPinned(null)}
                    className="h-5 w-5 flex items-center justify-center rounded border border-border/50 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            </div>
            <div className="overflow-y-auto max-h-44 pt-1.5 space-y-1">
              {activeJobs.slice(0, 5).map((j) => (
                <Link
                  key={j.slug}
                  to={`/jobs/${j.slug}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-emerald-500/10 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate group-hover:text-emerald-300">{j.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{j.company}{j.seniority ? ` · ${j.seniority}` : ""}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-emerald-400">{fmtPay(j.salary_min, j.salary_max)}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
              {activeJobs.length === 0 && (
                <p className="pt-3 text-xs text-muted-foreground text-center">No roles landed in this band this week.</p>
              )}
              {activeJobs.length > 5 && (
                <p className="pt-1 text-[10px] font-mono text-muted-foreground text-center">+{activeJobs.length - 5} more in this band</p>
              )}
            </div>
          </>
        ) : (
          <p className="m-auto text-xs text-muted-foreground text-center px-4">Hover the curve to inspect a band — click to pin it.</p>
        )}
      </div>
    </div>
  );
}
