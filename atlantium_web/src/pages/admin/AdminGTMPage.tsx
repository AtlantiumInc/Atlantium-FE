import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Target,
  Clock,
  DollarSign,
  BarChart3,
  Calendar,
  Instagram,
  Youtube,
  MessageSquare,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  TrendingUp,
  Users,
  MousePointerClick,
  Eye,
  CreditCard,
} from "lucide-react";

interface ScheduleBlock {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  icon: typeof Sun;
  color: string;
  bgColor: string;
  borderColor: string;
  tasks: string[];
}

const schedule: ScheduleBlock[] = [
  {
    id: "content",
    startHour: 8,
    endHour: 10,
    title: "Content & Distribution",
    icon: Sun,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    tasks: [
      "Find 2-3 viral AI/generative media clips to repost on Instagram (Reels)",
      "Write captions that position Atlantium as the community for AI filmmakers",
      "Add CTA in bio + caption: \"Link in bio to join our AI Filmmaking focus group\"",
      "Schedule posts (or post live)",
    ],
  },
  {
    id: "studio",
    startHour: 11,
    endHour: 13,
    title: "Studio Content",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    tasks: [
      "Record 1 short-form video (60-90s) from studio covering latest AI news/tool",
      "Film as the founder -- face on camera, builds trust",
      "Post to Instagram Reels + TikTok",
      "Repurpose audio clip as Instagram Story",
    ],
  },
  {
    id: "engagement",
    startHour: 14,
    endHour: 16,
    title: "Engagement & Conversion",
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    tasks: [
      "Respond to all DMs and comments from morning posts",
      "DM warm leads who engaged with content (liked, commented, saved)",
      "Script: \"Hey [name], saw you're into AI filmmaking -- we're running a focus group starting soon, would you want to learn more?\"",
      "Send interested leads to /focus-groups page or direct signup link",
    ],
  },
  {
    id: "youtube",
    startHour: 17,
    endHour: 19,
    title: "YouTube & Review",
    icon: Youtube,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    tasks: [
      "2x/week: Edit and post long-form YouTube video (10-20 min, AI filmmaking deep dive)",
      "Other days: Clip YouTube content into 3-5 short-form pieces for next day",
      "Review daily metrics: new signups, conversion rate, revenue",
    ],
  },
];

const CHECKLIST_KEY = "gtm_checklist";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ChecklistData {
  date: string;
  checked: Record<string, boolean>;
}

function loadChecklist(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return {};
    const data: ChecklistData = JSON.parse(raw);
    if (data.date !== getTodayKey()) {
      localStorage.removeItem(CHECKLIST_KEY);
      return {};
    }
    return data.checked;
  } catch {
    return {};
  }
}

function saveChecklist(checked: Record<string, boolean>) {
  const data: ChecklistData = { date: getTodayKey(), checked };
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
}

function useChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(loadChecklist);

  // Schedule reset at midnight
  useEffect(() => {
    const scheduleReset = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 0, 0);
      let ms = midnight.getTime() - now.getTime();
      if (ms <= 0) {
        // Already past 11:59, schedule for next day
        midnight.setDate(midnight.getDate() + 1);
        ms = midnight.getTime() - now.getTime();
      }
      return setTimeout(() => {
        setChecked({});
        localStorage.removeItem(CHECKLIST_KEY);
      }, ms);
    };
    const timer = scheduleReset();
    return () => clearTimeout(timer);
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveChecklist(next);
      return next;
    });
  };

  return { checked, toggle };
}

function taskKey(blockId: string, taskIndex: number): string {
  return `${blockId}:${taskIndex}`;
}

function getCurrentBlock(now: Date): { current: ScheduleBlock | null; next: ScheduleBlock | null; status: "before" | "active" | "between" | "after" } {
  const hour = now.getHours();
  const currentBlock = schedule.find((b) => hour >= b.startHour && hour < b.endHour) || null;
  if (currentBlock) {
    const idx = schedule.indexOf(currentBlock);
    const next = idx < schedule.length - 1 ? schedule[idx + 1] : null;
    return { current: currentBlock, next, status: "active" };
  }
  if (hour < schedule[0].startHour) {
    return { current: null, next: schedule[0], status: "before" };
  }
  if (hour >= schedule[schedule.length - 1].endHour) {
    return { current: null, next: null, status: "after" };
  }
  // Between blocks
  const next = schedule.find((b) => b.startHour > hour) || null;
  return { current: null, next, status: "between" };
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr} ${ampm}`;
}

function CurrentTaskBanner() {
  const [now, setNow] = useState(new Date());
  const { checked, toggle } = useChecklist();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { current, next, status } = getCurrentBlock(now);
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Count totals
  const totalTasks = schedule.reduce((sum, b) => sum + b.tasks.length, 0);
  const completedTasks = schedule.reduce(
    (sum, b) => sum + b.tasks.filter((_, i) => checked[taskKey(b.id, i)]).length,
    0
  );

  // Status line
  let statusText = "";
  if (status === "after") {
    statusText = "Day Complete -- Review your numbers and rest up for tomorrow.";
  } else if (status === "before" && next) {
    statusText = `Up next: ${next.title} at ${formatHour(next.startHour)}`;
  } else if (status === "between" && next) {
    statusText = `Break -- ${next.title} starts at ${formatHour(next.startHour)}`;
  } else if (current) {
    statusText = `Now: ${current.title}`;
  }

  return (
    <div className="space-y-3">
      {/* Status header */}
      <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {status === "active" && current ? (
            <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center", current.bgColor, current.borderColor)}>
              <current.icon className={cn("h-5 w-5", current.color)} />
            </div>
          ) : status === "after" ? (
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Moon className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : next ? (
            <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center", next.bgColor, next.borderColor)}>
              <next.icon className={cn("h-5 w-5", next.color)} />
            </div>
          ) : null}
          <div>
            <div className="flex items-center gap-2">
              {status === "active" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              <h3 className="font-semibold">{statusText}</h3>
              <span className="text-xs text-muted-foreground font-mono">{timeStr}</span>
            </div>
            {status === "active" && current && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", current.bgColor.replace("/10", ""))}
                    style={{ width: `${Math.min(((now.getHours() - current.startHour) * 60 + now.getMinutes()) / ((current.endHour - current.startHour) * 60) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatHour(current.startHour)} - {formatHour(current.endHour)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          {completedTasks}/{totalTasks} done
        </div>
      </div>

      {/* All blocks with checkable tasks */}
      <div className="grid gap-3">
        {schedule.map((block) => {
          const isActive = current?.id === block.id;
          const blockDone = block.tasks.every((_, i) => checked[taskKey(block.id, i)]);
          const hour = now.getHours();
          const isPast = hour >= block.endHour && !isActive;
          const isFuture = hour < block.startHour;

          return (
            <div
              key={block.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-all",
                isActive && `border-2 ${block.borderColor}`,
                blockDone && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", block.bgColor, block.borderColor)}>
                  <block.icon className={cn("h-4 w-4", block.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    )}
                    <h4 className="font-semibold text-sm">{block.title}</h4>
                    {blockDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatHour(block.startHour)} - {formatHour(block.endHour)}
                    {isPast && !blockDone && " · past"}
                    {isFuture && " · upcoming"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {block.tasks.filter((_, i) => checked[taskKey(block.id, i)]).length}/{block.tasks.length}
                </span>
              </div>
              <ul className="space-y-1 ml-[48px]">
                {block.tasks.map((task, i) => {
                  const key = taskKey(block.id, i);
                  const isDone = !!checked[key];
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm cursor-pointer group"
                      onClick={() => toggle(key)}
                    >
                      <div className={cn(
                        "h-4 w-4 mt-0.5 shrink-0 rounded border flex items-center justify-center transition-colors",
                        isDone
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-muted-foreground/30 group-hover:border-muted-foreground/60"
                      )}>
                        {isDone && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span className={cn(
                        "transition-colors",
                        isDone ? "text-muted-foreground/50 line-through" : "text-muted-foreground"
                      )}>
                        {task}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const tabs = [
  { id: "revenue", label: "Revenue Model", icon: DollarSign },
  { id: "daily", label: "Daily Ops", icon: Clock },
  { id: "weekly", label: "Weekly Plan", icon: Calendar },
  { id: "kpis", label: "KPIs", icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]["id"];

function RevenueTab() {
  return (
    <div className="space-y-6">
      {/* Target */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Target className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">$5K / Day Target</h3>
            <p className="text-sm text-muted-foreground">Annual focus group memberships</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-foreground">$497<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
            <div className="text-sm text-muted-foreground mt-1">Standard Membership</div>
            <div className="mt-3 text-xs text-muted-foreground">
              ~10 sales/day = <span className="font-semibold text-emerald-500">$4,970/day</span>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold text-foreground">$247<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
            <div className="text-sm text-muted-foreground mt-1">Atlanta Scholarship</div>
            <div className="mt-3 text-xs text-muted-foreground">
              50/50 mix: ~13-14 sales/day for <span className="font-semibold text-emerald-500">$5K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold text-lg mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {[
            { stage: "Instagram / YouTube impressions", metric: "~50K/day", color: "bg-blue-500", width: "100%" },
            { stage: "Profile visits", metric: "~2,500", color: "bg-blue-400", width: "60%" },
            { stage: "Link clicks to atlantium.ai", metric: "~500", color: "bg-violet-500", width: "35%" },
            { stage: "Focus group page visits", metric: "~200", color: "bg-violet-400", width: "20%" },
            { stage: "Signups started", metric: "~50", color: "bg-emerald-500", width: "10%" },
            { stage: "Payments completed", metric: "10-14", color: "bg-emerald-400", width: "5%" },
          ].map((item) => (
            <div key={item.stage} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{item.stage}</span>
                  <span className="text-sm font-semibold text-muted-foreground">{item.metric}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", item.color)} style={{ width: item.width }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Focus Group */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold text-lg mb-2">Primary Focus Group</h3>
        <p className="text-muted-foreground text-sm mb-4">Current enrollment priority</p>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <span className="text-2xl">🎬</span>
          </div>
          <div>
            <div className="font-semibold text-lg">Generative Media / AI Filmmaking</div>
            <div className="text-sm text-muted-foreground">Traffic sources: Instagram (reposted AI content + studio originals) & YouTube (long-form)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyOpsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-2">
        Four daily blocks designed to generate 10-14 new annual members per day.
      </p>

      {schedule.map((block) => (
        <div key={block.title} className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center", block.bgColor, block.borderColor)}>
              <block.icon className={cn("h-5 w-5", block.color)} />
            </div>
            <div>
              <h3 className="font-semibold">{block.title}</h3>
              <span className="text-xs text-muted-foreground font-mono">{formatHour(block.startHour)} - {formatHour(block.endHour)}</span>
            </div>
          </div>
          <ul className="space-y-2">
            {block.tasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WeeklyTab() {
  const days = [
    {
      day: "Monday",
      focus: "Planning",
      tasks: ["Plan week's content themes (tie to AI news cycle)", "Identify trending topics & tools to cover"],
    },
    {
      day: "Tuesday",
      focus: "Execution",
      tasks: ["Standard daily ops cadence", "Focus on Instagram growth"],
    },
    {
      day: "Wednesday",
      focus: "YouTube",
      tasks: ["Record long-form YouTube video (10-20 min)", "AI filmmaking deep dive or tool review"],
    },
    {
      day: "Thursday",
      focus: "Execution",
      tasks: ["Standard daily ops cadence", "Push engagement & DM outreach"],
    },
    {
      day: "Friday",
      focus: "Review",
      tasks: ["Review week's numbers", "Adjust pricing/messaging if needed", "A/B test landing page copy"],
    },
    {
      day: "Saturday",
      focus: "Batch Create",
      tasks: ["Batch-create 5-7 repost clips for next week", "Schedule content ahead"],
    },
    {
      day: "Sunday",
      focus: "Rest / Light",
      tasks: ["Optional: engage with community", "Prep Monday planning notes"],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-2">
        Weekly rhythm balancing content creation, distribution, and review.
      </p>

      <div className="grid gap-3">
        {days.map((d) => (
          <div key={d.day} className="rounded-xl border bg-card p-4 flex gap-4">
            <div className="w-24 shrink-0">
              <div className="font-semibold text-sm">{d.day}</div>
              <div className="text-xs text-muted-foreground">{d.focus}</div>
            </div>
            <ul className="space-y-1 flex-1">
              {d.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-muted-foreground/40 mt-0.5">-</span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPIsTab() {
  const kpis = [
    {
      category: "Awareness",
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      metrics: [
        { name: "Instagram impressions", target: "50K/day" },
        { name: "Instagram profile visits", target: "2,500/day" },
        { name: "YouTube views", target: "10K/week" },
      ],
    },
    {
      category: "Traffic",
      icon: MousePointerClick,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      metrics: [
        { name: "Link clicks to atlantium.ai", target: "500/day" },
        { name: "Focus group page visits", target: "200/day" },
        { name: "UTM-tracked conversions", target: "Track daily" },
      ],
    },
    {
      category: "Conversion",
      icon: Users,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      metrics: [
        { name: "Signups started", target: "50/day" },
        { name: "Signups completed", target: "20/day" },
        { name: "Page-to-signup rate", target: ">10%" },
      ],
    },
    {
      category: "Revenue",
      icon: CreditCard,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      metrics: [
        { name: "Payments received", target: "10-14/day" },
        { name: "Daily revenue", target: "$5,000" },
        { name: "Monthly revenue", target: "$150K" },
      ],
    },
    {
      category: "Growth",
      icon: TrendingUp,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      metrics: [
        { name: "Instagram followers", target: "Track weekly" },
        { name: "YouTube subscribers", target: "Track weekly" },
        { name: "Email list size", target: "Track weekly" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-2">
        Track these daily to stay on pace for $5K/day revenue.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.category} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", kpi.bgColor)}>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <h3 className="font-semibold">{kpi.category}</h3>
            </div>
            <div className="space-y-3">
              {kpi.metrics.map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{m.name}</span>
                  <span className="text-sm font-semibold font-mono">{m.target}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminGTMPage() {
  const [activeTab, setActiveTab] = useState<TabId>("revenue");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Go-To-Market Plan</h2>
        <p className="text-muted-foreground mt-1">
          Focus group membership funnel -- $5K/day target via Instagram & YouTube.
        </p>
      </div>

      {/* Current Task */}
      <CurrentTaskBanner />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "revenue" && <RevenueTab />}
      {activeTab === "daily" && <DailyOpsTab />}
      {activeTab === "weekly" && <WeeklyTab />}
      {activeTab === "kpis" && <KPIsTab />}
    </div>
  );
}
