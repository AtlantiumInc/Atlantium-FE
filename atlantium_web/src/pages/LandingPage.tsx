import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { ConsolePanels } from "@/components/home/ConsolePanels";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import {
  Calendar,
  Briefcase,
  ArrowRight,
  Sparkles,
  Star,
  Video,
  Rocket,
  Mic,
  MessageSquare,
  CheckCircle2,
  Radio,
  Landmark,
} from "lucide-react";
import { motion, useAnimationFrame } from "motion/react";
import { useEffect, useRef, useState } from "react";
import jobsData from "@/data/jobs.json";
import { api } from "@/lib/api";


interface Event {
  id: string;
  title: string;
  description: string;
  event_type: "virtual" | "in_person" | "hybrid";
  start_time: number | string;
  end_time?: number | string;
  location: string;
  featured_image: string;
  going_count: number;
}

const FEATURED_EVENTS: Event[] = [
  {
    id: "frontier-office-hours",
    title: "Frontier Office Hours",
    description: "Live Q&A for builders shipping with AI.",
    event_type: "virtual",
    start_time: Date.now() + 1000 * 60 * 60 * 24 * 2,
    location: "Online",
    featured_image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&q=80",
    going_count: 42,
  },
  {
    id: "ai-builder-sprint",
    title: "AI Builder Sprint",
    description: "A focused session for shipping useful AI products.",
    event_type: "hybrid",
    start_time: Date.now() + 1000 * 60 * 60 * 24 * 6,
    location: "Atlantium Lab",
    featured_image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop&q=80",
    going_count: 28,
  },
  {
    id: "founder-signal-roundtable",
    title: "Founder Signal Roundtable",
    description: "A conversation on distribution, product, and taste.",
    event_type: "in_person",
    start_time: Date.now() + 1000 * 60 * 60 * 24 * 10,
    location: "San Francisco",
    featured_image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop&q=80",
    going_count: 19,
  },
];



function AutoScrollingJobsFeed({ onFreshCount }: { onFreshCount?: (n: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const fallbackJobs = jobsData as Array<{ id: string; title: string; company: string; seniority: string }>;
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; company: string; seniority: string }>>(fallbackJobs.slice(0, 12));

  useEffect(() => {
    api.getJobPostingsPaged({ status: "active", limit: 30 })
      .then((r) => {
        // freshest first, and skip anything the AI review has marked dead-but-flagged
        const live = r.jobs
          .filter((j) => !j.review?.status || ["open", "unreachable"].includes(j.review.status))
          .slice(0, 12)
          .map((j) => ({ id: j.id, title: j.title, company: j.company, seniority: j.seniority ?? "" }));
        if (live.length >= 3) setJobs(live);
        // Board-wide, not a count of the 30 rows fetched here.
        if (r.counts?.new_48h) onFreshCount?.(r.counts.new_48h);
      })
      .catch(() => { /* bundled fallback already showing */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimationFrame(() => {
    setScrollY((prev) => {
      const newY = prev + 0.1;
      // Reset when scrolled through one set of items
      const itemHeight = 52; // Approximate height of each item
      const totalHeight = jobs.length * itemHeight;
      return newY >= totalHeight ? 0 : newY;
    });
  });

  // Duplicate items for seamless loop
  const duplicatedJobs = [...jobs, ...jobs];

  return (
    <div className="relative h-full min-h-[180px] overflow-hidden rounded-lg bg-background/50 border border-border/50">
      {/* Gradient fade top */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/90 to-transparent z-10 pointer-events-none" />

      {/* Scrolling content */}
      <div
        ref={scrollRef}
        className="absolute w-full"
        style={{ transform: `translateY(-${scrollY}px)` }}
      >
        {duplicatedJobs.map((job, index) => (
          <div
            key={`${job.id}-${index}`}
            className="px-3 py-2.5 border-b border-border/30 flex items-start gap-2 hover:bg-cyan-500/5 transition-colors cursor-pointer group"
          >
            <span className="text-[10px] text-cyan-400 font-mono whitespace-nowrap pt-0.5 font-semibold flex-shrink-0">
              {job.seniority}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-tight line-clamp-1 group-hover:text-cyan-400 transition-colors">
                {job.title}
              </p>
              <span className="text-[9px] text-muted-foreground">{job.company}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Gradient fade bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent z-10 pointer-events-none" />
    </div>
  );
}

function EventsMarquee() {
  const [events] = useState<Event[]>(FEATURED_EVENTS);
  const [isLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useAnimationFrame(() => {
    if (isPaused || events.length === 0) return;
    setScrollX((prev) => {
      const newX = prev + 0.8;
      const cardWidth = 280;
      const totalWidth = events.length * cardWidth;
      return newX >= totalWidth ? 0 : newX;
    });
  });

  const parseEventDate = (timestamp: number | string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  const formatDate = (timestamp: number | string) => {
    const date = parseEventDate(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (timestamp: number | string) => {
    const date = parseEventDate(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "virtual": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "in_person": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "hybrid": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading events...</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No upcoming events
      </div>
    );
  }

  const duplicatedEvents = [...events, ...events];

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gradient fade left */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />

      {/* Scrolling content */}
      <div
        ref={scrollRef}
        className="flex gap-4 py-2"
        style={{ transform: `translateX(-${scrollX}px)` }}
      >
        {duplicatedEvents.map((event, index) => (
          <motion.div
            key={`${event.id}-${index}`}
            className="flex-shrink-0 w-[260px] rounded-xl overflow-hidden bg-background/60 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            {/* Event image */}
            <div className="relative h-24 overflow-hidden">
              <img
                src={event.featured_image}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className={`absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full border ${getEventTypeColor(event.event_type)}`}>
                {event.event_type.replace("_", " ")}
              </span>
            </div>

            {/* Event details */}
            <div className="p-3">
              <h4 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
                {event.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(event.start_time)} • {formatTime(event.start_time)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {event.location}
                </span>
                <span className="text-xs text-primary font-medium">
                  {event.going_count} going
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gradient fade right */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
    </div>
  );
}

function FocusGroupsCard() {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="col-span-12 lg:col-span-4 row-span-2"
    >
      <SpotlightCard
        className="h-full p-6 flex flex-col"
        spotlightColor="rgba(139, 92, 246, 0.12)"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Focus Groups</h3>
            <p className="text-xs text-muted-foreground">AI-matched 2-week cohorts</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Get matched with 6 builders based on your goals and skill level. Ship real projects together, get expert guidance, and build lasting connections.
        </p>

        <div className="space-y-3 flex-1">
          {[
            { icon: Sparkles, label: "AI Matching", desc: "Paired by skills, goals & availability", color: "violet" },
            { icon: Rocket, label: "Project-Based", desc: "Ship something real in 2 weeks", color: "blue" },
            { icon: Star, label: "Expert Guidance", desc: "Weekly check-ins with mentors", color: "amber" },
            { icon: MessageSquare, label: "Private Channel", desc: "Dedicated group chat & workspace", color: "emerald" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={`h-8 w-8 flex-shrink-0 rounded-lg bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center`}>
                <item.icon className={`h-4 w-4 text-${item.color}-500`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <Link to="/focus-groups" className="block">
            <Button size="sm" variant="outline" className="w-full gap-2 border-violet-500/30 bg-transparent text-violet-400 hover:bg-violet-500/10 hover:text-violet-400 dark:bg-transparent dark:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-300">
              Join a Group
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function LandingPage() {
  const [freshJobCount, setFreshJobCount] = useState(0);
  // Live counts for The Network card — the numbers ARE the pitch, so they come
  // from the same API the directory itself reads, never hardcoded.
  const [networkCounts, setNetworkCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.getDirectory({ limit: 1 })
      .then((r) => setNetworkCounts(r.counts ?? {}))
      .catch(() => { /* the card shows em-dashes until the numbers arrive */ });
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0 opacity-30 dark:opacity-50">
        <Aurora
          colorStops={["#64748b", "#3b82f6", "#0ea5e9"]}
          amplitude={1.0}
          blend={0.6}
          speed={0.4}
        />
      </div>

      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <PublicNavbar />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-3 lg:gap-5 auto-rows-[minmax(100px,auto)]">

          {/* Hero Card - Large */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="col-span-12 lg:col-span-8 row-span-3"
          >
            <SpotlightCard
              className="h-full p-8 lg:p-12 grid place-items-center"
              spotlightColor="rgba(99, 102, 241, 0.12)"
            >
              <div className="w-full max-w-xl text-center">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mb-8"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Citizen Technology Network
                  </span>
                </motion.div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] mb-5">
                  {/* Narrow white glint over solid type — a pass of light,
                      not a color gradient; long rest between sweeps */}
                  <ShinyText text="Your Path to" className="block" color="#eef2f8" shineColor="#ffffff" spread={36} speed={2.2} delay={4.5} />
                  <ShinyText text="the Frontier" className="block" color="#eef2f8" shineColor="#ffffff" spread={36} speed={2.2} delay={4.5} />
                </h1>

                {/* Subhead */}
                <p className="text-muted-foreground text-lg mb-8 mx-auto">
                  Atlanta's premier technology network — where the city's sharpest technologists connect, get hired, and level up.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  <Link to="/signup">
                    <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                      Join Network
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/services">
                    <Button variant="outline" size="lg" className="gap-2">
                      Explore Services
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Social proof */}
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Live jobs widget — real feed with the 48h pulse pill; replaced
              a testimonial from a member who did not exist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-3"
          >
            <SpotlightCard
              className="h-full p-5 flex flex-col"
              spotlightColor="rgba(6, 182, 212, 0.12)"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Tech Job Postings</h3>
                      {freshJobCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                          {freshJobCount} new · 48h
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Latest opportunities in tech</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <AutoScrollingJobsFeed onFreshCount={setFreshJobCount} />
              </div>

              <Link to="/jobs" className="block mt-4">
                <Button size="sm" variant="outline" className="w-full gap-2 border-cyan-500/30 bg-transparent text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400 dark:bg-transparent dark:border-cyan-500/30 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300">
                  Open Board
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </SpotlightCard>
          </motion.div>

          {/* The Console — the network's live instruments, one cached call,
              every number real (see ConsolePanels). */}
          <div className="col-span-12">
            <ConsolePanels />
          </div>

          {/* Events Card - Expanded with Marquee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="col-span-12 lg:col-span-6 row-span-2"
          >
            <SpotlightCard
              className="h-full p-5"
              spotlightColor="rgba(99, 179, 237, 0.15)"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Upcoming Events</h3>
                    <p className="text-xs text-muted-foreground">Weekly meetups with builders & investors</p>
                  </div>
                </div>
                              </div>

              {/* Auto-scrolling events marquee */}
              <EventsMarquee />
            </SpotlightCard>
          </motion.div>

          {/* Training Card with Visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="col-span-12 row-span-2"
          >
            <SpotlightCard
              className="h-full overflow-hidden"
              spotlightColor="rgba(139, 92, 246, 0.15)"
            >
              <div className="flex flex-col lg:flex-row h-full">
                {/* Image Section - Left Side */}
                <div className="relative w-full lg:w-2/5 h-64 lg:h-auto overflow-hidden bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-violet-500/20">
                  <img
                    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=500&fit=crop"
                    alt="AI Engineering Training"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />

                  {/* Badge overlay */}
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/40 border border-violet-500/60 backdrop-blur-sm">
                      <span className="h-2 w-2 rounded-full bg-violet-300 animate-pulse" />
                      <span className="text-xs font-semibold text-violet-200">Now Enrolling</span>
                    </span>
                  </div>
                </div>

                {/* Content Section - Right Side */}
                <div className="p-6 lg:p-8 flex flex-col flex-1 justify-between">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-foreground mb-1">AI Engineering Bootcamp</h3>
                    <p className="text-sm text-muted-foreground">Go from learner to job-ready in 8 weeks</p>
                  </div>

                  {/* Key Stats - Horizontal Row */}
                  <div className="flex gap-4 mb-6 pb-6 border-b border-border/30">
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-violet-400 mb-0.5">8</div>
                      <p className="text-xs text-muted-foreground">weeks</p>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-violet-400 mb-0.5">Daily</div>
                      <p className="text-xs text-muted-foreground">office hours</p>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-violet-400 mb-0.5">100%</div>
                      <p className="text-xs text-muted-foreground">hands-on</p>
                    </div>
                  </div>

                  {/* Features List - 2 Column Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                    {[
                      "Build real-world AI apps",
                      "Production frameworks",
                      "Hiring partner intros",
                      "Portfolio + guidance"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/training" className="block">
                    <Button size="lg" className="w-full gap-2 bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 font-medium">
                      Explore Program
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* The Network — the directory is the aristocracy, and the door is open */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.30, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6 flex flex-col"
              spotlightColor="rgba(139, 92, 246, 0.15)"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">The Network</h3>
                  <p className="text-xs text-muted-foreground">Atlanta's capital map — open to all</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                The rooms that used to require an introduction. Every investor
                writing checks in the Southeast, every accelerator, every company
                hiring — profiled, verified, and free to browse.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5 flex-1">
                {[
                  { n: networkCounts.investor ?? 0, label: "Investors" },
                  { n: networkCounts.resource ?? 0, label: "Accelerators & programs" },
                  { n: networkCounts.company ?? 0, label: "Companies hiring" },
                  { n: networkCounts.grant ?? 0, label: "Grants & credits" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border/40 bg-background/40 px-4 py-3 flex flex-col justify-center"
                  >
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                      {stat.n > 0 ? stat.n : "—"}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <Link to="/directory" className="mt-5">
                <Button variant="outline" className="w-full gap-2 border-violet-500/40 text-violet-300 hover:bg-violet-500/10">
                  Enter the Directory
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </SpotlightCard>
          </motion.div>

          {/* Club Card - The Lobby */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-5 flex flex-col"
              spotlightColor="rgba(0, 212, 255, 0.15)"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">The Lobby</h3>
                    <p className="text-xs text-muted-foreground">Live with 12 builders now</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex-shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400">Live</span>
                </div>
              </div>

              {/* Room Visual */}
              <div className="relative rounded-xl bg-slate-950/80 border border-cyan-500/20 overflow-hidden mb-4 flex-1" style={{ minHeight: "140px" }}>
                {/* Grid floor */}
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }} />
                {/* Ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl" />

                {/* People grid */}
                <div className="absolute inset-0 p-3 grid grid-cols-2 gap-2">
                  {/* Active speaker */}
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center ring-2 ring-cyan-400/50">
                        <span className="text-xs font-bold text-white">KL</span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Mic className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    {/* Waveform */}
                    <div className="flex items-center gap-px h-4">
                      {[0.5, 0.9, 0.6, 1.0, 0.7, 0.85, 0.55, 0.95, 0.65].map((scale, i) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-cyan-400 rounded-full"
                          style={{ height: "12px" }}
                          animate={{ scaleY: [scale, scale * 0.3, scale * 1.1, scale * 0.5, scale] }}
                          transition={{
                            duration: 0.6 + i * 0.07,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.08,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Other attendees */}
                  {[
                    { name: "AR", gradient: "from-violet-500 to-purple-600" },
                    { name: "JM", gradient: "from-emerald-500 to-teal-600" },
                    { name: "SC", gradient: "from-amber-500 to-orange-600" },
                  ].map(({ name, gradient }) => (
                    <div key={name} className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/10 p-2">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <span className="text-xs font-bold text-white">{name}</span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
                      </div>
                      <span className="text-[9px] text-muted-foreground/70">Present</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                A live digital space where members connect through audio, video, and chat in real time.
              </p>

              {/* Features */}
              <div className="flex gap-2 mb-4">
                {[
                  { icon: Mic, label: "Audio" },
                  { icon: Video, label: "Video" },
                  { icon: MessageSquare, label: "Chat" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                    <Icon className="h-3 w-3 text-cyan-400" />
                    <span className="text-xs text-cyan-300">{label}</span>
                  </div>
                ))}
              </div>

              <Link to="/signup" className="block">
                <Button size="sm" variant="outline" className="w-full gap-1.5 border-cyan-500/30 bg-transparent text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400 dark:bg-transparent dark:border-cyan-500/30 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300">
                  Enter Lobby
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </SpotlightCard>
          </motion.div>

          {/* Focus Groups Card */}
          <FocusGroupsCard />

          {/* CTA Card - Full width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="col-span-12 row-span-1"
          >
            <SpotlightCard
              className="p-6 lg:p-8"
              spotlightColor="rgba(99, 102, 241, 0.1)"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Ready to join the frontier?</h3>
                  <p className="text-muted-foreground">Join an AI-matched focus group and start building with us today.</p>
                </div>
                <div className="flex gap-3">
                  <Link to="/signup">
                    <Button className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                      Join Network
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="mailto:team@atlantium.ai">
                    <Button variant="ghost" className="gap-2">
                      Contact
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-border/30 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Atlantium. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a href="mailto:team@atlantium.ai" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
