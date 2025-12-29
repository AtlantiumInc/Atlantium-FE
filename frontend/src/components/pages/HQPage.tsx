import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Target,
  Trophy,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

interface HQPageProps {
  user?: {
    email?: string;
  };
}

// Demo articles for the top section
const FEATURED_ARTICLES = [
  {
    id: "1",
    title: "Claude 3.5 Sonnet Now Available",
    source: "Anthropic",
    image: null,
    tag: "AI Models",
  },
  {
    id: "2",
    title: "GPT-5 Research Preview",
    source: "OpenAI",
    image: null,
    tag: "Research",
  },
];

// Demo schedule items
const SCHEDULE_ITEMS = [
  { time: "09:00 AM", title: "Team Standup", type: "meeting" },
  { time: "11:30 AM", title: "Design Review", type: "meeting" },
  { time: "02:00 PM", title: "Code Review Session", type: "work" },
  { time: "04:00 PM", title: "1:1 with Mentor", type: "meeting" },
];

// Demo objectives
const USER_OBJECTIVES = [
  { title: "Complete TypeScript Course", progress: 75 },
  { title: "Ship MVP by Q1", progress: 45 },
  { title: "Read 12 Books", progress: 33 },
];

// Demo top builders
const TOP_BUILDERS = [
  { rank: 1, name: "Sarah Chen", username: "sarah_dev", additions: 2453, avatar: null },
  { rank: 2, name: "Marcus J.", username: "mjohnson", additions: 1876, avatar: null },
  { rank: 3, name: "Elena R.", username: "elena_r", additions: 1234, avatar: null },
];

// Demo next event
const NEXT_EVENT = {
  title: "AI Hackathon 2025",
  date: "Jan 15, 2025",
  time: "10:00 AM",
  attendees: 24,
};

export function HQPage({ user }: HQPageProps) {
  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  const userName = user?.email?.split("@")[0] || "User";
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex gap-6 w-full">
      {/* Left Column - Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Featured Articles - Top Row */}
        <div className="grid grid-cols-2 gap-4">
          {FEATURED_ARTICLES.map((article) => (
            <Card key={article.id} className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              <div className="aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    {article.tag}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-primary/40" />
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles size={12} />
                  {article.source}
                </p>
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Second Row - Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total Commits</span>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold">287</div>
              <p className="text-xs text-green-500 mt-1">+12% this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">PRs Merged</span>
                <Target size={16} className="text-primary" />
              </div>
              <div className="text-3xl font-bold">23</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Streak</span>
                <span className="text-2xl">🔥</span>
              </div>
              <div className="text-3xl font-bold">14</div>
              <p className="text-xs text-muted-foreground mt-1">Days active</p>
            </CardContent>
          </Card>
        </div>

        {/* Third Row - Next Event & Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Next Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{NEXT_EVENT.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {NEXT_EVENT.date} at {NEXT_EVENT.time}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users size={14} />
                  {NEXT_EVENT.attendees}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3">
                View Details
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-background">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm">New Post</Button>
                <Button variant="secondary" size="sm">Start Task</Button>
                <Button variant="secondary" size="sm">Join Chat</Button>
                <Button variant="secondary" size="sm">View Stats</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-4">
        {/* Welcome Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good morning,</p>
                <h2 className="text-xl font-semibold">{userName}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentDate} - {currentTime}
                </p>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback className="text-lg">{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={16} />
                Today's Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View all
                <ChevronRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {SCHEDULE_ITEMS.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">{item.time}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  item.type === "meeting" ? "bg-blue-500" : "bg-green-500"
                }`} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Objectives */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target size={16} className="text-amber-500" />
                Your Objectives
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View all
                <ChevronRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {USER_OBJECTIVES.map((obj, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="truncate">{obj.title}</span>
                  <span className="text-muted-foreground">{obj.progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${obj.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Builders Today */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                Top Builders Today
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOP_BUILDERS.map((builder) => (
              <div key={builder.rank} className="flex items-center gap-3">
                <span className={`font-bold w-5 ${
                  builder.rank === 1 ? "text-amber-500" :
                  builder.rank === 2 ? "text-gray-400" :
                  "text-amber-700"
                }`}>
                  #{builder.rank}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {builder.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{builder.name}</p>
                  <p className="text-xs text-muted-foreground">@{builder.username}</p>
                </div>
                <span className="text-xs text-green-500 font-medium">
                  +{builder.additions.toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
