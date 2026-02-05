import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import Aurora from "@/components/Aurora";
import {
  ArrowRight,
  Sparkles,
  Users,
  Clock,
  Zap,
  Rocket,
  Globe,
  Code,
  Radio,
  Video,
  Mic,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, useInView, useAnimationFrame, AnimatePresence } from "motion/react";

// ── FadeInSection (same pattern as MissionPage) ─────────────────────────────
function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Focus Group Carousel ────────────────────────────────────────────────────

function FocusGroupCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % focusGroups.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + focusGroups.length) % focusGroups.length);
  };

  const group = focusGroups[currentIndex];

  return (
    <div className="relative">
      {/* Card */}
      <Link to="/signup" className="block group">
        <SpotlightCard
          className="p-6 overflow-hidden relative"
          spotlightColor={group.color.spotlight}
        >
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${group.color.bg} pointer-events-none`} />

          <div className="relative">
          {/* AI-Matched badge */}
          <div className="flex items-center justify-between mb-4">
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${group.color.iconBg} border ${group.color.iconBorder} flex items-center justify-center`}>
              <group.icon className={`h-6 w-6 ${group.color.accent}`} />
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${group.color.badge}`}>
              <Zap className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                AI-Matched
              </span>
            </span>
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-foreground mb-2">
            {group.topic}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {group.description}
          </p>

          {/* Members waiting */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-2">
              {group.members.map((member, i) => (
                <div
                  key={i}
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-background`}
                >
                  {member.initials}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {group.members.length} waiting
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Filling up...</span>
              <span className={group.color.accent}>
                <span className="font-semibold">{group.spotsFilled}</span>
                <span className="text-muted-foreground">/{group.spotsTotal} joined</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${group.color.iconBg.replace('/20', '').replace('/10', '')} transition-all`}
                style={{ width: `${(group.spotsFilled / group.spotsTotal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Starts when full • {group.spotsTotal - group.spotsFilled} spots left
            </p>
          </div>

          {/* Hover indicator */}
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
            <span className={`text-sm text-muted-foreground group-hover:text-foreground transition-colors`}>
              Get matched
            </span>
            <ArrowRight className={`h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ${group.color.accent}`} />
          </div>
          </div>
        </SpotlightCard>
      </Link>

      {/* Navigation Arrows */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            goPrev();
          }}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-card/80 border border-border/50 hover:border-violet-500/30 hover:bg-card transition-all"
        >
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Dots indicator */}
        <div className="flex items-center gap-2">
          {focusGroups.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                setCurrentIndex(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex
                  ? `w-6 ${i === 0 ? "bg-violet-500" : i === 1 ? "bg-blue-500" : "bg-emerald-500"}`
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            goNext();
          }}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-card/80 border border-border/50 hover:border-violet-500/30 hover:bg-card transition-all"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Total spots */}
      <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
        <Zap className="h-4 w-4 text-emerald-400" />
        <span>
          Groups launch when full • <span className="font-semibold text-emerald-400">Be the one to fill it</span>
        </span>
      </div>
    </div>
  );
}

// ── Lobby Avatars (hardcoded for preview) ───────────────────────────────────

const lobbyAvatars = [
  { id: 1, name: "Alex Kim", initials: "AK", color: "from-violet-500 to-purple-600", x: 15, y: 25, role: "Product Designer", location: "Atlanta, GA" },
  { id: 2, name: "Jordan Miller", initials: "JM", color: "from-blue-500 to-cyan-500", x: 72, y: 18, role: "Startup Founder", location: "Decatur, GA" },
  { id: 3, name: "Sam Lee", initials: "SL", color: "from-emerald-500 to-teal-500", x: 45, y: 65, role: "Software Engineer", location: "Marietta, GA" },
  { id: 4, name: "Casey Rivera", initials: "CR", color: "from-amber-500 to-orange-500", x: 82, y: 55, role: "UX Researcher", location: "Buckhead, GA" },
  { id: 5, name: "Morgan Taylor", initials: "MT", color: "from-pink-500 to-rose-500", x: 28, y: 72, role: "Data Scientist", location: "Midtown, GA" },
  { id: 6, name: "Riley Brooks", initials: "RB", color: "from-indigo-500 to-violet-500", x: 58, y: 35, role: "DevOps Engineer", location: "Sandy Springs, GA" },
  { id: 7, name: "Drew Wilson", initials: "DW", color: "from-cyan-500 to-blue-500", x: 88, y: 78, role: "Full Stack Dev", location: "East Point, GA" },
  { id: 8, name: "Jamie Park", initials: "JP", color: "from-fuchsia-500 to-pink-500", x: 12, y: 48, role: "Mobile Developer", location: "Alpharetta, GA" },
];

const lobbyChatMessages = [
  { name: "Alex", message: "Anyone else excited for the AI cohort?", time: "2m" },
  { name: "Jordan", message: "Just joined! What's everyone working on?", time: "5m" },
  { name: "Sam", message: "Building a local business directory with AI search", time: "8m" },
];

// ── LobbyCanvas Component ───────────────────────────────────────────────────

interface LobbyMember {
  id: number;
  name: string;
  initials: string;
  color: string;
  x: number;
  y: number;
  role: string;
  location: string;
}

function LobbyCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<LobbyMember | null>(null);
  const [avatarPositions, setAvatarPositions] = useState(
    lobbyAvatars.map((a) => ({ ...a, dx: 0, dy: 0, targetX: a.x, targetY: a.y }))
  );

  // Gentle floating animation
  useAnimationFrame((time) => {
    setAvatarPositions((prev) =>
      prev.map((avatar, i) => {
        const offset = i * 1000;
        const floatX = Math.sin((time + offset) / 3000) * 2;
        const floatY = Math.cos((time + offset) / 2500) * 2;
        return {
          ...avatar,
          dx: floatX,
          dy: floatY,
        };
      })
    );
  });

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-[320px] sm:h-[400px] rounded-2xl overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)
        `,
      }}
      onClick={() => setSelectedAvatar(null)}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Profile Card Popup */}
      <AnimatePresence>
        {selectedAvatar && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute left-4 top-4 z-30 w-52"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-xl">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-3">
                <div
                  className={`h-14 w-14 rounded-full bg-gradient-to-br ${selectedAvatar.color} flex items-center justify-center text-white text-lg font-bold ring-2 ring-background mb-2`}
                >
                  {selectedAvatar.initials}
                </div>
                <h4 className="font-semibold text-foreground text-sm">{selectedAvatar.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedAvatar.role}</p>
              </div>

              {/* Details */}
              <div className="space-y-1.5 pt-2 border-t border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>{selectedAvatar.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Radio className="h-3 w-3" />
                  <span>In the lobby</span>
                </div>
              </div>

              {/* Action hint */}
              <p className="text-[9px] text-muted-foreground/60 text-center mt-2 pt-2 border-t border-border/30">
                Sign up to connect
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Avatars */}
      {avatarPositions.map((avatar, i) => (
        <motion.div
          key={avatar.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
          className="absolute group cursor-pointer"
          style={{
            left: `${avatar.x + avatar.dx}%`,
            top: `${avatar.y + avatar.dy}%`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAvatar(selectedAvatar?.id === avatar.id ? null : avatar);
          }}
        >
          {/* Pulse ring */}
          <div className="absolute inset-0 -m-1">
            <div className={`w-full h-full rounded-full bg-gradient-to-br ${avatar.color} opacity-20 animate-ping`}
                 style={{ animationDuration: `${3 + i * 0.5}s` }} />
          </div>
          {/* Avatar */}
          <div
            className={`relative h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-lg ring-2 transition-all ${selectedAvatar?.id === avatar.id ? "ring-white scale-110" : "ring-background/50 group-hover:scale-110"}`}
          >
            {avatar.initials}
          </div>
          {/* Tooltip - hide when selected */}
          {selectedAvatar?.id !== avatar.id && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="px-2 py-1 rounded bg-background/90 border border-border/50 text-xs font-medium text-foreground whitespace-nowrap">
                {avatar.name.split(' ')[0]}
              </div>
            </div>
          )}
          {/* Random activity indicator (some have mic/video icons) */}
          {i % 3 === 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <Mic className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          {i % 4 === 1 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
              <Video className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </motion.div>
      ))}

      {/* Center gathering point indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 w-24 h-24 -m-12 rounded-full bg-violet-500/5 animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 -m-8 rounded-full bg-violet-500/10" />
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-foreground">{lobbyAvatars.length} in lobby</span>
      </div>

      {/* Mini chat preview */}
      <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-64">
        <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 p-3 space-y-2">
          {lobbyChatMessages.slice(0, 2).map((msg, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0">
                {msg.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-foreground">{msg.name}</span>
                  <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{msg.message}</p>
              </div>
            </div>
          ))}
          <div className="text-[9px] text-center text-muted-foreground pt-1 border-t border-border/30">
            waiting for groups to fill...
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hardcoded Data ──────────────────────────────────────────────────────────

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
      { initials: "AK", color: "from-violet-500 to-purple-600", name: "Alex Kim", role: "Creative Director", location: "Atlanta, GA" },
      { initials: "JM", color: "from-blue-500 to-cyan-500", name: "Jordan Miller", role: "Video Producer", location: "Decatur, GA" },
      { initials: "SL", color: "from-emerald-500 to-teal-500", name: "Sam Lee", role: "Motion Designer", location: "Marietta, GA" },
      { initials: "CR", color: "from-amber-500 to-orange-500", name: "Casey Rivera", role: "Content Creator", location: "Buckhead, GA" },
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
      { initials: "MT", color: "from-pink-500 to-rose-500", name: "Morgan Taylor", role: "ML Engineer", location: "Midtown, GA" },
      { initials: "RB", color: "from-indigo-500 to-violet-500", name: "Riley Brooks", role: "AI Researcher", location: "Sandy Springs, GA" },
      { initials: "DW", color: "from-cyan-500 to-blue-500", name: "Drew Wilson", role: "Backend Engineer", location: "East Point, GA" },
      { initials: "JP", color: "from-fuchsia-500 to-pink-500", name: "Jamie Park", role: "Systems Architect", location: "Alpharetta, GA" },
      { initials: "KL", color: "from-emerald-500 to-green-500", name: "Kelly Lin", role: "Platform Engineer", location: "Dunwoody, GA" },
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
      { initials: "PS", color: "from-violet-500 to-indigo-500", name: "Priya Singh", role: "Growth Engineer", location: "Smyrna, GA" },
      { initials: "TN", color: "from-amber-500 to-yellow-500", name: "Tyler Nguyen", role: "Marketing Ops", location: "Roswell, GA" },
      { initials: "LR", color: "from-blue-500 to-indigo-500", name: "Luna Rodriguez", role: "Product Marketer", location: "Brookhaven, GA" },
    ],
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export function CommunityPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0 opacity-30 dark:opacity-50">
        <Aurora
          colorStops={["#8b5cf6", "#6366f1", "#3b82f6"]}
          amplitude={1.0}
          blend={0.6}
          speed={0.4}
        />
      </div>

      {/* Noise texture */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <PublicNavbar />

      {/* Main Content */}
      <main className="relative z-10">
        {/* ═══ HERO — Join the Next Cohort ═══ */}
        <section className="relative px-6 pt-16 sm:pt-20 pb-12 sm:pb-16">
          {/* Decorative orbs */}
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />

          <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left — Headline */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                <span className="text-foreground">Focus Groups</span>
              </h1>
              <p className="mt-3 text-xl sm:text-2xl font-medium bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Your Fast Track to the Frontier
              </p>

              <p className="mt-5 text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed">
                2-week intensive collaborations with AI-matched members.
                Enter the lobby and hang out while you wait for the next one.
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-violet-400" />
                  <span>7 per group</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-violet-400" />
                  <span>2-week sprint</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span>Starts when full</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow px-8"
                  >
                    Get Started
                    <span className="text-primary-foreground/70 font-normal">(it's free)</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right — Focus Group Carousel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-xs text-muted-foreground">Live on Atlantium</span>
              </div>
              <FocusGroupCarousel />
            </motion.div>
          </div>
        </section>

        {/* ═══ How It Works - Section Header ═══ */}
        <section className="px-6 py-12 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <FadeInSection className="text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                How It{" "}
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Works
                </span>
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                A simple three-step process designed to connect you with the right people at the right time.
              </p>
            </FadeInSection>
          </div>
        </section>

        {/* ═══ Feature 1: Topics by Demand (Content Left, Visual Right) ═══ */}
        <section className="px-6 py-12 sm:py-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] -translate-x-1/2" />
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left - Content */}
              <FadeInSection>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-lg">
                    1
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-500/50 to-transparent" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Topics by{" "}
                  <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    Demand
                  </span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Groups form around what the community actually wants. No fixed curriculum, no predetermined schedule — just topics that matter to real builders.
                </p>
                <ul className="space-y-3">
                  {[
                    "Vote on topics you want to explore",
                    "Propose new cohort ideas to the community",
                    "Join groups that match your current learning goals",
                    "Topics evolve with industry trends in real-time",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </FadeInSection>

              {/* Right - Visual */}
              <FadeInSection delay={0.15}>
                <SpotlightCard className="p-6" spotlightColor="rgba(139, 92, 246, 0.12)">
                  <div className="space-y-4">
                    {/* Topic Cards Preview */}
                    {[
                      { topic: "AI Agents & Automation", votes: 24, fill: 85, hot: true },
                      { topic: "Creative AI Workflows", votes: 18, fill: 65, hot: false },
                      { topic: "Building in Public", votes: 12, fill: 45, hot: false },
                    ].map((topic, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        viewport={{ once: true }}
                        className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-violet-500/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground text-sm">{topic.topic}</span>
                          {topic.hot && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-semibold uppercase">
                              Trending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                              style={{ width: `${topic.fill}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{topic.votes} votes</span>
                        </div>
                      </motion.div>
                    ))}
                    <div className="text-center pt-2">
                      <span className="text-xs text-muted-foreground">
                        Community-driven topic selection
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* ═══ Feature 2: Intelligent Matching (Visual Left, Content Right) ═══ */}
        <section className="px-6 py-12 sm:py-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] translate-x-1/2" />
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left - Visual */}
              <FadeInSection className="order-2 lg:order-1">
                <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.12)">
                  <div className="relative">
                    {/* AI Matching Visualization */}
                    <div className="flex items-center justify-center py-6">
                      {/* Center AI Node */}
                      <div className="relative">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30"
                        >
                          <Zap className="h-8 w-8 text-white" />
                        </motion.div>
                        {/* Connection lines */}
                        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            viewport={{ once: true }}
                            className="absolute top-1/2 left-1/2"
                            style={{
                              transform: `rotate(${angle}deg)`,
                              transformOrigin: "0 0",
                            }}
                          >
                            <div className="w-20 h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
                            <div
                              className={`absolute left-20 -top-4 h-8 w-8 rounded-full bg-gradient-to-br ${
                                ["from-violet-500 to-purple-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500", "from-cyan-500 to-blue-500", "from-indigo-500 to-violet-500"][i]
                              } flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-background`}
                            >
                              {["AK", "JM", "SL", "CR", "MT", "RB"][i]}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    {/* Match factors */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/30">
                      {[
                        { label: "Skills", icon: Code, value: "Complementary" },
                        { label: "Goals", icon: Rocket, value: "Aligned" },
                        { label: "Style", icon: Users, value: "Compatible" },
                      ].map((factor) => (
                        <div key={factor.label} className="text-center">
                          <factor.icon className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                          <div className="text-[10px] text-muted-foreground">{factor.label}</div>
                          <div className="text-xs font-medium text-foreground">{factor.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              </FadeInSection>

              {/* Right - Content */}
              <FadeInSection delay={0.15} className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                    2
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Intelligent{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Matching
                  </span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Our AI doesn't just group people randomly. It analyzes skills, goals, working styles, and availability to create cohorts with genuine chemistry.
                </p>
                <ul className="space-y-3">
                  {[
                    "Complementary skillsets that fill gaps",
                    "Aligned goals and project interests",
                    "Compatible working and communication styles",
                    "Time zone and availability optimization",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="h-3 w-3 text-blue-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* ═══ Feature 3: Learn & Build Together (Content Left, Visual Right) ═══ */}
        <section className="px-6 py-12 sm:py-20 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -translate-x-1/2" />
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left - Content */}
              <FadeInSection>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    3
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Learn & Build{" "}
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Together
                  </span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Once your group fills, dive into 2 weeks of structured collaboration led by a group lead who knows the subject matter inside and out. Guided exercises, cutting-edge workflows, and real friendships that last beyond the cohort.
                </p>
                <ul className="space-y-3">
                  {[
                    "Dedicated group lead with deep subject expertise",
                    "Weekly group sessions with structured agendas",
                    "Hands-on projects you ship together",
                    "Private channels for async collaboration",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Rocket className="h-3 w-3 text-emerald-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </FadeInSection>

              {/* Right - Visual */}
              <FadeInSection delay={0.15}>
                <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.12)">
                  <div className="space-y-4">
                    {/* 2-Week Timeline Preview */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">2-Week Journey</span>
                      <span className="text-xs text-emerald-400">Week 1 of 2</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "50%" }}
                        transition={{ duration: 1, delay: 0.3 }}
                        viewport={{ once: true }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      />
                    </div>

                    {/* Activity Cards */}
                    <div className="space-y-3 pt-4">
                      {[
                        { day: "Today", activity: "Group standup @ 6pm", type: "meeting", done: false },
                        { day: "Yesterday", activity: "Shipped MVP landing page", type: "milestone", done: true },
                        { day: "Day 10", activity: "Expert AMA: AI Tooling", type: "workshop", done: true },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          viewport={{ once: true }}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            item.done ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-background/50 border border-border/50"
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            item.done ? "bg-emerald-500/20" : "bg-muted/30"
                          }`}>
                            {item.type === "meeting" && <Users className={`h-4 w-4 ${item.done ? "text-emerald-400" : "text-muted-foreground"}`} />}
                            {item.type === "milestone" && <Rocket className={`h-4 w-4 ${item.done ? "text-emerald-400" : "text-muted-foreground"}`} />}
                            {item.type === "workshop" && <Sparkles className={`h-4 w-4 ${item.done ? "text-emerald-400" : "text-muted-foreground"}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">{item.day}</div>
                            <div className={`text-sm font-medium truncate ${item.done ? "text-emerald-400" : "text-foreground"}`}>
                              {item.activity}
                            </div>
                          </div>
                          {item.done && (
                            <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* ═══ The Lobby CTA ═══ */}
        <section className="px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <FadeInSection>
              <SpotlightCard
                className="p-6 sm:p-8 overflow-hidden"
                spotlightColor="rgba(16, 185, 129, 0.12)"
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <Radio className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                      Live Now
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    That's it. Pick a topic, get matched, and{" "}
                    <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                      learn together.
                    </span>
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    While you wait for your group to fill, hang out in the lobby. Meet other members,
                    explore what everyone's working on, and be ready when your cohort kicks off.
                  </p>
                </div>

                {/* Lobby Canvas */}
                <div className="rounded-xl overflow-hidden bg-background/50 border border-border/30">
                  <LobbyCanvas />
                </div>

                {/* Bottom bar with info and CTA */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-blue-400" />
                      <span>Video coming soon</span>
                    </div>
                    <div className="hidden sm:block h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-1.5">
                      <Mic className="h-4 w-4 text-emerald-400" />
                      <span>Audio coming soon</span>
                    </div>
                  </div>
                  <Link to="/signup">
                    <Button className="gap-2 shadow-lg shadow-emerald-500/20">
                      <Radio className="h-4 w-4" />
                      Enter Lobby
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </SpotlightCard>
            </FadeInSection>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-border/30 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Atlantium. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              to="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/policies"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:team@atlantium.ai"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
