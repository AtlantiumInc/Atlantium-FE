import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight, ArrowDown, ArrowUp } from "lucide-react";

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

function sortJobs(jobs: IntakeJob[], dir: "high" | "low"): IntakeJob[] {
  // Unpriced roles sink to the bottom in either direction.
  return [...jobs].sort((a, b) => {
    if (a.salary_max == null && b.salary_max == null) return 0;
    if (a.salary_max == null) return 1;
    if (b.salary_max == null) return -1;
    return dir === "high" ? b.salary_max - a.salary_max : a.salary_max - b.salary_max;
  });
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

function CompSortSwitch({ dir, onChange }: { dir: "high" | "low"; onChange: (d: "high" | "low") => void }) {
  return (
    <div className="flex rounded-md border border-border/50 bg-card/40 p-0.5">
      {(["high", "low"] as const).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          aria-pressed={dir === d}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wide transition-all ${
            dir === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {d === "high" ? <ArrowDown className="h-2.5 w-2.5" /> : <ArrowUp className="h-2.5 w-2.5" />}
          {d === "high" ? "Highest" : "Lowest"}
        </button>
      ))}
    </div>
  );
}

/**
 * Intake chart: roles arriving in 5-hour buckets over the last 7 days.
 * Desktop: a docked panel to the RIGHT of the chart shows the selected
 * batch's roles — defaulting to the latest batch — with a highest/lowest
 * comp sort. Mobile (coarse pointer): tapping a bar opens the same list
 * as a bottom sheet.
 */
export function IntakeChart({ jobs = [] }: { jobs?: IntakeJob[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [sheetBucket, setSheetBucket] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"high" | "low">("high");

  const buckets = useMemo(() => {
    const out: IntakeJob[][] = Array.from({ length: BUCKETS }, () => []);
    for (const j of jobs) {
      const b = Math.min(BUCKETS - 1, Math.max(0, j.b));
      out[b].push(j);
    }
    return out;
  }, [jobs]);

  // Default the panel to the LATEST batch that actually has roles.
  useEffect(() => {
    if (selected != null) return;
    for (let i = BUCKETS - 1; i >= 0; i--) {
      if (buckets[i].length > 0) { setSelected(i); return; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets]);

  const max = Math.max(1, ...buckets.map((b) => b.length));
  const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const openBucket = (i: number) => {
    if (buckets[i].length === 0) return;
    if (isCoarse) setSheetBucket(i);
    else setSelected(i);
  };

  const panelJobs = selected != null ? sortJobs(buckets[selected], sortDir) : [];

  return (
    <div className="flex gap-4">
      {/* Chart */}
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[3px] h-40">
          {buckets.map((bucketJobs, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[9px] font-mono text-muted-foreground leading-none">
                {bucketJobs.length > 0 ? bucketJobs.length : ""}
              </span>
              <button
                aria-label={`${bucketJobs.length} roles, ${bucketLabel(i)}`}
                aria-pressed={selected === i}
                onClick={() => openBucket(i)}
                className={`w-full rounded-t transition-colors ${
                  bucketJobs.length === 0
                    ? "bg-muted/20"
                    : selected === i
                      ? "bg-cyan-300"
                      : "bg-cyan-500/70 hover:bg-cyan-400"
                }`}
                style={{ height: `${Math.max(2, (bucketJobs.length / max) * 128)}px` }}
              />
              <span className="text-[8px] font-mono text-muted-foreground leading-none w-full text-center whitespace-nowrap overflow-visible">
                {i % 7 === 0 ? bucketLabel(i) : " "}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Docked batch panel — desktop only; mobile uses the bottom sheet */}
      {!isCoarse && (
        <div className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col rounded-lg border border-border/40 bg-background/40">
          {selected != null && buckets[selected].length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 border-b border-border/40">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {buckets[selected].length} role{buckets[selected].length === 1 ? "" : "s"} in this batch
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">from {bucketLabel(selected)}</p>
                </div>
                <CompSortSwitch dir={sortDir} onChange={setSortDir} />
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 max-h-56">
                <RoleList jobs={panelJobs} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-muted-foreground">
              Click a bar to see the roles in that batch.
            </div>
          )}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {sheetBucket != null && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setSheetBucket(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border-t border-border/60 bg-background flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-border/40">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {buckets[sheetBucket].length} role{buckets[sheetBucket].length === 1 ? "" : "s"} came in
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">from {bucketLabel(sheetBucket)} · 5h window</p>
              </div>
              <div className="flex items-center gap-2">
                <CompSortSwitch dir={sortDir} onChange={setSortDir} />
                <button
                  aria-label="Close"
                  onClick={() => setSheetBucket(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain p-2 pb-6">
              <RoleList jobs={sortJobs(buckets[sheetBucket], sortDir)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
