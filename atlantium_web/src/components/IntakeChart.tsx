import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight } from "lucide-react";

export type IntakeJob = {
  b: number;
  slug: string;
  title: string;
  company: string;
  salary_min: number | null;
  salary_max: number | null;
  seniority: string | null;
};

const BUCKET_HOURS = 5;
const WINDOW_HOURS = 7 * 24;
const BUCKETS = Math.ceil(WINDOW_HOURS / BUCKET_HOURS); // 34

function bucketStart(b: number): Date {
  return new Date(Date.now() - WINDOW_HOURS * 3600_000 + b * BUCKET_HOURS * 3600_000);
}

function bucketLabel(b: number): string {
  const d = bucketStart(b);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase().replace(" ", "");
}

function fmtPay(min: number | null, max: number | null): string | null {
  if (max == null) return null;
  const lo = min != null ? `$${Math.round(min / 1000)}k` : "";
  return `${lo}–$${Math.round(max / 1000)}k`;
}

function RoleList({ jobs }: { jobs: IntakeJob[] }) {
  return (
    <div className="space-y-1">
      {jobs.map((j) => (
        <Link
          key={j.slug}
          to={`/jobs/${j.slug}`}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-cyan-500/10 group"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground truncate group-hover:text-cyan-300">{j.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {j.company}
              {j.seniority ? ` · ${j.seniority}` : ""}
            </p>
          </div>
          {fmtPay(j.salary_min, j.salary_max) && (
            <span className="shrink-0 text-[10px] font-mono text-emerald-400">{fmtPay(j.salary_min, j.salary_max)}</span>
          )}
          <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </Link>
      ))}
    </div>
  );
}

/**
 * Intake chart: roles arriving in 5-hour buckets over the last 7 days.
 * Desktop: hovering a bar opens a popover listing the actual roles in that
 * bucket. Mobile (coarse pointer): tapping a bar opens a scrollable bottom
 * sheet with the same list.
 */
export function IntakeChart({ jobs = [] }: { jobs?: IntakeJob[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [sheetBucket, setSheetBucket] = useState<number | null>(null);

  const buckets = useMemo(() => {
    const out: IntakeJob[][] = Array.from({ length: BUCKETS }, () => []);
    for (const j of jobs) {
      const b = Math.min(BUCKETS - 1, Math.max(0, j.b));
      out[b].push(j);
    }
    return out;
  }, [jobs]);

  const max = Math.max(1, ...buckets.map((b) => b.length));
  const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const openBucket = (i: number) => {
    if (buckets[i].length === 0) return;
    if (isCoarse) setSheetBucket(i);
    else setActive(active === i ? null : i);
  };

  return (
    <div className="relative" onMouseLeave={() => setActive(null)}>
      <div className="flex items-end gap-[3px] h-36">
        {buckets.map((bucketJobs, i) => (
          <div
            key={i}
            className="relative flex-1 flex flex-col items-center gap-1 min-w-0"
            onMouseEnter={() => !isCoarse && bucketJobs.length > 0 && setActive(i)}
          >
            <span className="text-[9px] font-mono text-muted-foreground leading-none">
              {bucketJobs.length > 0 ? bucketJobs.length : ""}
            </span>
            <button
              aria-label={`${bucketJobs.length} roles, ${bucketLabel(i)}`}
              onClick={() => openBucket(i)}
              className={`w-full rounded-t transition-colors ${
                bucketJobs.length === 0
                  ? "bg-muted/20"
                  : active === i
                    ? "bg-cyan-300"
                    : "bg-cyan-500/70 hover:bg-cyan-400"
              }`}
              style={{ height: `${Math.max(2, (bucketJobs.length / max) * 110)}px` }}
            />
            <span className="text-[8px] font-mono text-muted-foreground leading-none w-full text-center whitespace-nowrap overflow-visible">
              {i % 7 === 0 ? bucketLabel(i) : "\u00a0"}
            </span>

            {/* Desktop popover */}
            {!isCoarse && active === i && (
              <div
                className={`absolute bottom-full mb-2 z-30 w-72 rounded-xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-2xl p-2 ${
                  i < 6 ? "left-0" : i > BUCKETS - 7 ? "right-0" : "left-1/2 -translate-x-1/2"
                }`}
              >
                <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground border-b border-border/40 mb-1">
                  {bucketJobs.length} role{bucketJobs.length === 1 ? "" : "s"} · from {bucketLabel(i)}
                </p>
                <div className="max-h-56 overflow-y-auto">
                  <RoleList jobs={bucketJobs} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile bottom sheet */}
      {sheetBucket != null && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setSheetBucket(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border-t border-border/60 bg-background flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
              <div>
                <p className="text-sm font-bold">
                  {buckets[sheetBucket].length} role{buckets[sheetBucket].length === 1 ? "" : "s"} came in
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">from {bucketLabel(sheetBucket)} · 5h window</p>
              </div>
              <button
                aria-label="Close"
                onClick={() => setSheetBucket(null)}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain p-2 pb-6">
              <RoleList jobs={buckets[sheetBucket]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
