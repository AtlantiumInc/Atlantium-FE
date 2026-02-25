import { Link } from "react-router-dom";
import {
  Code,
  Smartphone,
  GitMerge,
  FolderOpen,
  Video,
  LayoutDashboard,
  Handshake,
  Users,
  Zap,
  Calendar,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SpotlightCard from "@/components/ui/SpotlightCard";

const curriculum = [
  {
    week: "Week 1",
    title: "Foundations & Modern Stack",
    icon: Code,
    color: "cyan" as const,
    topics: [
      "AI-assisted development workflows",
      "Modern web & mobile architecture",
      "TypeScript, React, React Native",
      "APIs, databases & cloud basics",
    ],
  },
  {
    week: "Week 2",
    title: "Enterprise App Development",
    icon: Smartphone,
    color: "blue" as const,
    topics: [
      "Build production-grade web apps",
      "Cross-platform mobile (iOS & Android)",
      "Auth, payments & real-time features",
      "Testing, CI/CD & deployment",
    ],
  },
  {
    week: "Week 3",
    title: "Legacy Systems & System Design",
    icon: GitMerge,
    color: "violet" as const,
    topics: [
      "Refactoring legacy codebases",
      "System design patterns at scale",
      "Microservices & event-driven architecture",
      "Performance optimization & observability",
    ],
  },
  {
    week: "Week 4",
    title: "Portfolio & Career Launch",
    icon: FolderOpen,
    color: "emerald" as const,
    topics: [
      "Ship a capstone project end-to-end",
      "Build a standout portfolio",
      "Technical interview prep",
      "Warm introductions to hiring partners",
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  cyan:    { bg: "from-cyan-500/10 to-transparent",    border: "border-cyan-500/20",    text: "text-cyan-400",    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",    icon: "bg-cyan-500/10 border-cyan-500/20" },
  blue:    { bg: "from-blue-500/10 to-transparent",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/10 border-blue-500/20 text-blue-300",    icon: "bg-blue-500/10 border-blue-500/20" },
  violet:  { bg: "from-violet-500/10 to-transparent",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/10 border-violet-500/20 text-violet-300",  icon: "bg-violet-500/10 border-violet-500/20" },
  emerald: { bg: "from-emerald-500/10 to-transparent", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", icon: "bg-emerald-500/10 border-emerald-500/20" },
};

const outcomes = [
  { icon: Video,           label: "Daily Office Hours" },
  { icon: LayoutDashboard, label: "Hands-On Projects" },
  { icon: Handshake,       label: "Warm Introductions" },
  { icon: FolderOpen,      label: "Portfolio You Own" },
  { icon: Users,           label: "Cohort Network" },
  { icon: Zap,             label: "AI-First Curriculum" },
];

const stats = [
  { icon: Calendar, label: "4 Weeks" },
  { icon: Clock,    label: "Daily Office Hours" },
  { icon: Code,     label: "Hands-On Projects" },
  { icon: Star,     label: "Portfolio Included" },
];

export function TrainingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Programs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore programs to level up your engineering career.
        </p>
      </div>

      {/* Program Card */}
      <SpotlightCard
        spotlightColor="rgba(14, 165, 233, 0.12)"
        className="p-6 sm:p-8"
      >
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-xl font-bold text-foreground">AI Engineering</h2>
          <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-[10px] uppercase tracking-wider">
            Now Enrolling
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-5">
          A 4-week, hands-on program that takes you from beginner to job-ready AI
          engineer — with daily office hours, real projects, and introductions to
          hiring partners in Atlanta.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4 mb-8">
          {stats.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Icon className="w-3.5 h-3.5 text-primary" />
              {label}
            </div>
          ))}
        </div>

        {/* Curriculum grid */}
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Curriculum
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {curriculum.map((week) => {
            const c = colorMap[week.color];
            const Icon = week.icon;
            return (
              <div
                key={week.week}
                className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-4`}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg border ${c.icon} flex items-center justify-center`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.text}`}>
                      {week.week}
                    </span>
                    <p className="text-xs font-medium text-foreground leading-tight">
                      {week.title}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {week.topics.map((t) => (
                    <li
                      key={t}
                      className="text-[11px] text-muted-foreground leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/40"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Outcomes row */}
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          What You Get
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {outcomes.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
            >
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
          <div>
            <span className="text-2xl font-bold text-foreground">$500</span>
            <span className="text-sm text-muted-foreground ml-2">one-time</span>
          </div>
          <Button size="lg" className="rounded-full" asChild>
            <Link to="/ai-engineer">
              Begin Registration <ArrowRight />
            </Link>
          </Button>
        </div>
      </SpotlightCard>
    </div>
  );
}
