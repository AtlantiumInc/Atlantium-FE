import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import SpotlightCard from "@/components/ui/SpotlightCard";
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
} from "lucide-react";
import { motion } from "motion/react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/atlantium-the-frontier/id6757367750";

const targets = [
  {
    icon: Globe,
    title: "Global Reach",
    description: "Expand access to underserved communities worldwide",
    metric: "50+ cities",
    color: "blue",
  },
  {
    icon: Users,
    title: "Community Growth",
    description: "Build thriving local tech ecosystems",
    metric: "10,000 members",
    color: "emerald",
  },
  {
    icon: DollarSign,
    title: "Capital Access",
    description: "Connect founders with funding opportunities",
    metric: "$10M facilitated",
    color: "amber",
  },
  {
    icon: BookOpen,
    title: "Education",
    description: "Provide resources and mentorship programs",
    metric: "1,000 hours",
    color: "violet",
  },
];

const objectives = [
  "Launch community hubs in 10 emerging tech markets by 2025",
  "Partner with local universities and incubators",
  "Create scholarship programs for underrepresented founders",
  "Build open-source tools for community organizing",
  "Host monthly virtual events accessible globally",
  "Establish mentor matching across time zones",
];

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
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Hero Section with Gary Tan Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Gary Tan Image */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 blur-xl opacity-30" />
            <img
              src="https://cloud.atlantium.ai/vault/NyjbrQw0/1Rt10DQFkpx00D-S4ylg6uuFPnI/o-LH_w../gary+tan.png"
              alt="Gary Tan"
              className="relative w-32 h-32 rounded-full object-cover border-4 border-background shadow-2xl"
            />
          </div>

          {/* Quote */}
          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground leading-relaxed mb-4 max-w-3xl mx-auto">
            "The future doesn't arrive all at once."
          </blockquote>
          <p className="text-muted-foreground mb-12">
            — Gary Tan, CEO of Y Combinator
          </p>

          {/* Mission Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Our Mission</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Bring Technology to{" "}
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                Underserved Communities
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We believe everyone deserves access to the tools, knowledge, capital, and networks
              that drive innovation. The frontier shouldn't be reserved for the few.
            </p>
          </motion.div>
        </motion.div>

        {/* What We Bring Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-16"
        >
          <SpotlightCard className="p-8" spotlightColor="rgba(139, 92, 246, 0.1)">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">What We Bring</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Cpu className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Technology</h3>
                <p className="text-sm text-muted-foreground">Cutting-edge tools and platforms</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Resources</h3>
                <p className="text-sm text-muted-foreground">Education and mentorship</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Capital</h3>
                <p className="text-sm text-muted-foreground">Funding and investment access</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Network</h3>
                <p className="text-sm text-muted-foreground">Connections that matter</p>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Current Targets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Current Targets</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {targets.map((target, index) => {
              const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
                blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500" },
                emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-500" },
                amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500" },
                violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-500" },
              };
              const colors = colorClasses[target.color];
              return (
                <motion.div
                  key={target.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                >
                  <SpotlightCard className="p-5 h-full" spotlightColor="rgba(139, 92, 246, 0.08)">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
                        <target.icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-foreground">{target.title}</h3>
                          <span className={`text-sm font-bold ${colors.text}`}>{target.metric}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{target.description}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Objectives */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-16"
        >
          <SpotlightCard className="p-8" spotlightColor="rgba(59, 130, 246, 0.1)">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">2025 Objectives</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {objectives.map((objective, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{objective}</span>
                </motion.div>
              ))}
            </div>
          </SpotlightCard>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-center"
        >
          <h3 className="text-xl font-bold text-foreground mb-4">Join the Mission</h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Whether you're a builder, investor, or advocate—there's a place for you in bringing the frontier to everyone.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2 bg-white text-black hover:bg-gray-100 shadow-lg shadow-black/20 border-0">
                <img src="/apple-logo.svg" alt="Apple" className="h-4 w-auto" />
                Get the App
              </Button>
            </a>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                Back to Home
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
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
