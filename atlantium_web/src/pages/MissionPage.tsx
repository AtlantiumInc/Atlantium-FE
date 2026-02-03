import { Link } from "react-router-dom";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import CountUp from "@/components/ui/CountUp";
import { HolographicCard } from "@/components/ui/holographic-card";
import Aurora from "@/components/Aurora";
import {
  ArrowRight,
  Target,
  Globe,
  Cpu,
  DollarSign,
  Users,
  BookOpen,
  Rocket,
  CheckCircle2,
  Zap,
  MapPin,
  Wifi,
  GraduationCap,
  Heart,
} from "lucide-react";
import { motion, useInView } from "motion/react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/atlantium-the-frontier/id6757367750";

const pillars = [
  {
    icon: Cpu,
    title: "Technology",
    description: "AI tools and platforms—free for those who need them most.",
    color: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Resources",
    description: "Training programs designed for non-traditional backgrounds.",
    color: "from-emerald-500 to-teal-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    textColor: "text-emerald-400",
  },
  {
    icon: DollarSign,
    title: "Capital",
    description: "Micro-grants and funding for overlooked founders.",
    color: "from-amber-500 to-orange-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-400",
  },
  {
    icon: Users,
    title: "Network",
    description: "Connections to mentors and markets outside your zip code.",
    color: "from-violet-500 to-purple-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
    textColor: "text-violet-400",
  },
];

const targets = [
  {
    icon: Globe,
    title: "Emerging Markets",
    description: "Launch tech hubs in regions bypassed by Silicon Valley",
    metric: 15,
    suffix: " regions",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    icon: Users,
    title: "First-Gen Founders",
    description: "Support builders without traditional tech networks",
    metric: 5000,
    suffix: " founders",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    icon: DollarSign,
    title: "Capital Desert Relief",
    description: "Bring funding to areas with little VC presence",
    metric: 5,
    suffix: "M deployed",
    prefix: "$",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  {
    icon: GraduationCap,
    title: "Skills Transfer",
    description: "Free technical training for underserved communities",
    metric: 500,
    suffix: " graduates",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
];

const objectives = [
  { text: "Partner with community colleges and trade schools in rural areas", icon: GraduationCap },
  { text: "Launch Spanish and Portuguese language programming tracks", icon: Globe },
  { text: "Create no-cost founder residencies in low-income neighborhoods", icon: Heart },
  { text: "Build satellite offices in Appalachia, the Delta, and tribal lands", icon: MapPin },
  { text: "Establish micro-grant programs for founders without credit access", icon: DollarSign },
  { text: "Deploy mobile tech labs to communities without broadband", icon: Wifi },
];

function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

export function MissionPage() {
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
      <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <Link to="/" className="flex items-center gap-2 sm:gap-3">
              <img src="/logo.png" alt="Atlantium" className="h-7 w-7 sm:h-8 sm:w-8" />
              <div>
                <span className="text-lg sm:text-xl font-bold tracking-tight">Atlantium</span>
                <p className="hidden sm:block text-[10px] text-muted-foreground tracking-wide">Citizen Technology Lab</p>
              </div>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1 sm:gap-4"
          >
            <Link to="/" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Home
              </Button>
            </Link>
            <Link to="/services" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Services
              </Button>
            </Link>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5 sm:gap-2 bg-white text-black hover:bg-gray-100 border-0 text-xs sm:text-sm">
                <img src="/apple-logo.svg" alt="Apple" className="h-4 sm:h-4 w-auto" />
                Get App
              </Button>
            </a>
            <ThemeToggle />
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10">

        {/* === QUOTE SECTION === */}
        <section
          className="relative h-[85vh] flex flex-col items-center justify-center px-6"
        >
          {/* Decorative orbs */}
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />

          {/* Quote + Attribution */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-center max-w-xl"
          >
            <p className="text-lg sm:text-xl font-medium leading-relaxed text-foreground mb-4">
              "The future is already here,{" "}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                just not evenly distributed.
              </span>
              "
            </p>
            <a
              href="https://www.linkedin.com/posts/garrytan_the-future-is-already-here-just-not-evenly-activity-7259377207498678272-niA6/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src="https://cloud.atlantium.ai/vault/NyjbrQw0/1Rt10DQFkpx00D-S4ylg6uuFPnI/o-LH_w../gary+tan.png"
                alt="Gary Tan"
                className="w-6 h-6 rounded-full object-cover border border-white/10"
              />
              <span className="text-xs text-muted-foreground">Gary Tan · CEO, Y Combinator</span>
            </a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-10"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-5 h-8 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1"
            >
              <motion.div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
            </motion.div>
          </motion.div>
        </section>

        {/* === MISSION HERO === */}
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 py-24">
          {/* Decorative orbs */}
          <div className="absolute top-1/3 -right-40 w-80 h-80 bg-blue-500/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 -left-40 w-80 h-80 bg-violet-500/8 rounded-full blur-[120px]" />

          <FadeInSection className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 mb-8">
              <Target className="h-3.5 w-3.5 text-foreground/60" />
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Our Mission</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
              <ShinyText
                text="Evenly Distribute"
                speed={4}
                color="hsl(var(--foreground))"
                shineColor="rgba(255, 255, 255, 0.9)"
                className="text-4xl sm:text-6xl lg:text-7xl font-bold"
              />
              <br />
              <ShinyText
                text="the Future"
                speed={4}
                delay={0.5}
                color="hsl(var(--foreground))"
                shineColor="rgba(255, 255, 255, 0.9)"
                className="text-4xl sm:text-6xl lg:text-7xl font-bold"
              />
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              Rural towns, inner cities, tribal lands, and developing regions deserve the same access
              to technology, capital, and networks as coastal tech hubs.
            </p>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-48 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent mx-auto origin-center"
            />
          </FadeInSection>
        </section>

        {/* === WHAT WE BRING — PILLARS === */}
        <section className="relative px-6 py-24 max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">What We Bring</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              Four pillars of{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                equal access
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We're building the infrastructure to bring the frontier to everyone, everywhere.
            </p>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((pillar, i) => (
              <FadeInSection key={pillar.title} delay={i * 0.1}>
                <HolographicCard
                  className="h-full"
                  intensity={10}
                  glareOpacity={0.15}
                  holographicOpacity={0.08}
                >
                  <SpotlightCard
                    className="h-full p-6 flex flex-col items-center text-center"
                    spotlightColor="rgba(139, 92, 246, 0.1)"
                  >
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${pillar.color} p-[1px] mb-5`}>
                      <div className="h-full w-full rounded-2xl bg-card flex items-center justify-center">
                        <pillar.icon className={`h-6 w-6 ${pillar.textColor}`} />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{pillar.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                  </SpotlightCard>
                </HolographicCard>
              </FadeInSection>
            ))}
          </div>
        </section>

        {/* === DIVIDER LINE === */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </div>

        {/* === CURRENT TARGETS === */}
        <section className="relative px-6 py-24 max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Current Targets</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              Measurable{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                impact
              </span>
            </h2>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {targets.map((target, i) => (
              <FadeInSection key={target.title} delay={i * 0.08}>
                <SpotlightCard
                  className="p-6 h-full"
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                >
                  <div className="flex items-start gap-5">
                    <div className={`h-12 w-12 rounded-xl ${target.bgColor} ${target.borderColor} border flex items-center justify-center flex-shrink-0`}>
                      <target.icon className={`h-5 w-5 ${target.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <h3 className="font-bold text-foreground">{target.title}</h3>
                        <span className={`text-xl font-bold ${target.color} tabular-nums whitespace-nowrap`}>
                          <CountUp
                            to={target.metric}
                            duration={2.5}
                            delay={0.2}
                            prefix={target.prefix || ""}
                            suffix={target.suffix}
                            separator=","
                          />
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{target.description}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeInSection>
            ))}
          </div>
        </section>

        {/* === DIVIDER LINE === */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>

        {/* === 2025 OBJECTIVES === */}
        <section className="relative px-6 py-24 max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Roadmap</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              2025{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Objectives
              </span>
            </h2>
          </FadeInSection>

          <FadeInSection>
            <SpotlightCard className="p-8 sm:p-10" spotlightColor="rgba(245, 158, 11, 0.08)">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Active Initiatives</h3>
                  <p className="text-xs text-muted-foreground">What we're working on right now</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {objectives.map((obj, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <obj.icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-relaxed pt-1">{obj.text}</span>
                  </motion.div>
                ))}
              </div>
            </SpotlightCard>
          </FadeInSection>
        </section>

        {/* === DIVIDER LINE === */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </div>

        {/* === CTA SECTION === */}
        <section className="relative px-6 py-24 max-w-4xl mx-auto">
          <FadeInSection>
            <SpotlightCard
              className="p-10 sm:p-14 overflow-hidden text-center"
              spotlightColor="rgba(139, 92, 246, 0.12)"
            >
              {/* Decorative orbs */}
              <div className="absolute -top-16 -left-16 w-48 h-48 bg-gradient-to-br from-violet-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-to-tl from-blue-500/15 to-transparent rounded-full blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Open to All</span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Join the{" "}
                  <ShinyText
                    text="Mission"
                    speed={3}
                    color="#8b5cf6"
                    shineColor="#60a5fa"
                    className="text-3xl sm:text-4xl font-bold"
                  />
                </h3>

                <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
                  Whether you're a builder, investor, or advocate—there's a place for you in bringing the frontier to everyone.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                    <Button className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0 px-6">
                      <img src="/apple-logo.svg" alt="Apple" className="h-4 w-auto" />
                      Get the App
                    </Button>
                  </a>
                  <Link to="/">
                    <Button variant="outline" className="gap-2 px-6">
                      Back to Home
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </SpotlightCard>
          </FadeInSection>
        </section>
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
