import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import {
  ArrowRight,
  Check,
  Crown,
  Calendar,
  Star,
  Smartphone,
  Clock,
  Users,
  Zap,
  Code,
  Video,
  Handshake,
  Rocket,
  MessageSquare,
  FolderOpen,
  Lightbulb,
  CalendarCheck,
  Globe,
} from "lucide-react";

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

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    icon: Star,
    color: "cyan",
    features: [
      "iOS app access",
      "Office hours once a week (Fridays)",
      "Frontier feed access",
      "Public events",
      "Templates & source code",
      "Software perks & discounts",
    ],
  },
  {
    name: "Club Membership",
    price: "$128",
    period: "/month",
    description: "For serious builders",
    popular: true,
    icon: Crown,
    color: "violet",
    features: [
      "Everything in Free",
      "Office hours Mon\u2013Fri",
      "AI engineering curriculum",
      "Focus groups",
      "Exclusive member events",
      "Priority event registration",
      "Startup advisor",
    ],
  },
  {
    name: "Annual Membership",
    price: "$399",
    period: "/year",
    description: "Committed to the frontier",
    savings: "Save $1,137",
    icon: Calendar,
    color: "emerald",
    features: [
      "Everything in Club",
      "9 months free",
      "Member directory access",
      "Quarterly performance review",
      "Discounted services",
      "Project support",
    ],
  },
];


export function PricingPage() {
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

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Crown className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Membership Plans</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            <ShinyText text="Choose Your" className="text-5xl sm:text-6xl lg:text-7xl font-bold" color="#e2e8f0" shineColor="#22d3ee" speed={3} />
            <br />
            <ShinyText text="Membership" className="text-5xl sm:text-6xl lg:text-7xl font-bold" color="#22d3ee" shineColor="#ffffff" speed={2} />
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            Whether you're exploring or building full-time, there's a plan for you. Upgrade or downgrade anytime.
          </p>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground mb-10">
            {[
              { icon: Clock, label: "Cancel Anytime" },
              { icon: Smartphone, label: "iOS App Included" },
              { icon: Video, label: "Office Hours" },
              { icon: Users, label: "Builder Community" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-cyan-500" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing cards */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <FadeIn key={tier.name} delay={i * 0.1}>
                <div className="relative pt-4 h-full">
                  {tier.popular && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {tier.savings && (
                    <div className="absolute top-1 right-4 z-10">
                      <span className="bg-emerald-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                        {tier.savings}
                      </span>
                    </div>
                  )}

                  <SpotlightCard
                    className={`h-full p-6 flex flex-col ${tier.popular ? "ring-2 ring-violet-500/40" : ""}`}
                    spotlightColor={tier.popular ? "rgba(139, 92, 246, 0.12)" : "rgba(14, 165, 233, 0.08)"}
                  >
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {tier.name !== "Free" && <Icon className="h-4 w-4 text-yellow-500" />}
                        {tier.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground"> {tier.period}</span>
                    </div>

                    <ul className="space-y-3 flex-1 mb-6">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link to="/signup" className="block">
                      <Button
                        className={`w-full gap-2 ${
                          tier.popular
                            ? "bg-white text-black hover:bg-gray-100 border-0"
                            : ""
                        }`}
                        variant={tier.popular ? "default" : "outline"}
                      >
                        {tier.name === "Free" ? "Get Started" : "Join Now"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </SpotlightCard>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* Club Membership Benefits — deep dive */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Club Membership</p>
            <h2 className="text-3xl sm:text-4xl font-bold">We Build With You</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Club membership isn't a course — it's hands-on collaboration. We work deeply alongside you on your projects, from architecture to deployment. Think of it as having a technical co-founder on call.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              icon: Video,
              title: "Office Hours Mon\u2013Fri",
              desc: "Daily sessions with engineers who actually review your code, debug with you, and help you ship. Not lectures \u2014 real working sessions on your project.",
            },
            {
              icon: FolderOpen,
              title: "Deep Project Support",
              desc: "Bring your startup, side project, or portfolio piece. We help with architecture decisions, code reviews, deployment strategy, and getting unstuck on the hard problems.",
            },
            {
              icon: Code,
              title: "AI Engineering Curriculum",
              desc: "A structured path from foundations to production-grade AI apps. TypeScript, React, system design, LLM integration — taught through building, not slides.",
            },
            {
              icon: Lightbulb,
              title: "Startup Advisory",
              desc: "Get feedback on your idea, go-to-market strategy, and technical roadmap from founders who've been through it. We help you build something people actually want.",
            },
            {
              icon: Rocket,
              title: "Priority Event Access",
              desc: "Skip the waitlist for high-demand events with founders, investors, and operators. Club members always get a seat at the table.",
            },
            {
              icon: MessageSquare,
              title: "Direct Access",
              desc: "Message the team directly. Get async feedback on pull requests, architecture questions, or career decisions between office hours.",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <FadeIn key={item.title} delay={i * 0.07}>
                <SpotlightCard className="h-full p-6" spotlightColor="rgba(139, 92, 246, 0.1)">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* Annual Membership Perks */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 opacity-20" />
            <SpotlightCard className="relative p-8 lg:p-12" spotlightColor="rgba(16, 185, 129, 0.1)">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Annual Membership</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4">Go Annual. Get More.</h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Annual members save $1,137 and unlock exclusive monthly events with founders, investors, and industry leaders. Plus networking opportunities you won't find anywhere else.
                  </p>
                  <Link to="/signup">
                    <Button className="gap-2 bg-white text-black hover:bg-gray-100 border-0">
                      Join Annual
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: CalendarCheck, label: "Exclusive Monthly Events", desc: "Curated gatherings with founders, operators, and investors — only for annual members." },
                    { icon: Globe, label: "Networking Opportunities", desc: "Private introductions and access to a network of builders, hiring managers, and advisors." },
                    { icon: Handshake, label: "Quarterly Performance Review", desc: "One-on-one sessions to assess your progress, refine your goals, and plan next steps." },
                    { icon: Zap, label: "Discounted Services", desc: "Preferred rates on consulting, design, and development services from the Atlantium team." },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Icon className="h-[18px] w-[18px] text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SpotlightCard>
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 opacity-30" />
            <SpotlightCard className="relative p-10 lg:p-14 text-center" spotlightColor="rgba(14, 165, 233, 0.15)">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Join Atlantium</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Ready to Build?
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Start free or go all-in with Club. Either way, you're joining a community of builders.
              </p>
              <Link to="/signup">
                <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 shadow-xl shadow-black/20 border-0 text-base px-8">
                  Join Lab
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
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
