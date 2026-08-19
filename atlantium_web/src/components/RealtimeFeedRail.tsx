import { useEffect, useMemo, useRef, useState } from "react";
import { MoonStar } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { IntakeJob } from "@/components/IntakeChart";

function fmtPay(min: number | null, max: number | null): string | null {
  if (max == null) return null;
  return `${min != null ? `$${Math.round(min / 1000)}k` : ""}–$${Math.round(max / 1000)}k`;
}

type Group = { key: string; label: string; live?: boolean; jobs: IntakeJob[] };

function groupByRecency(jobs: IntakeJob[]): Group[] {
  const now = Date.now();
  const groups: Group[] = [
    { key: "now", label: "Just now", live: true, jobs: [] },
    { key: "hour", label: "Past hour", jobs: [] },
    { key: "today", label: "Earlier today", jobs: [] },
    { key: "yesterday", label: "Yesterday", jobs: [] },
    { key: "week", label: "This week", jobs: [] },
  ];
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfYesterday = startOfDay.getTime() - 24 * 3600_000;
  for (const j of jobs) {
    const t = j.ts ? Date.parse(j.ts) : 0;
    const age = now - t;
    if (age <= 15 * 60_000) groups[0].jobs.push(j);
    else if (age <= 3600_000) groups[1].jobs.push(j);
    else if (t >= startOfDay.getTime()) groups[2].jobs.push(j);
    else if (t >= startOfYesterday) groups[3].jobs.push(j);
    else groups[4].jobs.push(j);
  }
  for (const g of groups) g.jobs.sort((a, b) => Date.parse(b.ts ?? "") - Date.parse(a.ts ?? ""));
  return groups.filter((g) => g.jobs.length > 0);
}

function afterHoursNote(): string | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "numeric", hour12: false,
  }).formatToParts(new Date());
  const dow = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  if (dow === "Sat" || dow === "Sun") return "Weekend — hiring slows down. New roles resume Monday 8am ET.";
  if (hour >= 20 || hour < 8) return "After hours — new roles resume 8am ET.";
  return null;
}

/**
 * The left rail in realtime mode: a continuous feed of roles as they release
 * onto the board, newest first, grouped by recency. Outside business hours a
 * notice explains the quiet instead of a stalled ticker pretending otherwise.
 */
export function RealtimeFeedRail({ jobs, onSelect }: { jobs: IntakeJob[]; onSelect: (slug: string) => void }) {
  const groups = useMemo(() => groupByRecency(jobs), [jobs]);
  const note = afterHoursNote();

  // Flash roles that arrived since the last poll, so a refresh reads as
  // movement rather than a silently different list. The first load is not a
  // arrival event — everything would flash at once — so it only seeds the set.
  const seen = useRef<Set<string> | null>(null);
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  useEffect(() => {
    const slugs = jobs.map((j) => j.slug);
    if (seen.current === null) {
      seen.current = new Set(slugs);
      return;
    }
    const fresh = slugs.filter((sl) => !seen.current!.has(sl));
    for (const sl of slugs) seen.current.add(sl);
    if (fresh.length === 0) return;
    setArrived(new Set(fresh));
    const t = setTimeout(() => setArrived(new Set()), 2600);
    return () => clearTimeout(t);
  }, [jobs]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {note && (
        <div className="flex items-start gap-2 mx-3 mt-3 mb-1 px-3 py-2.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10">
          <MoonStar className="h-3.5 w-3.5 text-indigo-300 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug text-indigo-200/90">{note}</p>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.key}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-background/95 backdrop-blur border-b border-border/30">
            {g.live ? (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            )}
            <span className={`text-[10px] font-mono uppercase tracking-wide ${g.live ? "text-emerald-400" : "text-muted-foreground"}`}>
              {g.label} · {g.jobs.length}
            </span>
          </div>
          {g.jobs.map((j) => (
            <button
              key={j.slug}
              onClick={() => onSelect(j.slug)}
              className={`block w-full text-left px-4 py-2 border-b border-border/20 hover:bg-cyan-500/5 group ${
                arrived.has(j.slug) ? "animate-role-arrive" : ""
              }`}
            >
              <p className="text-xs text-foreground leading-tight truncate group-hover:text-cyan-300">{j.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CompanyLogo name={j.company} logo={j.logo} size={12} />
                <span className="text-[10px] text-muted-foreground truncate">{j.company}</span>
                {fmtPay(j.salary_min, j.salary_max) && (
                  <span className="ml-auto shrink-0 text-[10px] font-mono text-emerald-400">
                    {fmtPay(j.salary_min, j.salary_max)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ))}
      {groups.length === 0 && (
        <p className="p-4 text-xs text-muted-foreground">Waiting on the next roles…</p>
      )}
    </div>
  );
}
