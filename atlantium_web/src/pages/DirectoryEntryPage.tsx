import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ChevronLeft, Loader2, Landmark, ExternalLink, CalendarClock, Building2, CheckCircle2, ShieldCheck, Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { api, type DirectoryEntry } from "@/lib/api";
import { ContactCard } from "@/components/directory/ContactCard";
import { JobReportSignupModal, useJobReportSignup } from "@/components/JobReportSignupModal";

function money(min?: number | null, max?: number | null) {
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return null;
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

type LinkedJob = {
  slug: string;
  title: string;
  location?: string | null;
  workplace_type?: string | null;
  seniority?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
};

/** Circle logo with an initials fallback — most scraped orgs have no image. */
function EntityAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const initials = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="h-14 w-14 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border/60 bg-card/70 flex items-center justify-center">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground tracking-wide">{initials || "—"}</span>
      )}
    </div>
  );
}

export function DirectoryEntryPage() {
  const { kind, slug } = useParams<{ kind: string; slug: string }>();
  const signup = useJobReportSignup();
  const [jobs, setJobs] = useState<LinkedJob[]>([]);
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [provenance, setProvenance] = useState<Array<{ source: string; source_url?: string | null; last_seen_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!kind || !slug) return;
    api.getDirectoryEntry(kind, slug)
      .then((r) => {
        setEntry(r.entry);
        setProvenance(r.provenance);
        setJobs((r as { jobs?: LinkedJob[] }).jobs ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [kind, slug]);

  const grant = entry?.grant;
  const resource = entry?.resource;
  const amount = money(grant?.amount_min, grant?.amount_max);
  const days = grant?.days_until_close;
  const applyUrl = grant?.application_url ?? resource?.application_url ?? entry?.website;
  const eligibility = grant?.eligibility ?? resource?.eligibility ?? [];

  return (
    <div className="min-h-screen bg-background relative overflow-x-clip">
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.7} blend={0.5} speed={0.3} />
      </div>
      <PublicNavbar />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Link
          to={kind === "grant" || kind === "resource" ? "/grants" : `/directory?kind=${kind}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {kind === "grant" || kind === "resource" ? "Back to Grants" : "Back to Directory"}
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : notFound || !entry ? (
          <div className="text-center py-24 text-muted-foreground">
            <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Not Found</h2>
            <p className="text-sm">This program may have closed or moved.</p>
          </div>
        ) : (
          <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <header className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-2.5 text-[11px] font-semibold uppercase tracking-widest">
                <span className="inline-flex items-center gap-1.5 text-cyan-400">
                  <Landmark className="h-3 w-3" />
                  {entry.kind === "grant" ? "Grant" : "Program"}
                </span>
                {entry.status === "expired" && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30 text-red-300">Closed</Badge>
                )}
              </div>

              {kind === "investor" || kind === "company" || kind === "person" ? (
                <div className="flex items-start gap-4">
                  <EntityAvatar
                    name={entry.name}
                    logoUrl={(entry.attributes as { logo_url?: string } | undefined)?.logo_url}
                  />
                  <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight leading-[1.25] pt-1">{entry.name}</h1>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight leading-[1.25]">{entry.name}</h1>
              )}
              {entry.summary && (
                <p className="text-[0.95rem] leading-relaxed text-muted-foreground mt-2.5">{entry.summary}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                {grant?.funder && (
                  <span className="inline-flex items-center gap-1 text-foreground font-medium">
                    <Building2 className="h-3 w-3" />{grant.funder}
                  </span>
                )}
                {entry.location && <span>{entry.location}</span>}
                {amount && <span className="text-cyan-400 font-medium">{amount}</span>}
                {typeof days === "number" && (
                  <span className={`inline-flex items-center gap-1 font-medium ${days <= 14 ? "text-red-300" : days <= 45 ? "text-amber-300" : "text-emerald-400"}`}>
                    <CalendarClock className="h-3 w-3" />
                    {days <= 0 ? "Closes today" : `${days} days left`}
                  </span>
                )}
                {grant?.recurring && !grant.deadline_date && <span>Rolling deadline</span>}
              </div>
            </header>

            {/* Facts */}
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {grant?.deadline_date || grant?.deadline_at ? (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Deadline</p>
                  <p className="text-sm font-medium">{formatDate(grant.closes_at ?? grant.deadline_at) ?? grant.deadline_date}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Applications accepted through end of day, Eastern.</p>
                </div>
              ) : null}
              {amount && (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Award size</p>
                  <p className="text-sm font-medium">{amount}</p>
                </div>
              )}
              {resource?.category && (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Program type</p>
                  <p className="text-sm font-medium capitalize">{resource.category.replace(/_/g, " ")}</p>
                </div>
              )}
            </div>

            {entry.id && (kind === "investor" || kind === "company" || kind === "person") && (
              <ContactCard entryId={entry.id} kind={kind} slug={slug!} onJoin={() => signup.openWithEmail()} />
            )}

            {jobs.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Open roles ({jobs.length})
                </h2>
                <div className="space-y-2">
                  {jobs.map((j) => (
                    <Link
                      key={j.slug}
                      to={`/jobs/${j.slug}`}
                      className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-cyan-300 transition-colors">{j.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[j.seniority, j.workplace_type, (j.location ?? "").split(/\s+or\s+/i)[0]].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {money(j.salary_min, j.salary_max) && (
                        <span className="text-[11px] text-cyan-400 font-medium flex-shrink-0">
                          {money(j.salary_min, j.salary_max)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {eligibility.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Eligibility</h2>
                <ul className="space-y-1.5">
                  {eligibility.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {applyUrl && (
              <a href={applyUrl} target="_blank" rel="noreferrer noopener" className="block mb-6">
                <Button className="w-full gap-2 bg-white text-black hover:bg-gray-100">
                  Apply on the official site <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}

            {/* Provenance — every listing shows where it came from */}
            {provenance.length > 0 && (
              <section className="rounded-xl border border-border/40 bg-card/30 p-4">
                <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> Source
                </h2>
                {provenance.map((p) => (
                  <div key={p.source} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{p.source.replace(/_/g, " ")}</span>
                    {p.source_url && (
                      <a href={p.source_url} target="_blank" rel="noreferrer noopener" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                        <Globe className="h-3 w-3" /> official page
                      </a>
                    )}
                    <span className="opacity-60">
                      last checked {new Date(p.last_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  Always confirm amounts and deadlines on the funder's page before applying.
                </p>
              </section>
            )}
          </motion.article>
        )}
      </main>

      <JobReportSignupModal
        open={signup.open}
        onOpenChange={signup.setOpen}
        initialEmail={signup.initialEmail}
        initialStep={signup.initialStep}
      />
    </div>
  );
}
