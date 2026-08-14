import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import { api, type JobPosting } from "@/lib/api";
import { ApplyForm } from "@/components/training/ApplyForm";
import rawJobs from "@/data/jobs.json";
import {
  ArrowRight,
  ExternalLink,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Code,
  Smartphone,
  GitMerge,
  LayoutDashboard,
  FolderOpen,
  Handshake,
  CheckCircle2,
  Zap,
  Users,
  Video,
  Star,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workplace_type: string;
  seniority: string;
  salary_min: number | null;
  salary_max: number | null;
  tech_stack: string[];
  apply_url: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return null;
}

function getWorkplaceColor(type: string) {
  switch (type?.toLowerCase()) {
    case "remote": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "hybrid": return "bg-violet-500/10 border-violet-500/30 text-violet-400";
    default: return "bg-blue-500/10 border-blue-500/30 text-blue-400";
  }
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Featured Jobs (live from the API, bundled jobs.json as offline fallback) ─
const allJobs = rawJobs as Job[];
const FALLBACK_FEATURED = [
  // GEI Consultants AI Engineer (has salary)
  allJobs.find(j => j.company === "GEI Consultants" && j.title === "AI Engineer"),
  // Troutman AI Engineer (hybrid Atlanta)
  allJobs.find(j => j.company === "Troutman"),
  // Fisher Phillips AI Engineer
  allJobs.find(j => j.company === "Fisher Phillips LLP"),
  // GEI Full Stack
  allJobs.find(j => j.title === "Full Stack Engineer" && j.company === "GEI Consultants"),
].filter(Boolean).slice(0, 4) as Job[];

function toCardJob(j: JobPosting): Job {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    workplace_type: j.workplace_type ?? "",
    seniority: j.seniority ?? "",
    salary_min: j.salary_min ?? null,
    salary_max: j.salary_max ?? null,
    tech_stack: j.content?.tech_stack ?? [],
    apply_url: j.apply_url ?? "",
  };
}

// Rank live jobs for the training audience: entry-level and no-degree first,
// then local (Georgia) or remote to match the "hiring in Atlanta" copy.
function trainingScore(j: JobPosting): number {
  let score = 0;
  const seniority = (j.seniority ?? "").toLowerCase();
  if (seniority.includes("no prior") || seniority.includes("entry")) score += 3;
  else if (seniority.includes("mid")) score += 1;
  else if (seniority.includes("senior")) score -= 2;
  if (j.review?.degree_required === "not_required" || j.review?.degree_required === "equivalent_accepted") score += 2;
  const location = (j.location ?? "").toLowerCase();
  if (location.includes("georgia") || location.includes("atlanta")) score += 2;
  else if ((j.workplace_type ?? "").toLowerCase() === "remote") score += 1;
  if (j.salary_min || j.salary_max) score += 1;
  return score;
}

// Greedy pick: best-scored first, one job per company for variety.
function pickFeatured(jobs: JobPosting[], count: number): Job[] {
  const sorted = [...jobs].sort((a, b) => trainingScore(b) - trainingScore(a));
  const picked: JobPosting[] = [];
  const companies = new Set<string>();
  for (const j of sorted) {
    if (companies.has(j.company)) continue;
    companies.add(j.company);
    picked.push(j);
    if (picked.length >= count) break;
  }
  return picked.map(toCardJob);
}

// ── Curriculum ───────────────────────────────────────────────────────────────
const curriculum = [
  {
    week: "Weeks 1\u20132",
    title: "AI-Native Foundations",
    icon: Code,
    color: "cyan",
    topics: [
      "AI-assisted development workflows",
      "TypeScript + the modern web stack",
      "Calling models: prompts, structure, streaming",
      "Ship your first AI feature in week one",
    ],
  },
  {
    week: "Weeks 3\u20134",
    title: "Building on LLMs",
    icon: Smartphone,
    color: "blue",
    topics: [
      "RAG: retrieval, embeddings, chunking",
      "Agents & tool use that actually work",
      "Evals \u2014 testing AI features like software",
      "Auth, payments & production plumbing",
    ],
  },
  {
    week: "Weeks 5\u20137",
    title: "The Client Build",
    icon: GitMerge,
    color: "violet",
    topics: [
      "A real project for a real organization",
      "Teams of 3\u20134: git, code review, standups",
      "Cost, latency & observability in production",
      "Weekly demos to the client, like a real team",
    ],
  },
  {
    week: "Week 8",
    title: "Ship & Launch Your Career",
    icon: FolderOpen,
    color: "emerald",
    topics: [
      "Deliver and deploy the client project",
      "A portfolio with production work in it",
      "Technical interview prep",
      "Warm introductions to hiring partners",
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  cyan:    { bg: "from-cyan-500/10 to-transparent",    border: "border-cyan-500/20",    text: "text-cyan-400",    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",    icon: "bg-cyan-500/10 border-cyan-500/20" },
  blue:    { bg: "from-blue-500/10 to-transparent",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/10 border-blue-500/20 text-blue-300",    icon: "bg-blue-500/10 border-blue-500/20" },
  violet:  { bg: "from-violet-500/10 to-transparent",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/10 border-violet-500/20 text-violet-300",  icon: "bg-violet-500/10 border-violet-500/20" },
  emerald: { bg: "from-emerald-500/10 to-transparent", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", icon: "bg-emerald-500/10 border-emerald-500/20" },
};

// ── What you get ─────────────────────────────────────────────────────────────
const outcomes = [
  { icon: Video,          label: "Live Sessions",           desc: "Daily in weeks 1\u20132, then structured working sessions through the build." },
  { icon: LayoutDashboard, label: "A Real Client Build",    desc: "Five weeks on software for a real organization \u2014 not a tutorial project." },
  { icon: Handshake,      label: "Warm Introductions",      desc: "Direct referrals to hiring partners in Atlanta and remote." },
  { icon: FolderOpen,     label: "Portfolio You Own",       desc: "Leave with shipped work you can show any employer." },
  { icon: Users,          label: "Cohort Network",          desc: "Build lasting relationships with your cohort." },
  { icon: Zap,            label: "AI-First Curriculum",     desc: "Learn to build with AI the way top engineers actually do it." },
];

// ── Component ────────────────────────────────────────────────────────────────
export function TrainingPage() {
  const scrollToApply = () =>
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const [featuredJobs, setFeaturedJobs] = useState<Job[]>(FALLBACK_FEATURED);
  const [totalJobs, setTotalJobs] = useState(allJobs.length);

  // Old /training/apply links redirect here with #apply — land them on the
  // form. One scroll isn't enough: the sections above are still loading and
  // reflowing, so re-anchor a few times while the page settles.
  useEffect(() => {
    if (window.location.hash !== "#apply") return;
    const timers = [0, 250, 600, 1200].map((ms) =>
      setTimeout(() => document.getElementById("apply")?.scrollIntoView({ block: "start" }), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    api.getJobPostingsPaged({ status: "active", limit: 30 })
      .then((r) => {
        // skip anything the AI review has marked dead-but-flagged
        const live = r.jobs
          .filter((j) => !j.review?.status || ["open", "unreachable"].includes(j.review.status));
        const picked = pickFeatured(live, 4);
        if (picked.length >= 2) setFeaturedJobs(picked);
        if (r.total > 0) setTotalJobs(r.total);
      })
      .catch(() => { /* bundled fallback already showing */ });
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 opacity-25 dark:opacity-40">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.9} blend={0.6} speed={0.35} />
      </div>
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02] dark:opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />

      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Now Enrolling · Cohort 1</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.05] mb-6">
            <ShinyText text="Become an" className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold" color="#e2e8f0" shineColor="#22d3ee" speed={3} />
            <br />
            <ShinyText text="AI Engineer" className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold" color="#22d3ee" shineColor="#ffffff" speed={2} />
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            An 8-week intensive that takes you from where you are to shipping production AI — live sessions, a real client build, and introductions to hiring partners in Atlanta. Tuition varies: Atlanta Builder Grants cover up to half, and every applicant gets a call.
          </p>

          {/* Program stats */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground mb-10">
            {[
              { icon: Calendar, label: "8 Weeks" },
              { icon: Clock,    label: "Live Sessions" },
              { icon: Code,     label: "A Real Client Build" },
              { icon: Star,     label: "Seats Fill Every Cohort" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-cyan-500" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={scrollToApply}
              className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0 text-base"
            >
              Apply for Cohort 1
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── What you'll learn ── */}
      <section id="curriculum" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Curriculum</p>
            <h2 className="text-3xl sm:text-4xl font-bold">8 Weeks. Fully Hands-On.</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Each week builds on the last. You ship something real every week.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {curriculum.map((week, i) => {
            const c = colorMap[week.color];
            const Icon = week.icon;
            return (
              <FadeIn key={week.week} delay={i * 0.08}>
                <SpotlightCard
                  className={`h-full p-6 bg-gradient-to-br ${c.bg}`}
                  spotlightColor={`rgba(14, 165, 233, 0.1)`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-10 w-10 rounded-xl ${c.icon} border flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${c.text}`} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>{week.week}</p>
                      <h3 className="font-bold text-foreground leading-tight">{week.title}</h3>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {week.topics.map((topic) => (
                      <li key={topic} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${c.text}`} />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">The Program</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Everything You Need to Land the Role</h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {outcomes.map((item, i) => {
            const Icon = item.icon;
            return (
              <FadeIn key={item.label} delay={i * 0.07}>
                <SpotlightCard className="h-full p-5" spotlightColor="rgba(99, 102, 241, 0.1)">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </SpotlightCard>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ── Jobs you can land ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Opportunities</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Roles You Could Land</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Here's a sample of what's hiring right now in Atlanta for AI engineers.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {featuredJobs.map((job, i) => {
            const salary = formatSalary(job.salary_min, job.salary_max);
            return (
              <FadeIn key={job.id} delay={i * 0.07}>
                <SpotlightCard className="h-full p-5 group" spotlightColor="rgba(16, 185, 129, 0.08)">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{job.company}</span>
                      </div>
                    </div>
                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="flex-shrink-0 h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {job.workplace_type && (
                      <Badge variant="outline" className={`text-[10px] ${getWorkplaceColor(job.workplace_type)}`}>
                        {job.workplace_type}
                      </Badge>
                    )}
                    {job.seniority && (
                      <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/50 text-muted-foreground">
                        {job.seniority}
                      </Badge>
                    )}
                    {salary && (
                      <span className="text-xs font-semibold text-emerald-400 ml-auto">{salary}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-2.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{job.location.split(" or ")[0]}</span>
                  </div>

                  {job.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.tech_stack.slice(0, 4).map(tool => (
                        <span key={tool} className="px-1.5 py-0.5 rounded text-[10px] bg-muted/50 border border-border/40 text-muted-foreground">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </SpotlightCard>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn>
          <div className="text-center">
            <Link to="/jobs">
              <Button variant="outline" className="gap-2">
                View all {totalJobs} open AI roles in Atlanta
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── Who it's for ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <SpotlightCard className="p-8 lg:p-12" spotlightColor="rgba(14, 165, 233, 0.1)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Who It's For</p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">Built for Builders Ready to Level Up</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Whether you're pivoting careers, leveling up from junior, or an experienced dev who wants to go AI-native — this program meets you where you are.
                </p>
                <Button onClick={scrollToApply} className="gap-2 bg-white text-black hover:bg-gray-100 border-0">
                  Apply for Cohort 1
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Career Switchers", desc: "Coming from a non-technical background and want to break into tech." },
                  { label: "Junior Developers", desc: "Have some coding experience and want to go deeper on AI and system design." },
                  { label: "Self-Taught Engineers", desc: "Built things on your own and want to fill in the enterprise-grade gaps." },
                  { label: "Experienced Devs", desc: "Already shipping code and want to rebuild your workflow around AI." },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </FadeIn>
      </section>

      {/* ── Apply, inline — the pitch and the form are one page ── */}
      <section id="apply" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl">
            {/* Gradient border */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 opacity-30" />
            <SpotlightCard className="relative p-10 lg:p-14 text-center" spotlightColor="rgba(14, 165, 233, 0.15)">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Cohort 1 — Limited Spots</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Apply for Cohort 1
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-2">
                Seats fill every cohort. Apply in two minutes — Kleveland calls every applicant personally, usually the same day.
              </p>
              <p className="text-xs text-muted-foreground mb-10">
                Tuition varies — Atlanta Builder Grants cover up to half, and a couple of full seats each cohort. It's all covered on your call.
              </p>
              <div className="text-left">
                <ApplyForm />
              </div>
            </SpotlightCard>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Atlantium. All rights reserved.</span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/policies" className="hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:team@atlantium.ai" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
