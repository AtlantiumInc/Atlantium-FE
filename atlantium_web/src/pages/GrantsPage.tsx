import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Landmark, Loader2, Search, Clock, ExternalLink, Building2, Sparkles, ArrowRight, CalendarClock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { api, type DirectoryEntry } from "@/lib/api";

function primaryLocation(location?: string | null) {
  if (!location) return null;
  const parts = location.split(/\s+or\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return location;
  return `${parts[0]} +${parts.length - 1} more`;
}

function money(min?: number | null, max?: number | null) {
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return null;
}

/** Deadline pill: urgency is the product here, so it leads the card. */
function DeadlinePill({ days, recurring }: { days?: number | null; recurring?: boolean }) {
  if (days === null || days === undefined) {
    return (
      <Badge variant="outline" className="text-[10px] bg-muted/40 border-border/50 text-muted-foreground">
        {recurring ? "Rolling / recurring" : "No deadline listed"}
      </Badge>
    );
  }
  const urgent = days <= 14;
  const soon = days <= 45;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold ${
        urgent
          ? "bg-red-500/10 border-red-500/40 text-red-300"
          : soon
            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      }`}
    >
      <CalendarClock className="h-3 w-3 mr-1" />
      {days <= 0 ? "Closes today" : days === 1 ? "1 day left" : `${days} days left`}
    </Badge>
  );
}

function EntryCard({ entry }: { entry: DirectoryEntry }) {
  const amount = money(entry.grant?.amount_min, entry.grant?.amount_max);
  const isGrant = entry.kind === "grant";
  return (
    <Link
      to={`/directory/${entry.kind}/${entry.slug}`}
      className="group flex flex-col rounded-xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug group-hover:text-cyan-300 transition-colors">
            {entry.name}
          </h3>
          {entry.grant?.funder || entry.resource?.category ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {entry.grant?.funder ?? entry.resource?.category.replace(/_/g, " ")}
            </p>
          ) : null}
        </div>
        {isGrant ? (
          <DeadlinePill days={entry.grant?.days_until_close} recurring={entry.grant?.recurring} />
        ) : entry.resource?.category ? (
          <Badge variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-300 capitalize flex-shrink-0">
            {entry.resource.category.replace(/_/g, " ")}
          </Badge>
        ) : entry.kind === "company" ? (
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex-shrink-0">
            Hiring
          </Badge>
        ) : entry.kind === "investor" ? (
          <Badge variant="outline" className="text-[10px] bg-cyan-500/10 border-cyan-500/30 text-cyan-300 flex-shrink-0">
            Investor
          </Badge>
        ) : null}
      </div>

      {entry.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{entry.summary}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
        {amount && <span className="text-cyan-400 font-medium">{amount}</span>}
        {entry.location && <span className="truncate max-w-[60%]">{primaryLocation(entry.location)}</span>}
        {entry.verified_at && (
          <span className="ml-auto inline-flex items-center gap-1 text-emerald-400/80">
            <Clock className="h-3 w-3" /> verified
          </span>
        )}
      </div>
    </Link>
  );
}

export function GrantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKind = searchParams.get("kind") ?? "grant";

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoading(true);
    api.getDirectory({ kind: activeKind === "all" ? undefined : activeKind, limit: 100 })
      .then((r) => { setEntries(r.entries); setCounts(r.counts); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeKind]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (e) => e.name.toLowerCase().includes(needle) || (e.summary ?? "").toLowerCase().includes(needle),
    );
  }, [entries, search]);

  const closingSoon = useMemo(
    () => entries.filter((e) => typeof e.grant?.days_until_close === "number" && e.grant.days_until_close! <= 45).length,
    [entries],
  );

  const setKind = (kind: string) => {
    const next = new URLSearchParams(searchParams);
    if (kind === "grant") next.delete("kind");
    else next.set("kind", kind);
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-clip">
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.7} blend={0.5} speed={0.3} />
      </div>
      <PublicNavbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-2">
            <Landmark className="h-3.5 w-3.5" /> Grants & Programs
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Atlanta money for builders.</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Every grant, tax credit, accelerator, and city program we can verify for Atlanta and Georgia
            technology companies — deadline-sorted, checked continuously, and free to browse.
          </p>
        </div>

        {/* Stats + kind switch */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {[
            { key: "grant", label: "Grants", count: counts.grant ?? 0 },
            { key: "resource", label: "Programs & credits", count: counts.resource ?? 0 },
            { key: "investor", label: "Investors", count: counts.investor ?? 0 },
            { key: "company", label: "Companies hiring", count: counts.company ?? 0 },
          ].filter((k) => k.count > 0).map((k) => (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                activeKind === k.key
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {k.label} <span className="opacity-60 ml-1 tabular-nums">{k.count}</span>
            </button>
          ))}
          {closingSoon > 0 && activeKind === "grant" && (
            <span className="text-xs text-amber-300 inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {closingSoon} closing within 45 days
            </span>
          )}
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programs..."
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {activeKind === "company" && (
          <p className="text-xs text-muted-foreground mb-4">
            Companies with live roles on our verified job board — the hiring signal is the data.
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? `Nothing matches "${search}".` : "Nothing listed yet."}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((e) => <EntryCard key={e.id} entry={e} />)}
          </motion.div>
        )}

        {/* Funnel: the weekly report carries new grants */}
        <div className="mt-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">New grants land in the Weekly Report</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Free members get every new Atlanta grant and program, deadline-sorted, each Monday.
            </p>
          </div>
          <Link to="/signup">
            <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100">
              Join free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-6 inline-flex items-center gap-1.5">
          <ExternalLink className="h-3 w-3" />
          Every listing links to its official source. Always confirm details on the funder's page before applying.
        </p>
      </main>
    </div>
  );
}
