import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ExternalLink, MapPin, Briefcase, Search, Building2, Clock, ChevronDown, ChevronUp, Cpu, GraduationCap, Bell, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import Aurora from "@/components/Aurora";
import { api, type JobPosting } from "@/lib/api";

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
  };
}

const WORKPLACE_FILTERS = ["All", "Remote", "Hybrid", "Onsite"];
const SENIORITY_FILTERS = ["All", "Entry Level", "Mid Level", "Senior Level", "Lead", "Manager"];

function formatSalary(min: number | null, max: number | null): string | null {
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

function JobCard({ job, index }: { job: Job; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const salary = formatSalary(job.salary_min, job.salary_max);
  const commitment = Array.isArray(job.commitment) ? job.commitment[0] : job.commitment;
  const clearanceRequired = job.security_clearance && job.security_clearance !== "None" && job.security_clearance !== "false";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.5) }}
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
          <Link to={`/jobs/${job.slug}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/50 md:opacity-0 md:group-hover:opacity-100 transition-all h-8 text-xs sm:h-9 sm:text-sm">
              View
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
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
          {salary && (
            <span className="text-xs font-medium text-emerald-400 ml-auto">{salary}</span>
          )}
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
            {job.yoe !== null && <span><span className="text-foreground font-medium">{job.yoe}+</span> yrs exp</span>}
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
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
              <Button size="sm" variant="outline" className="gap-1.5 w-full sm:w-auto border-border/50 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9">
                Apply Now
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
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
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-[18px] w-[18px] text-violet-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Atlantium</p>
          <h3 className="font-semibold text-foreground text-sm leading-tight">AI Engineer Training</h3>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Not ready to apply yet? Our 4-week hands-on program teaches you to build enterprise apps, refactor legacy systems, and land a role — with daily office hours and warm introductions.
      </p>
      <div className="space-y-1.5 mb-4">
        {["4 weeks, fully hands-on", "Daily office hours", "Portfolio + introductions"].map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-violet-400 flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>
      <Link to="/training">
        <Button size="sm" className="w-full gap-2 bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30">
          Learn More
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
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
          <h3 className="font-semibold text-foreground text-xs leading-tight">4-Week AI Engineering</h3>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
        Build enterprise apps, refactor legacy code, land a role — with daily office hours.
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

function JobAlertsCard() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire to backend
    setSubmitted(true);
  };

  return (
    <SpotlightCard className="p-5" spotlightColor="rgba(14, 165, 233, 0.12)">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Bell className="h-[18px] w-[18px] text-cyan-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Job Alerts</p>
          <h3 className="font-semibold text-foreground text-sm leading-tight">New Roles, Weekly</h3>
        </div>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="text-sm font-medium text-foreground">You're on the list!</p>
          <p className="text-xs text-muted-foreground">We'll email you when new AI roles drop in Atlanta.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Get notified when new AI engineering jobs are posted in Atlanta.
          </p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
            <Button type="submit" size="sm" className="w-full gap-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30">
              <Bell className="h-3.5 w-3.5" />
              Notify Me
            </Button>
          </form>
        </>
      )}
    </SpotlightCard>
  );
}

export function JobsPage() {
  const [search, setSearch] = useState("");
  const [workplaceFilter, setWorkplaceFilter] = useState("All");
  const [seniorityFilter, setSeniorityFilter] = useState("All");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getJobPostings()
      .then((postings) => setJobs(postings.map(toJob)))
      .catch(() => setError("Failed to load job postings. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.tech_stack ?? []).some((t) => t.toLowerCase().includes(q));

      const matchesWorkplace =
        workplaceFilter === "All" ||
        job.workplace_type?.toLowerCase() === workplaceFilter.toLowerCase();

      const matchesSeniority =
        seniorityFilter === "All" ||
        job.seniority?.toLowerCase() === seniorityFilter.toLowerCase();

      return matchesSearch && matchesWorkplace && matchesSeniority;
    });
  }, [jobs, search, workplaceFilter, seniorityFilter]);

  const remoteCount = jobs.filter((j) => j.workplace_type === "Remote").length;
  const hybridCount = jobs.filter((j) => j.workplace_type === "Hybrid").length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Cpu className="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Tech Job Postings</h1>
              <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>Atlanta, GA · 50 mile radius</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><span className="text-foreground font-semibold">{jobs.length}</span> open roles</span>
            <span><span className="text-emerald-400 font-semibold">{remoteCount}</span> remote</span>
            <span><span className="text-violet-400 font-semibold">{hybridCount}</span> hybrid</span>
            <span className="text-xs self-center opacity-60">updated Feb 2026</span>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, company, or tech..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-card/60 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
          </div>

          {/* Workplace filter */}
          <div className="flex gap-1.5 flex-wrap">
            {WORKPLACE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setWorkplaceFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  workplaceFilter === f
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-card/40 border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Seniority filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="hidden sm:flex gap-1.5 flex-wrap mb-6"
        >
          {SENIORITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setSeniorityFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
                seniorityFilter === f
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Results count */}
        {(search || workplaceFilter !== "All" || seniorityFilter !== "All") && (
          <p className="text-xs text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            {search && ` for "${search}"`}
          </p>
        )}

        {/* Two-column layout: job list + sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 items-start pb-32 lg:pb-0 w-full min-w-0">
          {/* Job list */}
          <div className="w-full lg:flex-1 lg:min-w-0 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading jobs...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No jobs match your filters.</p>
                <button
                  className="mt-2 text-sm text-cyan-400 hover:underline"
                  onClick={() => { setSearch(""); setWorkplaceFilter("All"); setSeniorityFilter("All"); }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filtered.map((job, i) => <JobCard key={job.id} job={job} index={i} />)
            )}

            {/* Footer attribution */}
            <div className="mt-6 pt-6 border-t border-border/30 text-xs text-muted-foreground">
              <span>AI Engineering Opportunities in Atlanta, GA · 50mi radius</span>
            </div>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:flex lg:flex-col w-72 xl:w-80 flex-shrink-0 space-y-4 sticky top-24">
            <TrainingCard />
            <JobAlertsCard />
          </div>
        </div>

        {/* Mobile: sticky training card at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden p-3 bg-background/80 backdrop-blur-xl border-t border-border/30">
          <CompactTrainingCard />
        </div>
      </main>
    </div>
  );
}
