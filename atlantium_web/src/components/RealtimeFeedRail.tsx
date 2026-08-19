import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { IntakeJob } from "@/components/IntakeChart";

const API_BUCKET_HOURS = 5;
const WINDOW_HOURS = 7 * 24;

function bucketTime(b: number): Date {
  return new Date(Date.now() - WINDOW_HOURS * 3600_000 + b * API_BUCKET_HOURS * 3600_000);
}

function batchLabel(b: number): string {
  const d = bucketTime(b);
  const hoursAgo = Math.max(0, Math.round((Date.now() - d.getTime()) / 3600_000));
  if (hoursAgo < 1) return "just now";
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase().replace(" ", "");
}

function fmtPay(min: number | null, max: number | null): string | null {
  if (max == null) return null;
  return `${min != null ? `$${Math.round(min / 1000)}k` : ""}–$${Math.round(max / 1000)}k`;
}

/**
 * The left rail in realtime mode: a live feed of roles as they land on the
 * board, newest batch first, grouped by intake batch.
 */
export function RealtimeFeedRail({ jobs }: { jobs: IntakeJob[] }) {
  const groups = useMemo(() => {
    const byBucket = new Map<number, IntakeJob[]>();
    for (const j of jobs) {
      const arr = byBucket.get(j.b) ?? [];
      arr.push(j);
      byBucket.set(j.b, arr);
    }
    return [...byBucket.entries()].sort((a, b) => b[0] - a[0]);
  }, [jobs]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {groups.map(([b, batchJobs]) => (
        <div key={b}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-background/95 backdrop-blur border-b border-border/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              {batchLabel(b)} · {batchJobs.length} role{batchJobs.length === 1 ? "" : "s"}
            </span>
          </div>
          {batchJobs.map((j) => (
            <Link
              key={j.slug}
              to={`/jobs/${j.slug}`}
              className="block px-4 py-2 border-b border-border/20 hover:bg-cyan-500/5 group"
            >
              <p className="text-xs text-foreground leading-tight truncate group-hover:text-cyan-300">{j.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground truncate">{j.company}</span>
                {fmtPay(j.salary_min, j.salary_max) && (
                  <span className="ml-auto shrink-0 text-[10px] font-mono text-emerald-400">
                    {fmtPay(j.salary_min, j.salary_max)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ))}
      {groups.length === 0 && (
        <p className="p-4 text-xs text-muted-foreground">Waiting on the next batch…</p>
      )}
    </div>
  );
}
