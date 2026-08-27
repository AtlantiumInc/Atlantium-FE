import { useState } from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { PublicNavbar } from "@/components/PublicNavbar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import {
  ArrowRight,
  Check,
  Crown,
  Star,
  Smartphone,
  Clock,
  Users,
  Zap,
  Video,
  Rocket,
  MessageSquare,
  FolderOpen,
  Lightbulb,
  Sparkles } from "lucide-react";

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
    description: "Everything the network publishes, open to everyone",
    icon: Star,
    color: "cyan",
    features: [
      "The Job Index — every Atlanta role, updated every 4 hours",
      "iOS app access",
      "Frontier feed + all guides and reports",
      "Public events",
      "Software perks & discounts",
    ],
  },
  {
    name: "Atlantium Insider",
    price: "$290",
    period: "/year",
    description: "For people building their place in the network",
    popular: true,
    icon: Crown,
    color: "violet",
    features: [
      "Everything in Free",
      "Rene — your frontier agent",
      "Member DMs across the network",
      "Insider events, virtual & in-person",
      "Priority event registration",
      "Unlimited directory contact reveals",
      "Member directory access",
      "Discounted services & project support",
    ],
  },
];

type PricingTier = (typeof tiers)[number];

/**
 * A visitor signs up first; a signed-in member goes straight to Stripe.
 * `billing_unavailable` is a normal state before keys are configured, so it
 * gets a plain message rather than an error.
 */
function PlanCta({ tier }: { tier: PricingTier }) {
  const { user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // A paying member must never be sold the thing they already own — the paid
  // card becomes their standing plus a way to manage it, and the Free card
  // stops competing for the click.
  const sub = user?._subscription;
  const isMember = Boolean(sub?.has_club_access) || sub?.subscription_status === "active";

  if (isMember) {
    if (tier.name !== "Free") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300">
            <Check className="h-4 w-4" />
            Your current plan
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            disabled={isOpeningPortal}
            onClick={async () => {
              setIsOpeningPortal(true);
              try {
                const { portal_url } = await api.openBillingPortal();
                window.location.assign(portal_url);
              } catch {
                toast.error("Couldn't open billing — try again in a moment.");
                setIsOpeningPortal(false);
              }
            }}
          >
            {isOpeningPortal ? "Opening…" : "Manage billing"}
          </Button>
        </div>
      );
    }
    return (
      <div className="py-2.5 text-center text-sm text-muted-foreground">
        Included with your membership
      </div>
    );
  }

  if (tier.name === "Free" || !user) {
    return (
      <Link to="/signup" className="block">
        <Button
          className={`w-full gap-2 ${tier.popular ? "bg-white text-black hover:bg-gray-100 border-0" : ""}`}
          variant={tier.popular ? "default" : "outline"}
        >
          {tier.name === "Free" ? "Get Started" : "Join Now"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  // Annual-only for now — the monthly plan is retired.
  const plan = "club_annual" as const;

  // In-page Elements, not a redirect: the member never leaves Atlantium, and
  // there is one payment flow across the platform to keep correct.
  return (
    <>
      <Button
        onClick={() => setIsStarting(true)}
        className={`w-full gap-2 ${tier.popular ? "bg-white text-black hover:bg-gray-100 border-0" : ""}`}
        variant={tier.popular ? "default" : "outline"}
      >
        Join Now
        <ArrowRight className="h-4 w-4" />
      </Button>
      <UpgradeDialog
        open={isStarting}
        onOpenChange={setIsStarting}
        defaultPlan={plan}
        reason={`${tier.name} — ${tier.price}${tier.period}`}
      />
    </>
  );
}

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
            Everything the network publishes stays free. Membership is what adds the people — one plan, billed annually.
          </p>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground mb-10">
            {[
              { icon: Clock, label: "Cancel anytime" },
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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


                  <SpotlightCard
                    className={`h-full p-6 flex flex-col relative overflow-hidden ${
                      tier.popular
                        ? "ring-1 ring-violet-500/50 shadow-[0_0_50px_-12px_rgba(139,92,246,0.45)]"
                        : ""
                    }`}
                    spotlightColor={tier.popular ? "rgba(139, 92, 246, 0.18)" : "rgba(14, 165, 233, 0.08)"}
                  >
                    {/* The paid card earns some light: a violet bloom behind
                        the crown and a hairline down the left edge. */}
                    {tier.popular && (
                      <>
                        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-violet-400/60 to-transparent" />
                      </>
                    )}

                    <div className="relative mb-4">
                      <div className="flex items-center gap-2.5">
                        {tier.name !== "Free" && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/30">
                            <Icon className="h-4 w-4 text-violet-300" />
                          </span>
                        )}
                        <h3 className="font-semibold text-lg tracking-tight">{tier.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5">{tier.description}</p>
                    </div>

                    <div className="relative mb-6 flex items-baseline gap-1.5">
                      <span
                        className={`text-5xl font-bold tracking-tight ${
                          tier.popular
                            ? "bg-gradient-to-br from-white via-violet-100 to-violet-300 bg-clip-text text-transparent"
                            : ""
                        }`}
                      >
                        {tier.price}
                      </span>
                      <span className="text-sm text-muted-foreground">{tier.period}</span>
                    </div>
                    {tier.popular && (
                      <p className="relative -mt-4 mb-5 text-[11px] font-mono uppercase tracking-widest text-violet-300/80">
                        Billed annually · about $24 a month
                      </p>
                    )}

                    <ul className="relative space-y-3 flex-1 mb-6">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className={`h-4 w-4 shrink-0 mt-0.5 ${tier.popular ? "text-violet-400" : "text-green-500"}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="relative">
                      <PlanCta tier={tier} />
                    </div>
                  </SpotlightCard>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* Insider Access benefits — deep dive */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Insider Access</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Your Seat in the Network</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Insider access isn't content — it's standing. You can reach the people in this network, show up to the rooms where they meet, and put Rene to work on whatever you're trying to get done.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              icon: Sparkles,
              title: "Rene, Your Frontier Agent",
              desc: "A member-only agent that works the network on your behalf \u2014 getting you connected, making warm introductions to the right people, and sending you roles off the board when you're job seeking. It tracks what you're trying to get done and moves it forward between visits.",
            },
            {
              icon: MessageSquare,
              title: "Member DMs",
              desc: "Start conversations with anyone in the network \u2014 founders, engineers, operators. Free members can only reply; Insiders open the door.",
            },
            {
              icon: Video,
              title: "Insider Events \u2014 Virtual & IRL",
              desc: "Member sessions online and rooms in Atlanta. The events where the network actually meets, not the public calendar.",
            },
            {
              icon: Rocket,
              title: "Priority Event Access",
              desc: "Skip the waitlist for high-demand events with founders, investors, and operators. Insiders always get a seat at the table.",
            },
            {
              icon: FolderOpen,
              title: "The Full Directory",
              desc: "Unlimited contact reveals across companies, investors and grants \u2014 the working map of Atlanta tech, fully open.",
            },
            {
              icon: Lightbulb,
              title: "A Founder Welcome",
              desc: "Every member gets a personal welcome from Kleveland, the founder \u2014 and a direct line to tell us what you're here to do.",
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
                Start free or go all-in as an Insider. Either way, you're joining a community of builders.
              </p>
              <Link to="/signup">
                <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 shadow-xl shadow-black/20 border-0 text-base px-8">
                  Join Network
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
