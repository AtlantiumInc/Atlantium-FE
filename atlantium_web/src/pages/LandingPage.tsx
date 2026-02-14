import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import {
  Calendar,
  Newspaper,
  Briefcase,
  ArrowRight,
  Sparkles,
  Quote,
  Star,
  Zap,
  Video,
  ChevronLeft,
  ChevronRight,
  Code,
  Rocket,
  Mic,
  Radio,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { motion, useAnimationFrame } from "motion/react";
import { useRef, useState, useEffect } from "react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/atlantium-the-frontier/id6757367750";

const EVENTS_API_URL =
  "https://cloud.atlantium.ai/api:-ulnKZsX/events/public";

const ARTICLES_API_URL =
  "https://cloud.atlantium.ai/api:-ulnKZsX/frontier/public";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: "virtual" | "in_person" | "hybrid";
  start_time: number;
  end_time: number;
  location: string;
  featured_image: string;
  going_count: number;
}

interface Article {
  id: number;
  slug: string;
  created_at: number;
  content: {
    title: string;
    body: string;
    tldr?: string[];
    tags?: string[];
  };
}

const feedItems = [
  { time: "2m", title: "OpenAI releases GPT-5 with reasoning capabilities", tag: "Breaking" },
  { time: "15m", title: "Anthropic raises $4B at $60B valuation", tag: "Funding" },
  { time: "32m", title: "Apple integrates on-device AI across iOS 19", tag: "Product" },
  { time: "1h", title: "New robotics startup demos humanoid warehouse workers", tag: "Robotics" },
  { time: "2h", title: "EU passes comprehensive AI regulation framework", tag: "Policy" },
  { time: "3h", title: "Meta open-sources new 400B parameter model", tag: "Open Source" },
  { time: "4h", title: "Nvidia stock surges on datacenter demand", tag: "Markets" },
  { time: "5h", title: "DeepMind achieves breakthrough in protein design", tag: "Research" },
];

const focusGroups = [
  {
    topic: "Generative Media",
    description:
      "Master AI-powered content creation. Learn to produce stunning visuals, video, and audio using cutting-edge generative tools and workflows.",
    spotsTotal: 7,
    spotsFilled: 4,
    icon: Sparkles,
    color: {
      spotlight: "rgba(139, 92, 246, 0.15)",
      bg: "from-violet-500/10 via-purple-500/5 to-transparent",
      accent: "text-violet-400",
      iconBg: "from-violet-500/20 to-purple-500/10",
      iconBorder: "border-violet-500/20",
      badge: "bg-violet-500/20 border-violet-500/30 text-violet-400",
    },
    members: [
      { initials: "AK", color: "from-violet-500 to-purple-600" },
      { initials: "JM", color: "from-blue-500 to-cyan-500" },
      { initials: "SL", color: "from-emerald-500 to-teal-500" },
      { initials: "CR", color: "from-amber-500 to-orange-500" },
    ],
  },
  {
    topic: "Agentic Programming",
    description:
      "Build autonomous AI agents that reason, plan, and execute. Learn to architect multi-agent systems and ship production-ready agentic applications.",
    spotsTotal: 7,
    spotsFilled: 5,
    icon: Code,
    color: {
      spotlight: "rgba(59, 130, 246, 0.15)",
      bg: "from-blue-500/10 via-cyan-500/5 to-transparent",
      accent: "text-blue-400",
      iconBg: "from-blue-500/20 to-cyan-500/10",
      iconBorder: "border-blue-500/20",
      badge: "bg-blue-500/20 border-blue-500/30 text-blue-400",
    },
    members: [
      { initials: "MT", color: "from-pink-500 to-rose-500" },
      { initials: "RB", color: "from-indigo-500 to-violet-500" },
      { initials: "DW", color: "from-cyan-500 to-blue-500" },
      { initials: "JP", color: "from-fuchsia-500 to-pink-500" },
      { initials: "KL", color: "from-emerald-500 to-green-500" },
    ],
  },
  {
    topic: "Go-To-Market Engineering",
    description:
      "Bridge the gap between product and growth. Learn to build landing pages, automate funnels, and ship GTM infrastructure that converts.",
    spotsTotal: 7,
    spotsFilled: 3,
    icon: Rocket,
    color: {
      spotlight: "rgba(16, 185, 129, 0.15)",
      bg: "from-emerald-500/10 via-teal-500/5 to-transparent",
      accent: "text-emerald-400",
      iconBg: "from-emerald-500/20 to-teal-500/10",
      iconBorder: "border-emerald-500/20",
      badge: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
    },
    members: [
      { initials: "PS", color: "from-violet-500 to-indigo-500" },
      { initials: "TN", color: "from-amber-500 to-yellow-500" },
      { initials: "LR", color: "from-blue-500 to-indigo-500" },
    ],
  },
];


function LatestArticleBanner() {
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    fetch(ARTICLES_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Article[]) => {
        if (data && data.length > 0) {
          const valid = data.filter(a => a.content != null);
          const sorted = [...valid].sort((a, b) => b.created_at - a.created_at);
          if (sorted.length > 0) setArticle(sorted[0]);
        }
      })
      .catch(() => {
        // Fallback will show automatically when article is null
      });
  }, []);

  const timeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <Link
      to={article?.slug ? `/index/${article.slug}` : "/index"}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all group max-w-md"
    >
      {/* Blinking indicator */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex-shrink-0">
        {article ? "Latest" : "New"}
      </span>
      <span className="text-xs text-foreground font-medium truncate group-hover:text-amber-500 transition-colors">
        {article ? article.content.title : "Explore Atlantium Index"}
      </span>
      {article && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
          {timeAgo(article.created_at)}
        </span>
      )}
      <ArrowRight className="h-3 w-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </Link>
  );
}


function EventsMarquee() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetch(EVENTS_API_URL)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useAnimationFrame(() => {
    if (isPaused || events.length === 0) return;
    setScrollX((prev) => {
      const newX = prev + 0.8;
      const cardWidth = 280;
      const totalWidth = events.length * cardWidth;
      return newX >= totalWidth ? 0 : newX;
    });
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
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

function AutoScrollFeed() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useAnimationFrame(() => {
    setScrollY((prev) => {
      const newY = prev + 0.5;
      // Reset when scrolled through one set of items
      const itemHeight = 64; // Approximate height of each item
      const totalHeight = feedItems.length * itemHeight;
      return newY >= totalHeight ? 0 : newY;
    });
  });

  // Duplicate items for seamless loop
  const duplicatedItems = [...feedItems, ...feedItems];

  return (
    <div className="relative h-[180px] overflow-hidden rounded-lg bg-background/50 border border-border/50">
      {/* Gradient fade top */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/90 to-transparent z-10 pointer-events-none" />

      {/* Scrolling content */}
      <div
        ref={scrollRef}
        className="absolute w-full"
        style={{ transform: `translateY(-${scrollY}px)` }}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={index}
            className="px-4 py-3 border-b border-border/30 flex items-start gap-3 hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap pt-0.5">
              {item.time}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-tight line-clamp-2">
                {item.title}
              </p>
              <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {item.tag}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gradient fade bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent z-10 pointer-events-none" />
    </div>
  );
}

function FocusGroupsCard() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % focusGroups.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + focusGroups.length) % focusGroups.length);
  };

  const group = focusGroups[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="col-span-12 row-span-2"
    >
      <SpotlightCard
        className="h-full p-6 lg:p-8"
        spotlightColor="rgba(139, 92, 246, 0.12)"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Focus Groups</h3>
              <p className="text-xs text-muted-foreground">AI-powered collaboration cohorts</p>
            </div>
          </div>
          <Link to="/focus-groups">
            <Button variant="outline" size="sm" className="gap-2">
              Learn more
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Left - Description */}
          <div className="flex-1 flex flex-col justify-center">
            <h4 className="text-xl font-bold text-foreground mb-3">2-Week Intensive Collaborations</h4>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Our AI matches you with 6 members you'll work well with, led by an experienced guide. Build meaningful connections and ship together.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-violet-400" />
                AI-matched members
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4 text-violet-400" />
                Expert group lead
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Monthly topics
              </div>
            </div>
          </div>

          {/* Right - Carousel */}
          <div className="flex-1 max-w-sm lg:max-w-md">
            {/* Live indicator */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground">Live on Atlantium</span>
            </div>
            {/* Card */}
            <Link to="/focus-groups" className="block group">
              <div className={`relative p-5 rounded-xl overflow-hidden bg-gradient-to-br ${group.color.bg} border ${group.color.iconBorder}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${group.color.iconBg} border ${group.color.iconBorder} flex items-center justify-center`}>
                    <group.icon className={`h-4 w-4 ${group.color.accent}`} />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${group.color.badge}`}>
                    <Zap className="h-3 w-3" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      AI-Matched
                    </span>
                  </span>
                </div>

                {/* Content */}
                <h4 className="text-base font-bold text-foreground mb-1">
                  {group.topic}
                </h4>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                  {group.description}
                </p>

                {/* Members + Progress inline */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {group.members.slice(0, 4).map((member, i) => (
                        <div
                          key={i}
                          className={`h-6 w-6 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-background`}
                        >
                          {member.initials}
                        </div>
                      ))}
                      {group.members.length > 4 && (
                        <div className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-[8px] font-bold ring-2 ring-background">
                          +{group.members.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {group.spotsFilled}/{group.spotsTotal}
                    </span>
                  </div>
                  <span className={`text-[10px] ${group.color.accent}`}>
                    {group.spotsTotal - group.spotsFilled} spots left
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${group.color.iconBg.replace('/20', '').replace('/10', '')} transition-all`}
                    style={{ width: `${(group.spotsFilled / group.spotsTotal) * 100}%` }}
                  />
                </div>
              </div>
            </Link>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  goPrev();
                }}
                className="flex items-center justify-center h-7 w-7 rounded-full bg-card/80 border border-border/50 hover:border-violet-500/30 hover:bg-card transition-all"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {focusGroups.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentIndex
                        ? `w-4 ${i === 0 ? "bg-violet-500" : i === 1 ? "bg-blue-500" : "bg-emerald-500"}`
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                className="flex items-center justify-center h-7 w-7 rounded-full bg-card/80 border border-border/50 hover:border-violet-500/30 hover:bg-card transition-all"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function LandingPage() {
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
      <PublicNavbar center={<LatestArticleBanner />} />

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
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <ShinyText
                    text="Free on iOS"
                    className="text-xs font-medium uppercase tracking-wider"
                    color="#00d4ff"
                    shineColor="#ffffff"
                    speed={3}
                  />
                </motion.div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] mb-5">
                  <span className="text-foreground">Your Path to</span>
                  <br />
                  <span className="text-foreground">
                    the Frontier
                  </span>
                </h1>

                {/* Subhead */}
                <p className="text-muted-foreground text-lg mb-8 mx-auto">
                  Where builders get the intel, connections, and tools to ship what's next.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                      <img src="/apple-logo.svg" alt="Apple" className="h-5 w-auto" />
                      Download for iOS
                    </Button>
                  </a>
                  <Link to="/services">
                    <Button variant="outline" size="lg" className="gap-2">
                      Explore Services
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mb-10">
                  <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    or <span className="underline underline-offset-4">sign up on web</span>
                  </Link>
                </div>

                {/* Social proof */}
                <div className="flex flex-wrap justify-center items-center gap-4 pt-6 border-t border-border/30">
                  {/* Stacked avatars */}
                  <div className="flex -space-x-2">
                    {[
                      "from-slate-500 to-blue-600",
                      "from-blue-500 to-cyan-500",
                      "from-emerald-500 to-teal-500",
                      "from-amber-500 to-orange-500",
                    ].map((gradient, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                        className={`relative h-8 w-8 rounded-full bg-gradient-to-br ${gradient} ring-2 ring-background flex items-center justify-center text-white text-[10px] font-bold`}
                        style={{ zIndex: 5 - i }}
                      >
                        {["KL", "AR", "JM", "SC"][i]}
                      </motion.div>
                    ))}
                  </div>

                  <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">500+</span> builders shipping
                  </span>

                  <span className="text-muted-foreground/50">•</span>

                  {/* Live indicator */}
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-sm text-emerald-500 font-medium">12 online</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Testimonial Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-3"
          >
            <div className="relative h-full group">
              {/* Animated gradient border */}
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-slate-500 via-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-slate-500 via-blue-500 to-cyan-500 opacity-20 group-hover:opacity-40 transition-opacity duration-500" />

              <SpotlightCard
                className="relative h-full p-6 flex flex-col justify-center overflow-hidden"
                spotlightColor="rgba(59, 130, 246, 0.15)"
              >
                {/* Large decorative quote */}
                <div className="absolute -top-4 -right-4 opacity-[0.07]">
                  <Quote className="h-32 w-32 text-blue-500" strokeWidth={1} />
                </div>

                <div className="relative z-10">
                  {/* 5 stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                      >
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-lg font-medium text-foreground leading-relaxed mb-6">
                    "The Frontier Feed had me building with Claude Code the day it dropped. While competitors were still copy and pasting,
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-semibold"> I shipped features they couldn't match for months.</span>"
                  </blockquote>
                </div>

                {/* Author */}
                <div className="relative z-10 flex items-center gap-4 pt-4 border-t border-border/30">
                  {/* Avatar with glow */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-500 to-blue-500 blur-md opacity-50" />
                    <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-slate-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-background">
                      MR
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      Marcus Rivera
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-500">Verified</span>
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">CTO, Synth Labs</div>
                    <div className="text-xs text-muted-foreground/70">AI-native startup • YC W24</div>
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </motion.div>

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

          {/* Frontier Feed Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="col-span-12 lg:col-span-6 row-span-2"
          >
            <SpotlightCard
              className="h-full p-5"
              spotlightColor="rgba(129, 140, 248, 0.12)"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Newspaper className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Frontier Feed</h3>
                    <p className="text-xs text-muted-foreground">Live AI news • Updated every hour</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  <span className="text-[10px] font-medium text-green-500 uppercase tracking-wider">Live</span>
                </div>
              </div>

              {/* Auto-scrolling feed */}
              <AutoScrollFeed />
            </SpotlightCard>
          </motion.div>

          {/* Services Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6 flex flex-col"
              spotlightColor="rgba(167, 139, 250, 0.15)"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Services</h3>
              </div>

              <div className="space-y-3 flex-1">
                {[
                  { icon: Code, label: "Development", desc: "MVPs & enterprise software", color: "blue" },
                  { icon: Lightbulb, label: "GTM Strategy", desc: "Go-to-market playbooks", color: "amber" },
                  { icon: Sparkles, label: "Generative Media", desc: "AI video, audio & content", color: "emerald" },
                  { icon: MessageSquare, label: "Tech Advisor", desc: "Fractional CTO & AI strategy", color: "violet" },
                ].map((svc) => (
                  <div key={svc.label} className="flex items-center gap-3">
                    <div className={`h-8 w-8 flex-shrink-0 rounded-lg bg-${svc.color}-500/10 border border-${svc.color}-500/20 flex items-center justify-center`}>
                      <svc.icon className={`h-4 w-4 text-${svc.color}-500`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{svc.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{svc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/services" className="mt-4 pt-4 border-t border-border/50 block">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  Explore Services
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </SpotlightCard>
          </motion.div>

          {/* Office Hours Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.30, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6 overflow-hidden"
              spotlightColor="rgba(245, 158, 11, 0.15)"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Video className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Office Hours</h3>
                  <p className="text-xs text-muted-foreground">Weekly live sessions with experts</p>
                </div>
              </div>
              {/* GIF Container */}
              <div className="relative rounded-lg overflow-hidden bg-muted/30 border border-border/50">
                <img
                  src="https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif"
                  alt="Office Hours"
                  className="w-full h-32 object-cover"
                />
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Club Card - The Lobby */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-2"
          >
            <div className="relative h-full group">
              {/* Animated gradient border */}
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 opacity-30 group-hover:opacity-60 blur-sm transition-opacity duration-500" />
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 opacity-20 group-hover:opacity-40 transition-opacity duration-500" />

              <SpotlightCard
                className="relative h-full p-6"
                spotlightColor="rgba(0, 212, 255, 0.15)"
              >
                {/* Live badge */}
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
                  </span>
                </div>

                <div className="mb-5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                    <Radio className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">Club Membership</div>
                  <h3 className="text-xl font-bold text-foreground mb-1">The Lobby</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A live digital space where members connect through audio, video, and chat in real time.
                  </p>
                </div>

                {/* Mini lobby visualization */}
                <div className="relative rounded-lg bg-background/30 border border-border/30 p-3 mb-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex -space-x-1.5">
                      {[
                        "from-cyan-500 to-blue-500",
                        "from-violet-500 to-purple-500",
                        "from-emerald-500 to-teal-500",
                        "from-amber-500 to-orange-500",
                      ].map((gradient, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                          className={`h-6 w-6 rounded-full bg-gradient-to-br ${gradient} ring-2 ring-background flex items-center justify-center`}
                        >
                          <span className="text-[7px] font-bold text-white">
                            {["KL", "AR", "JM", "SC"][i]}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10">
                        <Mic className="h-2.5 w-2.5 text-cyan-400" />
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10">
                        <Video className="h-2.5 w-2.5 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                  {/* Simulated chat line */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                    <span className="font-medium text-cyan-400/70">KL:</span>
                    <span className="truncate">just shipped the new API endpoint...</span>
                  </div>
                </div>

                <Link to="/signup">
                  <Button size="sm" variant="outline" className="w-full gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                    Enter Lobby
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </SpotlightCard>
            </div>
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
                  <p className="text-muted-foreground">Download the app and start building with us today.</p>
                </div>
                <div className="flex flex-col items-center md:items-end gap-2">
                  <div className="flex gap-3">
                    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                      <Button className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                        <img src="/apple-logo.svg" alt="Apple" className="h-4 w-auto" />
                        Get the App
                      </Button>
                    </a>
                    <a href="mailto:team@atlantium.ai">
                      <Button variant="ghost" className="gap-2">
                        Contact
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                  <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    or <span className="underline underline-offset-4">sign up on web</span>
                  </Link>
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
