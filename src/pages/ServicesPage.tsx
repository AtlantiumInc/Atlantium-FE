import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import CountUp from "@/components/ui/CountUp";
import Aurora from "@/components/Aurora";
import {
  ArrowRight,
  Code,
  Lightbulb,
  Handshake,
  Palette,
  Rocket,
  CheckCircle2,
  Clock,
  Zap,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion, useSpring } from "motion/react";
import { useRef } from "react";

const services = [
  {
    icon: Code,
    title: "Development",
    description: "Production-ready code for your MVP or scale-up.",
    color: "blue",
    items: [
      "Enterprise-grade software",
      "Accelerated MVP builds",
      "Legacy system refactors",
      "System integration",
    ],
    price: "10,000",
    priceLabel: "Starting at",
    highlight: true,
  },
  {
    icon: Lightbulb,
    title: "GTM Strategy",
    description: "Go-to-market playbooks that actually work.",
    color: "amber",
    items: [
      "GTM Playbook creation",
      "AI product consultation",
      "Market positioning",
      "Launch strategy",
    ],
    price: "2,500",
    priceLabel: "Starting at",
  },
  {
    icon: Handshake,
    title: "Introductions",
    description: "Warm intros to the right people.",
    color: "emerald",
    items: [
      "Investor introductions",
      "Partnership connections",
      "Talent referrals",
    ],
    price: "Included",
    priceLabel: "With services",
    isText: true,
  },
  {
    icon: Palette,
    title: "Design",
    description: "Interfaces that users love.",
    color: "violet",
    items: [
      "UI/UX design",
      "Design systems",
      "Prototyping",
    ],
    price: "Custom",
    priceLabel: "Pricing",
    isText: true,
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; spotlight: string; gradient: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-500",
    spotlight: "rgba(59, 130, 246, 0.15)",
    gradient: "from-blue-500 to-cyan-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
    spotlight: "rgba(245, 158, 11, 0.15)",
    gradient: "from-amber-500 to-orange-500",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-500",
    spotlight: "rgba(16, 185, 129, 0.15)",
    gradient: "from-emerald-500 to-teal-500",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    text: "text-violet-500",
    spotlight: "rgba(139, 92, 246, 0.15)",
    gradient: "from-violet-500 to-purple-500",
  },
};

// Tilt Card wrapper for service cards
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const rotateX = useSpring(0, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 20 });

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateXVal = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    const rotateYVal = ((e.clientX - centerX) / (rect.width / 2)) * 8;
    rotateX.set(rotateXVal);
    rotateY.set(rotateYVal);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`[perspective:1000px] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function ServicesPage() {
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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-bold tracking-tight"
            >
              Atlantium
            </motion.span>
          </Link>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <ThemeToggle />
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Home
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <a href="mailto:team@atlantium.ai">
              <Button size="sm" className="gap-2">
                <Rocket className="h-4 w-4" />
                Start Project
              </Button>
            </a>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(100px,auto)]">

          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="col-span-12 lg:col-span-8 row-span-2"
          >
            <SpotlightCard
              className="h-full p-8 lg:p-12 grid place-items-center overflow-hidden"
              spotlightColor="rgba(139, 92, 246, 0.15)"
            >
              {/* Decorative gradient orb */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl" />

              <div className="relative w-full max-w-xl text-center">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium text-emerald-500 uppercase tracking-wider">Accepting clients</span>
                </motion.div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
                  <span className="text-foreground">From Zero</span>
                  <br />
                  <ShinyText
                    text="To Shipped"
                    speed={3}
                    color="hsl(var(--primary))"
                    shineColor="#ffffff"
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold"
                  />
                </h1>

                {/* Subhead */}
                <p className="text-muted-foreground text-lg mb-8 mx-auto">
                  GTM strategy, production code, and warm intros. Your extended team for the 0-to-1 phase.
                </p>

                {/* CTA */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <a href="mailto:team@atlantium.ai">
                    <Button size="lg" className="gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                      <Rocket className="h-5 w-5" />
                      Start a Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap justify-center items-center gap-4 pt-6 border-t border-border/30 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>20+ projects shipped</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>2-4 week MVPs</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>24hr response</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="col-span-12 sm:col-span-6 lg:col-span-4 row-span-2"
          >
            <SpotlightCard
              className="h-full p-6 flex flex-col"
              spotlightColor="rgba(99, 102, 241, 0.15)"
            >
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      <CountUp to={20} duration={2} suffix="+" />
                    </div>
                    <div className="text-sm text-muted-foreground">Projects shipped</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">2-4 wks</div>
                    <div className="text-sm text-muted-foreground">Avg. MVP timeline</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
                    <Star className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">White Glove</div>
                    <div className="text-sm text-muted-foreground">High-touch service</div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Service Cards */}
          {services.map((service, index) => {
            const colors = colorMap[service.color];
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05, duration: 0.6 }}
                className="col-span-12 sm:col-span-6 lg:col-span-3 row-span-2"
              >
                <TiltCard className="h-full">
                  <SpotlightCard
                    className={`h-full p-6 flex flex-col ${service.highlight ? 'ring-1 ring-primary/30' : ''}`}
                    spotlightColor={colors.spotlight}
                  >
                    {service.highlight && (
                      <div className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-1 rounded-b-lg bg-primary text-primary-foreground text-xs font-medium">
                        Most Popular
                      </div>
                    )}

                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colors.gradient} p-[1px] mb-4`}>
                      <div className="h-full w-full rounded-xl bg-card flex items-center justify-center">
                        <service.icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1">{service.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{service.description}</p>

                    <ul className="space-y-2 mb-auto">
                      {service.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm">
                          <Zap className={`h-3 w-3 ${colors.text}`} />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4 mt-4 border-t border-border/50">
                      <a href="mailto:team@atlantium.ai" className="group block">
                        <div className="text-xs text-muted-foreground mb-1 group-hover:text-primary transition-colors">Get started</div>
                        <div className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          Let's talk
                          <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                      </a>
                    </div>
                  </SpotlightCard>
                </TiltCard>
              </motion.div>
            );
          })}

          {/* Process Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="col-span-12 lg:col-span-8 row-span-1"
          >
            <SpotlightCard
              className="h-full p-6 lg:p-8"
              spotlightColor="rgba(139, 92, 246, 0.1)"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">How We Work</h3>
                  <p className="text-muted-foreground text-sm">
                    Simple. Fast. No surprises.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                  {[
                    { label: "Discovery", color: "emerald", num: 1 },
                    { label: "Scope", color: "blue", num: 2 },
                    { label: "Build", color: "violet", num: 3 },
                    { label: "Ship", color: "amber", num: 4 },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-${step.color}-500/10 border border-${step.color}-500/20`}>
                        <span className={`h-5 w-5 rounded-full bg-${step.color}-500 text-white text-xs font-bold flex items-center justify-center`}>
                          {step.num}
                        </span>
                        <span className="text-sm font-medium">{step.label}</span>
                      </div>
                      {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground hidden lg:block" />}
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Testimonial/Trust Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="col-span-12 lg:col-span-4 row-span-1"
          >
            <SpotlightCard
              className="h-full p-6 flex flex-col justify-center"
              spotlightColor="rgba(245, 158, 11, 0.12)"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic mb-3">
                "Atlantium helped us ship our MVP in 3 weeks. Incredible execution."
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  JD
                </div>
                <div className="text-sm font-medium">Founder, Stealth Startup</div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="col-span-12 row-span-1"
          >
            <SpotlightCard
              className="p-8 lg:p-12 overflow-hidden"
              spotlightColor="rgba(139, 92, 246, 0.15)"
            >
              {/* Decorative elements */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-2xl" />

              <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">24hr response time</span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    Ready to ship?
                  </h3>
                  <p className="text-muted-foreground max-w-lg">
                    Tell us about your project. We'll scope it out and get you a quote within a day.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="mailto:team@atlantium.ai">
                    <Button size="lg" className="gap-2 shadow-lg shadow-primary/25 px-8">
                      <Rocket className="h-5 w-5" />
                      Start a Project
                    </Button>
                  </a>
                  <Link to="/">
                    <Button variant="outline" size="lg" className="gap-2">
                      Back to Home
                    </Button>
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
