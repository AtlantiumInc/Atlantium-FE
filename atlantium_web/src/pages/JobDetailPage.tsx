import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ExternalLink,
  MapPin,
  Building2,
  Clock,
  Cpu,
  ChevronLeft,
  Loader2,
  Briefcase,
  Users,
  Globe,
  ShieldCheck,
  Plane,
  GraduationCap,
  Bell,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import Aurora from "@/components/Aurora";
import { api, type JobPosting } from "@/lib/api";

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function formatPostedDate(isoDate?: string | null): string {
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

function getWorkplaceColor(type?: string) {
  switch (type?.toLowerCase()) {
    case "remote": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "hybrid": return "bg-violet-500/10 border-violet-500/30 text-violet-400";
    case "onsite": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    default: return "bg-muted/50 border-border/50 text-muted-foreground";
  }
}

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

function JobAlertsCard() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
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

export function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBannerVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!slug) return;
    api.getJobPosting(slug)
      .then(setJob)
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
        else setNotFound(true);
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  const salary = formatSalary(job?.salary_min, job?.salary_max);
  const commitment = Array.isArray(job?.content?.commitment)
    ? job!.content!.commitment![0]
    : job?.content?.commitment;
  const clearanceRequired =
    job?.content?.security_clearance &&
    job.content.security_clearance !== "None" &&
    job.content.security_clearance !== "false";

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

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full pb-40 lg:pb-8">
        {/* Back link */}
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        ) : notFound || !job ? (
          <div className="text-center py-24 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Job Not Found</h2>
            <p className="text-sm mb-6">This listing may have been removed or the URL is incorrect.</p>
            <Link to="/jobs">
              <Button variant="outline" size="sm">Browse All Jobs</Button>
            </Link>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Header card */}
            <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 sm:p-7 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Icon + company */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Cpu className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                      {job.content?.company_website && (
                        <a
                          href={`https://${job.content.company_website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {job.content.company_website}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-3">
                    {job.title}
                  </h1>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {job.workplace_type && (
                      <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${getWorkplaceColor(job.workplace_type)}`}>
                        {job.workplace_type}
                      </Badge>
                    )}
                    {job.seniority && (
                      <Badge variant="outline" className="text-xs bg-muted/50 border-border/50 text-muted-foreground px-2.5 py-0.5">
                        {job.seniority}
                      </Badge>
                    )}
                    {commitment && commitment !== "Full Time" && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 px-2.5 py-0.5">
                        {commitment}
                      </Badge>
                    )}
                    {clearanceRequired && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 px-2.5 py-0.5">
                        Clearance Req.
                      </Badge>
                    )}
                    {salary && (
                      <span className="text-sm font-semibold text-emerald-400">{salary}</span>
                    )}
                  </div>

                  {/* Location + date */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{job.location}</span>
                    </div>
                    {job.posted_at && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatPostedDate(job.posted_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Apply CTA */}
                <div className="flex-shrink-0">
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="gap-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 w-full sm:w-auto"
                    >
                      Apply Now
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Main content + sidebar */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left: main content */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* About the Role */}
                {job.content?.requirements_summary && (
                  <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 sm:p-6">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      About the Role
                    </h2>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {job.content.requirements_summary}
                    </p>
                  </div>
                )}

                {/* Tech Stack */}
                {job.content?.tech_stack && job.content.tech_stack.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 sm:p-6">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Tech Stack
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {job.content.tech_stack.map((tool) => (
                        <span
                          key={tool}
                          className="inline-block px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply CTA (bottom) */}
                <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Ready to apply?</p>
                    <p className="text-xs text-muted-foreground">
                      {job.company} is hiring for this role.
                    </p>
                  </div>
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <Button className="gap-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30">
                      Apply Now
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Right: sidebar */}
              <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 space-y-4 lg:sticky lg:top-24">
                <div className="hidden lg:block"><TrainingCard /></div>
                <div className="hidden lg:block"><JobAlertsCard /></div>
                <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Details
                  </h2>
                  <div className="space-y-3">
                    {job.content?.yoe != null && (
                      <div className="flex items-start gap-2.5">
                        <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Experience</p>
                          <p className="text-sm text-foreground">{job.content.yoe}+ years</p>
                        </div>
                      </div>
                    )}
                    {commitment && (
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Commitment</p>
                          <p className="text-sm text-foreground">{commitment}</p>
                        </div>
                      </div>
                    )}
                    {job.content?.company_size != null && (
                      <div className="flex items-start gap-2.5">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Company Size</p>
                          <p className="text-sm text-foreground">{job.content.company_size.toLocaleString()} employees</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <Plane className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visa Sponsorship</p>
                        <p className={`text-sm ${job.content?.visa_sponsorship ? "text-emerald-400" : "text-foreground"}`}>
                          {job.content?.visa_sponsorship ? "Available" : "Not offered"}
                        </p>
                      </div>
                    </div>
                    {job.content?.security_clearance && job.content.security_clearance !== "None" && (
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clearance</p>
                          <p className="text-sm text-orange-400">{job.content.security_clearance}</p>
                        </div>
                      </div>
                    )}
                    {job.content?.company_website && (
                      <div className="flex items-start gap-2.5">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Website</p>
                          <a
                            href={`https://${job.content.company_website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cyan-400 hover:underline"
                          >
                            {job.content.company_website}
                          </a>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Location</p>
                        <p className="text-sm text-foreground">{job.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mobile sticky training banner — appears after 3s, dismissible */}
        <AnimatePresence>
          {bannerVisible && !bannerDismissed && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 lg:hidden p-3 bg-background/80 backdrop-blur-xl border-t border-border/30"
            >
              <SpotlightCard className="p-3" spotlightColor="rgba(99, 102, 241, 0.15)">
                <div className="flex items-start gap-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Training Program</p>
                    <h3 className="font-semibold text-foreground text-xs leading-tight">4-Week AI Engineering</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 mb-2">
                      Build enterprise apps, refactor legacy code, land a role — with daily office hours.
                    </p>
                    <Link to="/training" className="block">
                      <Button size="sm" className="w-full gap-1.5 bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 h-8 text-xs">
                        Learn More
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </SpotlightCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
