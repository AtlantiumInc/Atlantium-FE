import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Lock, MapPin, Briefcase, Search, Building2, Clock, ChevronDown, ChevronUp, Cpu, GraduationCap, Bell, ArrowRight, CheckCircle2, Loader2, Star, Sparkles, Share2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import { TrainingPromoCard } from "@/components/training/TrainingPromoCard";
import SpotlightCard from "@/components/ui/SpotlightCard";
import Aurora from "@/components/Aurora";
import { api, type JobPosting } from "@/lib/api";
import { isNewThisWeek } from "@/lib/utils";
import { shareJob } from "@/lib/share";
import { JobReportSignupModal, useJobReportSignup } from "@/components/JobReportSignupModal";
import { RealtimeMarketPanel } from "@/components/RealtimeMarketPanel";
import { RealtimeFeedRail } from "@/components/RealtimeFeedRail";
import { RealtimeFeedSheet } from "@/components/RealtimeFeedSheet";
import { InlineJobDetail } from "@/components/InlineJobDetail";

type Job = JobPosting & {
  // convenience aliases derived from content
  requirements_summary?: string;
  tech_stack?: string[];
  yoe?: number | null;
  commitment?: string | string[];
  company_size?: number | null;
  company_website?: string;
  security_clearance?: string;
  visa_sponsorship?: boolean;
  salary_est?: { min: number; max: number; n: number } | null;
};

function toJob(p: JobPosting): Job {
  return {
    ...p,
    requirements_summary: p.content?.requirements_summary,
    tech_stack: p.content?.tech_stack,
    yoe: p.content?.yoe,
    commitment: p.content?.commitment,
    company_size: p.content?.company_size,
    company_website: p.content?.company_website,
    security_clearance: p.content?.security_clearance,
    visa_sponsorship: p.content?.visa_sponsorship,
    salary_est: (p.content as Record<string, any> | undefined)?.salary_est ?? null,
  };
}

/** Starred roles live in localStorage as full snapshots, so the Starred view
 *  renders without the API and survives filter/pagination changes. This is
 *  the seed data for the coming AI scout ("find more like my stars"). */
const STARS_KEY = "atlantium_starred_jobs_v1";
function loadStars(): Record<string, Job> {
  try { return JSON.parse(localStorage.getItem(STARS_KEY) ?? "{}"); } catch { return {}; }
}

const WORKPLACE_FILTERS = ["All", "Remote", "Hybrid", "Onsite"];
/** Server-side title-regex buckets — keys must match JOB_FIELDS in the API. */
const FIELD_FILTERS: Array<{ key: string; label: string }> = [
  { key: "security", label: "Cybersecurity" },
  { key: "software", label: "Software" },
  { key: "data_ai", label: "Data & AI" },
  { key: "cloud_devops", label: "Cloud & DevOps" },
  { key: "product_design", label: "Product & Design" },
  { key: "sales_marketing", label: "Sales & Marketing" },
];
const SENIORITY_FILTERS = ["All", "Entry Level", "Mid Level", "Senior Level", "Lead", "Manager"];

function formatSalary(min: number | null | undefined, max: number | null | undefined): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function formatPostedDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getWorkplaceColor(type: string) {
  switch (type?.toLowerCase()) {
    case "remote": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "hybrid": return "bg-violet-500/10 border-violet-500/30 text-violet-400";
    case "onsite": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    default: return "bg-muted/50 border-border/50 text-muted-foreground";
  }
}

function JobCard({
  job,
  index,
  onGatedApply,
  gatedApplyLabel,
  starred,
  onToggleStar,
}: {
  job: Job;
  index: number;
  onGatedApply: () => void;
  gatedApplyLabel: string;
  starred: boolean;
  onToggleStar: (job: Job) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const salary = formatSalary(job.salary_min, job.salary_max);
  const commitment = Array.isArray(job.commitment) ? job.commitment[0] : job.commitment;
  const clearanceRequired = job.security_clearance && job.security_clearance !== "None" && job.security_clearance !== "false";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min((index % 10) * 0.02, 0.2) }}
      className="group rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm hover:border-cyan-500/30 hover:bg-card/60 transition-all duration-200"
    >
      <div className="p-3 sm:p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <Link to={`/jobs/${job.slug}`} className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors leading-tight mb-1 text-sm sm:text-base truncate">
              {job.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="truncate">{job.company}</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onToggleStar(job); }}
              aria-label={starred ? "Unstar this role" : "Star this role"}
              aria-pressed={starred}
              className={`h-8 w-8 rounded-md border flex items-center justify-center transition-all ${
                starred
                  ? "border-amber-400/50 text-amber-300 bg-amber-500/10"
                  : "border-border/50 text-muted-foreground hover:text-amber-300 hover:border-amber-400/40"
              }`}
            >
              <Star className={`h-4 w-4 ${starred ? "fill-current" : ""}`} />
            </button>
            {/* Always visible, phones included — passing a role to someone
                else is the most common thing people do here, so it should
                never be a hover-only affordance. */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); void shareJob(job); }}
              aria-label={`Share ${job.title} at ${job.company}`}
              className="h-8 w-8 rounded-md border border-border/50 text-muted-foreground hover:text-cyan-300 hover:border-cyan-400/40 flex items-center justify-center transition-all"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <Link to={`/jobs/${job.slug}`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/50 md:opacity-0 md:group-hover:opacity-100 transition-all h-8 text-xs sm:h-9 sm:text-sm">
                View
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          {isNewThisWeek(job) && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 bg-cyan-500/15 border-cyan-400/40 text-cyan-300">
              New this week
            </Badge>
          )}
          {(job.review?.degree_required === "not_required" || job.review?.degree_required === "equivalent_accepted") && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-medium px-2 py-0.5 bg-teal-500/10 border-teal-500/30 text-teal-400">
              No degree req.
            </Badge>
          )}
          {job.workplace_type && (
            <Badge variant="outline" className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 ${getWorkplaceColor(job.workplace_type)}`}>
              {job.workplace_type}
            </Badge>
          )}
          {job.seniority && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-muted/50 border-border/50 text-muted-foreground px-2 py-0.5">
              {job.seniority}
            </Badge>
          )}
          {commitment && commitment !== "Full Time" && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-400 px-2 py-0.5">
              {commitment}
            </Badge>
          )}
          {clearanceRequired && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-orange-500/10 border-orange-500/30 text-orange-400 px-2 py-0.5">
              Clearance Req.
            </Badge>
          )}
          {salary ? (
            <span className="text-xs font-medium text-emerald-400 ml-auto">{salary}</span>
          ) : job.salary_est ? (
            <span
              className="text-xs font-medium text-muted-foreground ml-auto cursor-help"
              title={`Estimated from ${job.salary_est.n} comparable Atlanta postings on this board — not employer-published.`}
            >
              ~{formatSalary(job.salary_est.min, job.salary_est.max)}
              <span className="ml-1 font-mono text-[9px] uppercase tracking-wide opacity-70">est.</span>
            </span>
          ) : null}
        </div>

        {/* Location & date */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-2 sm:mt-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          {job.posted_at && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3" />
              <span>{formatPostedDate(job.posted_at)}</span>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Less" : "Details"}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 sm:px-5 pb-3 sm:pb-5 border-t border-border/30 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
          {job.requirements_summary && (
            <div>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requirements</p>
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{job.requirements_summary}</p>
            </div>
          )}
          {job.tech_stack && job.tech_stack.length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tech Stack</p>
              <div className="flex flex-wrap gap-1">
                {job.tech_stack.slice(0, 12).map((tool) => (
                  <span
                    key={tool}
                    className="inline-block px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] sm:text-[10px] font-medium whitespace-nowrap"
                  >
                    {tool}
                  </span>
                ))}
                {job.tech_stack.length > 12 && (
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground self-center">+{job.tech_stack.length - 12} more</span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground pt-1">
            {job.yoe != null && <span><span className="text-foreground font-medium">{job.yoe}+</span> yrs exp</span>}
            {job.company_size && <span><span className="text-foreground font-medium">{job.company_size.toLocaleString()}</span> employees</span>}
            {job.visa_sponsorship && <span className="text-emerald-400">✓ Visa Sponsorship</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link to={`/jobs/${job.slug}`} className="flex-1 sm:flex-none">
              <Button size="sm" className="gap-1.5 w-full sm:w-auto bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs sm:text-sm h-8 sm:h-9">
                View Details
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            {job.apply_url ? (
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                <Button size="sm" variant="outline" className="gap-1.5 w-full sm:w-auto border-border/50 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9">
                  Apply Now
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onGatedApply}
                className="gap-1.5 flex-1 sm:flex-none w-full sm:w-auto border-border/50 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9"
              >
                <Lock className="h-3 w-3" />
                {gatedApplyLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Sidebar Cards ────────────────────────────────────────────────────────────
function TrainingCard() {
  return (
    <SpotlightCard className="p-5" spotlightColor="rgba(99, 102, 241, 0.15)">
      <TrainingPromoCard />
    </SpotlightCard>
  );
}

// ── Compact Training Card for Mobile ───────────────────────────────────────
function CompactTrainingCard() {
  return (
    <SpotlightCard className="p-3" spotlightColor="rgba(99, 102, 241, 0.15)">
      <div className="flex items-start gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-4 w-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Training Program</p>
          <h3 className="font-semibold text-foreground text-xs leading-tight">8-Week AI Engineering</h3>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
        Live sessions, a real client build, and warm introductions to hiring partners.
      </p>
      <Link to="/training" className="block">
        <Button size="sm" className="w-full gap-1.5 bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 h-8 text-xs">
          Learn More
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </SpotlightCard>
  );
}

function JobAlertsCard({
  isMember,
  onJoin,
  onStart,
}: {
  isMember: boolean;
  onJoin: (email?: string) => void;
  onStart: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      onJoin();
      return;
    }
    setIsSending(true);
    try {
      await onStart(value);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SpotlightCard className="p-5" spotlightColor="rgba(14, 165, 233, 0.12)">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="h-[18px] w-[18px] text-cyan-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Weekly Job Report</p>
          <h3 className="font-semibold text-foreground text-sm leading-tight">New Roles, Weekly</h3>
        </div>
      </div>

      {isMember ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="text-sm font-medium text-foreground">You're a member!</p>
          <p className="text-xs text-muted-foreground">The Weekly Job Report is headed to your inbox.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Join Atlantium free and get the Weekly Job Report — new Atlanta AI &amp; tech roles in your inbox.
          </p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
            <Button type="submit" size="sm" disabled={isSending} className="w-full gap-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30">
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              {isSending ? "Sending code..." : "Join Free"}
            </Button>
          </form>
        </>
      )}
    </SpotlightCard>
  );
}

const PAGE_SIZE = 60;

export function JobsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [workplaceFilter, setWorkplaceFilter] = useState("All");
  const [seniorityFilter, setSeniorityFilter] = useState("All");
  const [noDegreeOnly, setNoDegreeOnly] = useState(false);
  const [newThisWeekOnly, setNewThisWeekOnly] = useState(false);
  // 0 = no floor; 200_000 renders as "$200k+"
  const [salaryFloor, setSalaryFloor] = useState(0);
  const [fieldFilter, setFieldFilter] = useState<string | null>(null);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [debouncedSalaryFloor, setDebouncedSalaryFloor] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"board" | "realtime">("board");
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof api.getJobInsights>> | null>(null);
  const [feedSlug, setFeedSlug] = useState<string | null>(null);
  const [counts, setCounts] = useState({ remote: 0, hybrid: 0, new_this_week: 0, no_degree: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signup = useJobReportSignup();
  const gatedApplyLabel = signup.isMember ? "Finish profile to apply" : "Join free to apply";
  const handleGatedApply = useCallback(() => {
    if (!signup.isMember) {
      api.trackEvent("content_gate_signup_started", { surface: "jobs_board_apply" });
      signup.openWithEmail(undefined, "apply");
      return;
    }
    // Signed in but the questionnaire isn't done — that's the actual blocker.
    signup.openQuestionnaire();
  }, [signup]);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Guards against out-of-order responses when filters change mid-flight.
  const requestSeq = useRef(0);
  // Stars: id → full job snapshot (localStorage-backed; seeds the AI scout)
  const [stars, setStars] = useState<Record<string, Job>>(loadStars);
  const [starredOnly, setStarredOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Session-scoped so the bar stays gone while browsing but isn't killed forever
  const [promoDismissed, setPromoDismissed] = useState(
    () => sessionStorage.getItem("atlantium_jobs_promo_dismissed") === "1",
  );
  const toggleStar = useCallback((job: Job) => {
    setStars((prev) => {
      const next = { ...prev };
      if (next[job.id]) delete next[job.id];
      else next[job.id] = job;
      localStorage.setItem(STARS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const starredJobs = Object.values(stars);

  // The dashboard claims to be live, so it has to actually be live: poll on
  // the minute while it is open and visible. The re-render matters as much as
  // the data — the feed's "Just now" grouping is computed from Date.now(), so
  // without a tick those roles would stay badged "Just now" indefinitely.
  // Hidden tabs stop polling and refresh once on return.
  useEffect(() => {
    if (viewMode !== "realtime") return;
    let cancelled = false;
    let lastAt = 0;
    // Staleness is the only trigger. Both the timer and a tab regaining focus
    // ask the same question — "is the data older than a minute?" — so a burst
    // of visibilitychange events (rapid tab switching, embedded browsers)
    // cannot turn into a burst of requests.
    const STALE_MS = 55_000;
    // `force` is the mount load: a tab opened in the background is still a tab
    // the user will look at, so the first fetch must not wait for focus.
    const load = (force = false) => {
      if (!force && document.visibilityState === "hidden") return;
      if (!force && Date.now() - lastAt < STALE_MS) return;
      lastAt = Date.now();
      api.getJobInsights().then((r) => { if (!cancelled) setInsights(r); }).catch(() => {});
    };
    load(true);
    const id = setInterval(() => load(), 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [viewMode]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSalaryFloor(salaryFloor), 350);
    return () => clearTimeout(t);
  }, [salaryFloor]);

  const queryParams = useCallback(
    (offset: number) => ({
      q: debouncedSearch || undefined,
      workplace_type: workplaceFilter !== "All" ? workplaceFilter : undefined,
      seniority: seniorityFilter !== "All" ? seniorityFilter : undefined,
      no_degree: noDegreeOnly || undefined,
      new_this_week: newThisWeekOnly || undefined,
      salary_floor: debouncedSalaryFloor || undefined,
      field: fieldFilter || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [debouncedSearch, workplaceFilter, seniorityFilter, noDegreeOnly, newThisWeekOnly, debouncedSalaryFloor, fieldFilter],
  );

  // First page — refetches whenever search or filters change.
  useEffect(() => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);
    api.getJobPostingsPaged(queryParams(0))
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setJobs(res.jobs.map(toJob));
        setTotal(res.total);
        setCounts(res.counts);
        if (res.fields) setFieldCounts(res.fields);
      })
      .catch(() => {
        if (seq === requestSeq.current) setError("Failed to load job postings. Please try again.");
      })
      .finally(() => {
        if (seq === requestSeq.current) setIsLoading(false);
      });
  }, [queryParams]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || jobs.length >= total) return;
    const seq = requestSeq.current;
    setIsLoadingMore(true);
    api.getJobPostingsPaged(queryParams(jobs.length))
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setJobs((prev) => [...prev, ...res.jobs.map(toJob)]);
        setTotal(res.total);
        setCounts(res.counts);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMore(false));
  }, [isLoading, isLoadingMore, jobs.length, total, queryParams]);

  // The app shell scrolls in one place: the list column. Virtualization is
  // bound to that element (not the window); only ~a screenful of measured
  // cards lives in the DOM.
  const displayJobs = starredOnly ? starredJobs : jobs;
  const virtualizer = useVirtualizer({
    count: displayJobs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 190,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
    getItemKey: (i) => displayJobs[i]?.id ?? i,
  });
  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (starredOnly) return; // local list, nothing to page in
    const last = virtualItems[virtualItems.length - 1];
    if (last && last.index >= jobs.length - 8) loadMore();
  }, [virtualItems, jobs.length, loadMore, starredOnly]);


  const filterRail = (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search title, company, tech..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card/60 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
      </div>

      {/* Workplace */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          <span className="text-primary/70 mr-1">01</span>Workplace
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WORKPLACE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setWorkplaceFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                workplaceFilter === f
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-card/40 border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Seniority */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          <span className="text-primary/70 mr-1">02</span>Seniority
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SENIORITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setSeniorityFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                seniorityFilter === f
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Salary floor */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="text-primary/70 mr-1">03</span>Salary
          </p>
          <span className={`font-mono text-xs ${salaryFloor > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
            {salaryFloor === 0 ? "Any" : salaryFloor >= 200000 ? "$200k+" : `$${salaryFloor / 1000}k+`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={200000}
          step={10000}
          value={salaryFloor}
          onChange={(e) => setSalaryFloor(Number(e.target.value))}
          aria-label="Minimum salary"
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border/60 accent-emerald-400"
        />
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-1">
          <span>Any</span>
          <span>$100k</span>
          <span>$200k+</span>
        </div>
        {salaryFloor > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Roles without published salary are hidden while a floor is set.
          </p>
        )}
      </div>

      {/* Field */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          <span className="text-primary/70 mr-1">04</span>Field
        </p>
        <div className="flex flex-col gap-1.5">
          {FIELD_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFieldFilter(fieldFilter === key ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center transition-all ${
                fieldFilter === key
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {label}
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {(fieldCounts[key] ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Signals */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          <span className="text-primary/70 mr-1">05</span>Signals
        </p>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setNoDegreeOnly(!noDegreeOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
              noDegreeOnly
                ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            No degree required
          </button>
          <button
            onClick={() => setStarredOnly(!starredOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center gap-2 transition-all ${
              starredOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${starredOnly ? "fill-current" : ""}`} />
            Starred
            <span className="ml-auto font-mono text-[10px]">{starredJobs.length}</span>
          </button>
        </div>
      </div>

      {/* AI scout teaser — stars are its training data */}
      <div className="rounded-lg border border-dashed border-border/60 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-semibold">AI Scout</span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Soon</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Star roles you like — the scout will learn your taste and hunt for more.
        </p>
      </div>
    </div>
  );

  /* Metric bar: the counts the API computes UNDER the current filters, as
     controls. Each tile both reports and narrows — click Remote and every
     number recomputes within Remote. */
  const metricTile = (
    label: string,
    value: number,
    active: boolean,
    colorClass: string,
    activeClass: string,
    onClick: () => void,
  ) => (
    <button
      key={label}
      onClick={() => { setStarredOnly(false); onClick(); }}
      aria-pressed={active}
      className={`flex-1 min-w-[96px] rounded-lg border px-3 py-2 text-left transition-all ${
        active ? activeClass : "border-border/40 bg-card/30 hover:border-border hover:bg-card/50"
      }`}
    >
      <span className={`block font-mono text-lg leading-tight ${colorClass}`}>{value.toLocaleString()}</span>
      <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </button>
  );

  const metricBar = (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Job metrics and quick filters">
      {metricTile("Open roles", total, workplaceFilter === "All" && !noDegreeOnly && !newThisWeekOnly && !starredOnly && salaryFloor === 0 && !fieldFilter, "text-foreground",
        "border-foreground/30 bg-foreground/5",
        () => { setWorkplaceFilter("All"); setNoDegreeOnly(false); setNewThisWeekOnly(false); setSalaryFloor(0); setFieldFilter(null); })}
      {metricTile("Remote", counts.remote, workplaceFilter === "Remote", "text-emerald-400",
        "border-emerald-500/40 bg-emerald-500/10",
        () => setWorkplaceFilter(workplaceFilter === "Remote" ? "All" : "Remote"))}
      {metricTile("Hybrid", counts.hybrid, workplaceFilter === "Hybrid", "text-violet-400",
        "border-violet-500/40 bg-violet-500/10",
        () => setWorkplaceFilter(workplaceFilter === "Hybrid" ? "All" : "Hybrid"))}
      {metricTile("New this week", counts.new_this_week, newThisWeekOnly, "text-cyan-400",
        "border-cyan-500/40 bg-cyan-500/10",
        () => setNewThisWeekOnly(!newThisWeekOnly))}
      {metricTile("No degree", counts.no_degree, noDegreeOnly, "text-teal-400",
        "border-teal-500/40 bg-teal-500/10",
        () => setNoDegreeOnly(!noDegreeOnly))}
    </div>
  );

  const jobList = isLoading && !starredOnly ? (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span>Loading jobs...</span>
    </div>
  ) : error && !starredOnly ? (
    <div className="text-center py-16 text-muted-foreground">
      <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p>{error}</p>
    </div>
  ) : displayJobs.length === 0 ? (
    <div className="text-center py-16 text-muted-foreground">
      {starredOnly ? (
        <>
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No starred roles yet — tap the star on any job.</p>
        </>
      ) : (
        <>
          <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No jobs match your filters.</p>
          <button
            className="mt-2 text-sm text-cyan-400 hover:underline"
            onClick={() => { setSearch(""); setWorkplaceFilter("All"); setSeniorityFilter("All"); setNoDegreeOnly(false); setNewThisWeekOnly(false); setSalaryFloor(0); setFieldFilter(null); }}
          >
            Clear filters
          </button>
        </>
      )}
    </div>
  ) : (
    <>
      <div
        ref={listRef}
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((vi) => (
          <div
            key={vi.key}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full pb-3"
            style={{ transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)` }}
          >
            <JobCard
              job={displayJobs[vi.index]}
              index={vi.index}
              onGatedApply={handleGatedApply}
              gatedApplyLabel={gatedApplyLabel}
              starred={!!stars[displayJobs[vi.index].id]}
              onToggleStar={toggleStar}
            />
          </div>
        ))}
      </div>
      {isLoadingMore && !starredOnly && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading more roles...</span>
        </div>
      )}
      {!starredOnly && jobs.length >= total && total > PAGE_SIZE && (
        <p className="text-center text-xs text-muted-foreground py-4">
          That's all {total} roles.
        </p>
      )}
    </>
  );

  return (
    <div className="h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Aurora */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora
          colorStops={["#0ea5e9", "#6366f1", "#334155"]}
          amplitude={0.7}
          blend={0.5}
          speed={0.3}
        />
      </div>
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <PublicNavbar />

      {/* Slim full-width strip: snapshot label + Board/Realtime switch */}
      <div className="relative z-10 px-4 sm:px-6 py-1.5 border-b border-border/30 bg-background/85 backdrop-blur-xl">
        <div className="relative flex items-center justify-center gap-3">
          <span className="flex items-baseline gap-2 whitespace-nowrap truncate min-w-0">
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Powered by</span>
            <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">Atlantium</span>
            <span className="text-sm sm:text-base font-medium tracking-tight text-muted-foreground">: Atlanta's Technology Network</span>
          </span>
          {/* mobile-only affordances — desktop stays bare per design */}
          {viewMode === "realtime" ? (
            <button
              onClick={() => setViewMode("board")}
              className="lg:hidden shrink-0 px-3 py-1.5 rounded-md border border-border/60 bg-card/40 text-xs font-semibold text-muted-foreground"
            >
              ← Index
            </button>
          ) : (
            <button
              onClick={() => setViewMode("realtime")}
              className="lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Dashboard
            </button>
          )}
        </div>
      </div>

      {/* App frame: fixed rail, one scrolling column */}
      <div className="relative z-10 flex-1 flex min-h-0">
        {/* Left rail (desktop): filters in board mode, the live feed in realtime */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-r border-border/40 overflow-hidden">
          {viewMode === "board" ? (
            <div className="p-5 flex flex-col gap-6 flex-1 overflow-y-auto">
              <button
                onClick={() => setViewMode("realtime")}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/15"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-semibold text-emerald-300">Open dashboard</span>
                <ArrowRight className="ml-auto h-4 w-4 text-emerald-400/70 transition-transform group-hover:translate-x-0.5" />
              </button>
              {filterRail}
            </div>
          ) : (
            <>
              <div className="p-4 pb-3 border-b border-border/40">
                <button
                  onClick={() => { setViewMode("board"); setFeedSlug(null); }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to index
                </button>
                <div className="flex items-center gap-2 mt-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-sm font-bold">Realtime feed</span>
                  <span className="ml-auto text-[10px] font-mono uppercase tracking-wide text-muted-foreground">rolling</span>
                </div>
              </div>
              <RealtimeFeedRail jobs={insights?.intake_5h ?? []} onSelect={setFeedSlug} />
            </>
          )}
        </aside>

        {/* The one scrolling column */}
        <div ref={scrollRef} className="relative flex-1 min-w-0 overflow-y-auto overscroll-contain">
          {/* Mobile-only strip: board identity + the way into the filter drawer.
              Desktop needs neither — the rail says who we are and the metric
              bar says what's here. */}
          {viewMode === "board" && (
          <div className="lg:hidden px-4 sm:px-6 pt-5 pb-3 flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Cpu className="h-4 w-4 text-cyan-500 shrink-0" />
              <span className="text-sm font-bold truncate">Tech Job Index</span>
            </div>
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 text-xs font-medium text-muted-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
          )}

          {viewMode === "board" && (
            <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl px-4 sm:px-6 py-2 border-b border-border/30">
              <div className="max-w-3xl">{metricBar}</div>
            </div>
          )}

          <main className={`px-4 sm:px-6 pt-4 pb-32 lg:pb-10 ${viewMode === "realtime" ? "w-full pt-2" : "max-w-3xl"}`}>
            {viewMode === "realtime"
              ? feedSlug
                ? <InlineJobDetail slug={feedSlug} onClose={() => setFeedSlug(null)} />
                : <RealtimeMarketPanel preloaded={insights} />
              : jobList}
            {viewMode === "board" && (
              <div className="mt-6 pt-6 border-t border-border/30 text-xs text-muted-foreground">
                <span>AI Engineering Opportunities in Atlanta, GA · 50mi radius</span>
              </div>
            )}
          </main>
        </div>

        {/* Right rail — what we're selling, out of the filter column so the
            left stays purely controls. Board mode only. */}
        {viewMode === "board" && (
        <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l border-border/40 overflow-y-auto">
          <div className="p-5 space-y-4">
            <TrainingCard />
            <JobAlertsCard isMember={signup.isMember} onJoin={signup.openWithEmail} onStart={signup.startWithEmail} />
          </div>
        </aside>
        )}
      </div>

      {/* Mobile realtime surface — the desktop rail has no mobile equivalent,
          so the newest role lives in a peek sheet instead. */}
      {viewMode === "realtime" && (
        <RealtimeFeedSheet jobs={insights?.intake_5h ?? []} onSelect={setFeedSlug} />
      )}

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMobileFiltersOpen(false)} />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "tween", duration: 0.22 }}
              className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-background border-r border-border/60 overflow-y-auto p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-bold">Filters</span>
                <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {filterRail}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: sticky training card at bottom — dismissible; it covers the
          last rows of a list that is the whole point of the page */}
      <AnimatePresence>
        {!promoDismissed && viewMode === "board" && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden p-3 bg-background/80 backdrop-blur-xl border-t border-border/30"
          >
            <div className="relative">
              <CompactTrainingCard />
              <button
                onClick={() => {
                  sessionStorage.setItem("atlantium_jobs_promo_dismissed", "1");
                  setPromoDismissed(true);
                }}
                aria-label="Dismiss training promo"
                className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <JobReportSignupModal
        open={signup.open}
        onOpenChange={signup.setOpen}
        initialEmail={signup.initialEmail}
        initialStep={signup.initialStep}
        intent={signup.intent}
      />
    </div>
  );
}
