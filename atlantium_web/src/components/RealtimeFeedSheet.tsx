import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { RealtimeFeedRail } from "@/components/RealtimeFeedRail";
import type { IntakeJob } from "@/components/IntakeChart";

/** Live only while the newest role is genuinely recent — a pulsing dot over a
 *  three-hour-old listing is the same lie as a frozen "Just now" badge. */
const LIVE_WINDOW_MS = 30 * 60_000;

function ago(ts?: string): string {
  if (!ts) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(ts)) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function fmtPay(min: number | null, max: number | null): string | null {
  if (max == null) return null;
  return `${min != null ? `$${Math.round(min / 1000)}k` : ""}–$${Math.round(max / 1000)}k`;
}

/**
 * Mobile realtime surface. Collapsed it is a one-line peek at the newest role
 * — the whole product as an ambient signal — and expanding it hands over to
 * the same grouped feed the desktop rail renders.
 */
export function RealtimeFeedSheet({
  jobs,
  onSelect,
}: {
  jobs: IntakeJob[];
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const newest = useMemo(() => {
    let best: IntakeJob | null = null;
    for (const j of jobs) {
      if (!best || Date.parse(j.ts ?? "") > Date.parse(best.ts ?? "")) best = j;
    }
    return best;
  }, [jobs]);

  const isLive = newest?.ts ? Date.now() - Date.parse(newest.ts) <= LIVE_WINDOW_MS : false;

  // Count arrivals since the sheet was last opened, so the peek can say how
  // much is waiting behind it. Seeded on first load — nothing is "new" yet.
  const seen = useRef<Set<string> | null>(null);
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    const slugs = jobs.map((j) => j.slug);
    // Seed on the first payload that actually has roles — seeding on the empty
    // mount render would make the whole first load count as new arrivals.
    if (seen.current === null) {
      if (slugs.length === 0) return;
      seen.current = new Set(slugs);
      return;
    }
    const fresh = slugs.filter((s) => !seen.current!.has(s));
    if (fresh.length) setUnseen((n) => n + fresh.length);
    for (const s of slugs) seen.current.add(s);
  }, [jobs]);

  useEffect(() => {
    if (open) setUnseen(0);
  }, [open]);

  // Expanded sheet owns the scroll; the page behind it must not move.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!newest) return null;

  return (
    <div className="lg:hidden">
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border/60 bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-[height] duration-300 ease-out ${
          open ? "h-[78vh]" : "h-[76px]"
        }`}
      >
        {/* Peek — tap anywhere to expand */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse realtime feed" : "Expand realtime feed"}
          className="flex items-center gap-2.5 px-4 py-3 text-left shrink-0"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {isLive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase tracking-wide ${isLive ? "text-emerald-400" : "text-muted-foreground"}`}>
                {open ? "Realtime feed" : isLive ? "Just landed" : `Last added ${ago(newest.ts)}`}
              </span>
              {!open && unseen > 0 && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                  +{unseen}
                </span>
              )}
            </div>
            {!open && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CompanyLogo name={newest.company} logo={newest.logo} size={12} />
                <span className="text-xs text-foreground truncate">{newest.title}</span>
                {fmtPay(newest.salary_min, newest.salary_max) && (
                  <span className="ml-auto shrink-0 text-[10px] font-mono text-emerald-400">
                    {fmtPay(newest.salary_min, newest.salary_max)}
                  </span>
                )}
              </div>
            )}
          </div>

          <span className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-border/50 text-muted-foreground">
            {open ? <X className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </button>

        {open && (
          <div className="flex-1 min-h-0 border-t border-border/40 flex flex-col">
            <RealtimeFeedRail
              jobs={jobs}
              onSelect={(slug) => { setOpen(false); onSelect(slug); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
