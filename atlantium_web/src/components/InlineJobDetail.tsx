import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Loader2, MapPin, Clock, Building2, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type JobPosting } from "@/lib/api";

function fmtSalary(min?: number | null, max?: number | null): string | null {
  if (max == null) return null;
  const f = (n: number) => `$${Math.round(n / 1000)}k`;
  return min != null ? `${f(min)} – ${f(max)}` : f(max);
}

/**
 * A feed listing opened inside the realtime content area — compact detail
 * with an X that returns the visitor to the dashboard.
 */
export function InlineJobDetail({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setJob(null);
    setError(false);
    api.getJobPosting(slug).then(setJob).catch(() => setError(true));
  }, [slug]);

  const content = (job?.content ?? {}) as Record<string, any>;
  const est = content.salary_est as { min: number; max: number; n: number } | undefined;
  const tech: string[] = Array.isArray(content.tech_stack) ? content.tech_stack : [];
  const salary = job ? fmtSalary(job.salary_min, job.salary_max) : null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border/40">
        <div className="min-w-0">
          {job ? (
            <>
              <h2 className="text-lg sm:text-xl font-bold leading-tight">{job.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{job.company}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                  {new Date(job.created_at ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </>
          ) : (
            <div className="h-10 flex items-center text-muted-foreground text-sm">
              {error ? "Couldn't load this role." : <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading role…</>}
            </div>
          )}
        </div>
        <button
          aria-label="Back to dashboard"
          onClick={onClose}
          className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {job && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {job.workplace_type && <Badge variant="outline" className="text-[10px]">{job.workplace_type}</Badge>}
            {job.seniority && <Badge variant="outline" className="text-[10px]">{job.seniority}</Badge>}
            {content.yoe != null && <Badge variant="outline" className="text-[10px]">{content.yoe}+ yrs</Badge>}
            {salary ? (
              <span className="ml-auto text-sm font-semibold text-emerald-400">{salary}</span>
            ) : est ? (
              <span
                className="ml-auto text-sm font-medium text-muted-foreground cursor-help"
                title={`Estimated from ${est.n} comparable Atlanta postings on this board — not employer-published.`}
              >
                ~{fmtSalary(est.min, est.max)}
                <span className="ml-1 font-mono text-[10px] uppercase tracking-wide opacity-70">est.</span>
              </span>
            ) : null}
          </div>

          {content.requirements_summary && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">Requirements</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{content.requirements_summary}</p>
            </div>
          )}

          {tech.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">Tech stack</p>
              <div className="flex flex-wrap gap-1.5">
                {tech.map((t) => (
                  <span key={t} className="rounded-full border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-1 text-[11px] text-cyan-300">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a href={job.apply_url ?? undefined} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5">
                Apply now
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
            <Link to={`/jobs/${slug}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                Full page
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
