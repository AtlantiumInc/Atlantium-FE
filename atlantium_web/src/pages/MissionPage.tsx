import { Link } from "react-router-dom";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
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
  Zap,
  MapPin,
  Wifi,
  GraduationCap,
  Heart,
} from "lucide-react";
import { motion, useInView } from "motion/react";


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
      <PublicNavbar />

      {/* Main Content */}
      <main className="relative z-10">

        {/* === HERO: HEADLINE + LINKEDIN POST === */}
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
                <Target className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Our Mission</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                <span className="text-foreground">Evenly Distribute</span>
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  the Frontier
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed">
                Our goal is to ensure that the benefits and abundance created by technology touches all of humanity, especially in Atlanta.
              </p>
            </motion.div>

            {/* Right — LinkedIn Post Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center lg:justify-end"
            >
              <a
                href="https://www.linkedin.com/posts/garrytan_the-future-is-already-here-just-not-evenly-activity-7259377207498678272-niA6/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full max-w-md group"
              >
                <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden transition-all duration-300 group-hover:border-border/60 group-hover:shadow-xl group-hover:shadow-black/10 group-hover:-translate-y-1">
                  {/* Post header */}
                  <div className="flex items-center gap-3 p-5 pb-0">
                    <img
                      src="https://cloud.atlantium.ai/vault/NyjbrQw0/1Rt10DQFkpx00D-S4ylg6uuFPnI/o-LH_w../gary+tan.png"
                      alt="Gary Tan"
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/10 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">Garry Tan</span>
                        <svg className="h-4 w-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.272.587.702 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.895.143.634-.131 1.217-.437 1.687-.883.445-.47.751-1.054.882-1.69.132-.633.083-1.29-.14-1.896.587-.274 1.084-.705 1.438-1.246.355-.54.552-1.17.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                        </svg>
                      </div>
                      <p className="text-xs text-muted-foreground">CEO, Y Combinator</p>
                    </div>
                    {/* LinkedIn icon */}
                    <svg className="h-5 w-5 text-[#0a66c2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>

                  {/* Post body */}
                  <div className="p-5 pt-3">
                    <p className="text-base leading-relaxed text-foreground/90">
                      The future is already here,{" "}
                      <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
                        just not evenly distributed.
                      </span>
                    </p>
                  </div>

                  {/* Post engagement bar */}
                  <div className="px-5 pb-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                      <span className="flex -space-x-1">
                        <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">&#x1F44D;</span>
                        <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">&#x2764;</span>
                      </span>
                      <span className="ml-1">2,847</span>
                    </div>
                  </div>
                  <div className="border-t border-border/30 mx-5" />
                  <div className="flex items-center justify-around px-5 py-3 text-muted-foreground/50">
                    <span className="text-xs font-medium">Like</span>
                    <span className="text-xs font-medium">Comment</span>
                    <span className="text-xs font-medium">Repost</span>
                    <span className="text-xs font-medium">Send</span>
                  </div>
                </div>
              </a>
            </motion.div>
          </div>

        </section>

        {/* === WHAT WE BRING — PILLARS === */}
        <section className="relative px-6 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-10">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">What We Bring</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">
              What We{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Bring to the Table
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We're building the infrastructure to bring the frontier to everyone, everywhere.
            </p>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
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
          </div>
        </section>

        {/* === CURRENT TARGETS === */}
        <section className="relative px-6 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-10">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Current Targets</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">
              Measurable{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                impact
              </span>
            </h2>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
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
          </div>
        </section>

        {/* === 2025 OBJECTIVES === */}
        <section className="relative px-6 py-16 sm:py-20 max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-10">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Roadmap</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-3">
              2025{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Objectives
              </span>
            </h2>
          </FadeInSection>

          <FadeInSection>
            <SpotlightCard className="p-6 sm:p-8" spotlightColor="rgba(245, 158, 11, 0.08)">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Active Initiatives</h3>
                  <p className="text-xs text-muted-foreground">What we're working on right now</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
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

        {/* === CTA SECTION === */}
        <section className="relative px-6 py-16 sm:py-20 max-w-6xl mx-auto">
          <FadeInSection>
            <SpotlightCard
              className="p-8 sm:p-10 overflow-hidden text-center"
              spotlightColor="rgba(139, 92, 246, 0.12)"
            >
              {/* Decorative orbs */}
              <div className="absolute -top-16 -left-16 w-48 h-48 bg-gradient-to-br from-violet-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-to-tl from-blue-500/15 to-transparent rounded-full blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Open to All</span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                  Join the{" "}
                  <ShinyText
                    text="Mission"
                    speed={3}
                    color="#8b5cf6"
                    shineColor="#60a5fa"
                    className="text-3xl sm:text-4xl font-bold"
                  />
                </h3>

                <p className="text-muted-foreground mb-6 max-w-lg mx-auto leading-relaxed">
                  Whether you're a builder, investor, or advocate—there's a place for you in bringing the frontier to everyone.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/focus-groups">
                    <Button className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0 px-6">
                      Join a Focus Group
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
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
