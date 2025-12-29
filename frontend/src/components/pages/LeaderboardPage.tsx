import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Github, Plus, MapPin, Calendar, Linkedin, X } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  rank: number;
  name: string;
  username: string;
  avatarUrl?: string;
  additions: number;
  deletions: number;
  commits: number;
  prs: number;
}

const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { rank: 1, name: "Sarah Chen", username: "sarah_dev", additions: 12453, deletions: 3421, commits: 87, prs: 23 },
  { rank: 2, name: "Marcus Johnson", username: "mjohnson", additions: 9876, deletions: 2134, commits: 65, prs: 18 },
  { rank: 3, name: "Elena Rodriguez", username: "elena_r", additions: 8234, deletions: 1987, commits: 54, prs: 15 },
  { rank: 4, name: "David Kim", username: "dkim_codes", additions: 6543, deletions: 1234, commits: 43, prs: 12 },
  { rank: 5, name: "Priya Patel", username: "priyap", additions: 5432, deletions: 987, commits: 38, prs: 9 },
  { rank: 6, name: "Alex Thompson", username: "athompson", additions: 4876, deletions: 876, commits: 35, prs: 8 },
  { rank: 7, name: "Jordan Lee", username: "jlee_dev", additions: 4234, deletions: 765, commits: 32, prs: 7 },
  { rank: 8, name: "Taylor Swift", username: "tswift_code", additions: 3987, deletions: 654, commits: 29, prs: 6 },
  { rank: 9, name: "Chris Park", username: "cpark", additions: 3654, deletions: 543, commits: 26, prs: 5 },
];

interface LeaderboardPageProps {
  hasGithubConnected?: boolean;
}

type TimeFilter = "all" | "daily" | "weekly" | "monthly";

// Profile Preview Component
function ProfilePreview({
  entry,
  onClose
}: {
  entry: LeaderboardEntry;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-2 w-72 bg-card border rounded-lg shadow-lg p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-muted rounded"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={entry.avatarUrl} />
          <AvatarFallback className="text-lg">
            {entry.name.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-semibold">{entry.name}</h4>
          <p className="text-sm text-muted-foreground">@{entry.username}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <MapPin size={14} />
          San Francisco
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          Joined 2023
        </span>
      </div>

      <Button variant="outline" size="sm" className="w-full gap-2">
        <Linkedin size={16} />
        LinkedIn
      </Button>
    </div>
  );
}

// Clickable Avatar with Profile Preview
function ProfileAvatar({
  entry,
  size = "default"
}: {
  entry: LeaderboardEntry;
  size?: "default" | "small";
}) {
  const [showProfile, setShowProfile] = useState(false);
  const avatarSize = size === "small" ? "h-10 w-10" : "h-12 w-12";
  const textSize = size === "small" ? "text-xs" : "text-base";

  return (
    <div className="relative">
      <button
        onClick={() => setShowProfile(!showProfile)}
        className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
      >
        <Avatar className={`${avatarSize} cursor-pointer hover:ring-2 hover:ring-primary transition-all`}>
          <AvatarImage src={entry.avatarUrl} />
          <AvatarFallback className={textSize}>
            {entry.name.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
      </button>
      {showProfile && (
        <ProfilePreview entry={entry} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

export function LeaderboardPage({ hasGithubConnected = false }: LeaderboardPageProps) {
  const [isConnected, setIsConnected] = useState(hasGithubConnected);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const handleConnectGithub = () => {
    toast.info("Redirecting to GitHub OAuth...");
  };

  const top3 = LEADERBOARD_DATA.slice(0, 3);
  const rest = LEADERBOARD_DATA.slice(3);

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl font-semibold">Diff Leaderboard</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Filter Tabs */}
          <div className="flex bg-muted rounded-lg p-1">
            {(["all", "daily", "weekly", "monthly"] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                  timeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter === "all" ? "All Time" : filter}
              </button>
            ))}
          </div>
          {!isConnected && (
            <Button onClick={handleConnectGithub} size="sm" className="gap-2 ml-4">
              <Github size={16} />
              <Plus size={14} />
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* GitHub Connection Banner */}
      {!isConnected && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-background rounded-full">
                  <Github className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Connect your GitHub account</h3>
                  <p className="text-sm text-muted-foreground">
                    Link your GitHub to track your contributions and compete on the leaderboard
                  </p>
                </div>
              </div>
              <Button onClick={handleConnectGithub} className="gap-2">
                <Github size={18} />
                Connect with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((entry, index) => (
          <Card key={entry.rank} className={`${index === 1 ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-4">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <ProfileAvatar entry={entry} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{entry.name}</span>
                    <span className="text-amber-500 font-bold">#{entry.rank}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">@{entry.username}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Additions</p>
                  <p className="font-semibold text-green-500">+{formatNumber(entry.additions)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Deletions</p>
                  <p className="font-semibold text-red-500">-{formatNumber(entry.deletions)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Commits</p>
                  <p className="font-semibold">{entry.commits}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">PRs</p>
                  <p className="font-semibold">{entry.prs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-10 gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground uppercase tracking-wide min-w-[700px]">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">Developer</div>
            <div className="col-span-2 text-right">Additions</div>
            <div className="col-span-2 text-right">Deletions</div>
            <div className="col-span-1 text-right">Commits</div>
            <div className="col-span-1 text-right">PRs</div>
          </div>

          {/* Table Rows */}
          {rest.map((entry) => (
            <div
              key={entry.rank}
              className="grid grid-cols-10 gap-4 px-4 py-3 border-b border-border last:border-0 items-center hover:bg-muted/30 transition-colors min-w-[700px]"
            >
              {/* Rank */}
              <div className="col-span-1 font-medium text-muted-foreground">
                {entry.rank}
              </div>

              {/* Developer */}
              <div className="col-span-3 flex items-center gap-3">
                <ProfileAvatar entry={entry} size="small" />
                <div>
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-sm text-muted-foreground">@{entry.username}</p>
                </div>
              </div>

              {/* Additions */}
              <div className="col-span-2 text-right">
                <span className="text-green-500 font-medium">+{entry.additions.toLocaleString()}</span>
              </div>

              {/* Deletions */}
              <div className="col-span-2 text-right">
                <span className="text-red-500 font-medium">-{entry.deletions.toLocaleString()}</span>
              </div>

              {/* Commits */}
              <div className="col-span-1 text-right font-medium">
                {entry.commits}
              </div>

              {/* PRs */}
              <div className="col-span-1 text-right font-medium">
                {entry.prs}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
