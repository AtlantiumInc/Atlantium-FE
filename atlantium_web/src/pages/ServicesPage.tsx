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
  Sparkles,
  MessageSquare,
  Rocket,
  CheckCircle2,
  Clock,
  Zap,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { motion, useSpring, AnimatePresence } from "motion/react";
import { useRef, useState, useEffect } from "react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/atlantium-the-frontier/id6757367750";

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
    icon: Sparkles,
    title: "Generative Media",
    description: "AI-powered content creation and strategic consulting.",
    color: "emerald",
    items: [
      "AI video & image generation",
      "Audio & music production",
      "Workflow & tool optimization",
      "Team training & pipelines",
    ],
    price: "2,500",
    priceLabel: "Starting at",
  },
  {
    icon: MessageSquare,
    title: "Technology Advisor",
    description: "Strategic tech guidance for founders and executives.",
    color: "violet",
    items: [
      "Fractional CTO services",
      "AI integration strategy",
      "Tech stack evaluation",
      "Build vs. buy decisions",
    ],
    price: "1,500",
    priceLabel: "Starting at",
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
  const [showCalendly, setShowCalendly] = useState(false);

  useEffect(() => {
    // Load Calendly script once
    if (!document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    // Re-initialize Calendly widget when modal opens
    if (showCalendly) {
      const initCalendly = () => {
        const container = document.getElementById("calendly-embed");
        if ((window as any).Calendly && container) {
          (window as any).Calendly.initInlineWidget({
            url: "https://calendly.com/team-atlantium/30min?hide_gdpr_banner=1&text_color=000000&primary_color=0c4cbb",
            parentElement: container,
          });
        }
      };
      // Try immediately, then retry after script loads
      setTimeout(initCalendly, 100);
      setTimeout(initCalendly, 500);
    }
  }, [showCalendly]);

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
                <p className="hidden sm:block text-[10px] text-muted-foreground tracking-wide">Premier Technology Community</p>
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
            <Link to="/index" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                News
              </Button>
            </Link>
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
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
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5 flex flex-col items-center">
                  <span className="text-foreground">Let's Build</span>
                  <ShinyText
                    text="Together"
                    speed={3}
                    color="#3b82f6"
                    shineColor="#ffffff"
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold pb-2"
                  />
                </h1>

                {/* Subhead */}
                <p className="text-muted-foreground text-lg mb-8 mx-auto">
                  Development. GTM strategy. Generative media. Tech advisory.
                </p>

                {/* CTA */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <Button
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                    onClick={() => setShowCalendly(true)}
                  >
                    <Rocket className="h-5 w-5" />
                    Start a Project
                    <ArrowRight className="h-4 w-4" />
                  </Button>
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
                    <span>2hr response</span>
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

                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/20 flex items-center justify-center">
                    <Rocket className="h-6 w-6 text-violet-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">Ongoing</div>
                    <div className="text-sm text-muted-foreground">Post-launch support</div>
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

          {/* Process Card - Visual Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="col-span-12 row-span-1"
          >
            <SpotlightCard
              className="h-full p-6 lg:p-10"
              spotlightColor="rgba(139, 92, 246, 0.1)"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">How We Work</h3>
                <p className="text-muted-foreground text-sm">
                  Simple. Fast. No surprises.
                </p>
              </div>

              {/* Desktop Timeline */}
              <div className="hidden md:block relative">
                {/* Timeline Line */}
                <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 via-violet-500 to-amber-500 opacity-30" />

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Discovery", desc: "Understand your vision & goals", color: "emerald", icon: Lightbulb },
                    { label: "Scope", desc: "Define deliverables & timeline", color: "blue", icon: CheckCircle2 },
                    { label: "Build", desc: "Rapid development with updates", color: "violet", icon: Code },
                    { label: "Ship", desc: "Launch & ongoing support", color: "amber", icon: Rocket },
                  ].map((step, i) => (
                    <div key={step.label} className="flex flex-col items-center text-center">
                      {/* Node */}
                      <div className={`relative z-10 h-12 w-12 rounded-full bg-${step.color}-500/20 border-2 border-${step.color}-500 flex items-center justify-center mb-4`}>
                        <step.icon className={`h-5 w-5 text-${step.color}-500`} />
                      </div>
                      {/* Step number */}
                      <span className={`text-xs font-bold text-${step.color}-500 mb-1`}>Step {i + 1}</span>
                      {/* Label */}
                      <h4 className="font-semibold text-foreground mb-1">{step.label}</h4>
                      {/* Description */}
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Timeline - Vertical */}
              <div className="md:hidden space-y-4">
                {[
                  { label: "Discovery", desc: "Understand your vision & goals", color: "emerald", icon: Lightbulb },
                  { label: "Scope", desc: "Define deliverables & timeline", color: "blue", icon: CheckCircle2 },
                  { label: "Build", desc: "Rapid development with updates", color: "violet", icon: Code },
                  { label: "Ship", desc: "Launch & ongoing support", color: "amber", icon: Rocket },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className={`relative flex-shrink-0 h-10 w-10 rounded-full bg-${step.color}-500/20 border-2 border-${step.color}-500 flex items-center justify-center`}>
                      <step.icon className={`h-4 w-4 text-${step.color}-500`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold text-${step.color}-500`}>{i + 1}</span>
                        <h4 className="font-semibold text-foreground">{step.label}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
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

          {/* CTA Card - Side by side with testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="col-span-12 lg:col-span-8 row-span-1"
          >
            <SpotlightCard
              className="h-full p-8 lg:p-10 overflow-hidden"
              spotlightColor="rgba(139, 92, 246, 0.15)"
            >
              {/* Decorative elements */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-2xl" />

              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between h-full gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">2hr response time</span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    Ready to ship?
                  </h3>
                  <p className="text-muted-foreground">
                    Tell us about your project. We'll scope it out and get you a quote within a day. Book a free 30-minute discovery call.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 flex-shrink-0">
                  <Button
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/25 px-8"
                    onClick={() => setShowCalendly(true)}
                  >
                    <Rocket className="h-5 w-5" />
                    Start a Project
                  </Button>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

        </div>
      </main>

      {/* Calendly Modal */}
      <AnimatePresence>
        {showCalendly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCalendly(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-background rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-foreground">Book a Discovery Call</h3>
                  <p className="text-sm text-muted-foreground">30 minutes to discuss your project</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCalendly(false)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {/* Calendly Embed */}
              <div
                id="calendly-embed"
                className="calendly-inline-widget"
                style={{ minWidth: "320px", height: "600px" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
