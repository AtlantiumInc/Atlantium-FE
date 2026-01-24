import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import SpotlightCard from "@/components/ui/SpotlightCard";
import CountUp from "@/components/ui/CountUp";
import Aurora from "@/components/Aurora";
import {
  Calendar,
  Newspaper,
  Briefcase,
  Users,
  Apple,
  ArrowRight,
  Sparkles,
  Quote,
  Star,
} from "lucide-react";
import { motion, useAnimationFrame } from "motion/react";
import { useRef, useState, useEffect } from "react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/atlantium-the-frontier/id6757367750";

const EVENTS_API_URL =
  "https://cloud.atlantium.ai/api:-ulnKZsX/events/public";

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
      <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <span className="text-xl font-bold tracking-tight">Atlantium</span>
            <p className="text-[10px] text-muted-foreground tracking-wide">your path to the frontier</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <ThemeToggle />
            <Link to="/services">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Services
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-2 bg-white text-black hover:bg-gray-100 border-0">
                <Apple className="h-4 w-4 fill-current" />
                Get App
              </Button>
            </a>
          </motion.div>
        </div>
      </nav>

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
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">Now on iOS</span>
                </motion.div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] mb-5">
                  <span className="text-foreground">Welcome to</span>
                  <br />
                  <span className="bg-gradient-to-r from-slate-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                    The Future
                  </span>
                </h1>

                {/* Subhead */}
                <p className="text-muted-foreground text-lg mb-8 mx-auto">
                  Curated AI/tech news. Exclusive events. A network that ships.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                      <Apple className="h-5 w-5 fill-current" />
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
                    <h3 className="text-lg font-bold text-foreground">Upcoming Events</h3>
                    <p className="text-xs text-muted-foreground">Weekly meetups with builders & investors</p>
                  </div>
                </div>
                <Link to="/events">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
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
                    <h3 className="text-lg font-bold text-foreground">Frontier Feed</h3>
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
            transition={{ delay: 0.3, duration: 0.6 }}
            className="col-span-6 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6"
              spotlightColor="rgba(167, 139, 250, 0.15)"
            >
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <Briefcase className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Services</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ship faster with dev support, GTM strategy, and warm intros.
              </p>
              <Link to="/services">
                <Button variant="outline" size="sm" className="gap-2">
                  Learn more
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </SpotlightCard>
          </motion.div>

          {/* Club Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="col-span-6 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6 flex flex-col justify-between"
              spotlightColor="rgba(139, 92, 246, 0.15)"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-sm text-muted-foreground mb-1">Club Membership</div>
                <div className="text-3xl font-bold text-foreground">
                  <CountUp to={49} duration={2} prefix="$" suffix="/mo" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Exclusive events, member directory, priority access.
              </p>
            </SpotlightCard>
          </motion.div>

          {/* Community Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="col-span-6 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6"
              spotlightColor="rgba(147, 197, 253, 0.15)"
            >
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-sky-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Network</h3>
              <p className="text-sm text-muted-foreground">
                Connect with builders, investors, and operators who ship.
              </p>
            </SpotlightCard>
          </motion.div>

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
                <div className="flex gap-3">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                    <Button className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                      <Apple className="h-4 w-4 fill-current" />
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
