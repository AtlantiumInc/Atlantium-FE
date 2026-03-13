import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { AccessPendingOverlay } from "@/components/AccessPendingOverlay";
import { useAuth } from "@/contexts/AuthContext";

// Page components
import { HQPage } from "@/components/pages/HQPage";
import { FrontierPage } from "@/components/pages/FrontierPage";
import { EventsPage } from "@/components/pages/EventsPage";
import { LeaderboardPage } from "@/components/pages/LeaderboardPage";
import { MessagesPage } from "@/components/pages/MessagesPage";
import { ConnectPage } from "@/components/pages/ConnectPage";
import { ProjectsPage } from "@/components/pages/ProjectsPage";
import { LobbyPage } from "@/components/pages/LobbyPage";
import { PricingPage } from "@/components/pages/PricingPage";
import { PlaygroundPage } from "@/components/pages/PlaygroundPage";

export function DashboardPage() {
  const { user, logout, hasAccess } = useAuth();
  const [activePage, setActivePage] = useState("hq");
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  if (!hasAccess) {
    return <AccessPendingOverlay onLogout={logout} />;
  }

  const handleNavigate = (page: string) => {
    setActivePage(page);
    if (page !== "messages") {
      setInitialThreadId(null);
    }
  };

  const handleNavigateToThread = (threadId: string) => {
    setInitialThreadId(threadId);
    setActivePage("messages");
  };

  const pageTitles: Record<string, string> = {
    hq: "HQ",
    lobby: "Lobby",
    frontier: "Frontier",
    events: "Events",
    messages: "Inbox",
    connect: "Connect",
    projects: "Projects",
    leaderboard: "Leaderboard",
    pricing: "Pricing",
    playground: "Playground",
  };

  const renderPage = () => {
    switch (activePage) {
      case "hq":
        return <HQPage user={user ?? undefined} onNavigateToThread={handleNavigateToThread} />;
      case "lobby":
        return <LobbyPage />;
      case "frontier":
        return <FrontierPage />;
      case "events":
        return <EventsPage />;
      case "messages":
        return <MessagesPage initialThreadId={initialThreadId} onThreadSelected={() => setInitialThreadId(null)} />;
      case "connect":
        return <ConnectPage onNavigateToThread={handleNavigateToThread} />;
      case "projects":
        return <ProjectsPage />;
      case "leaderboard":
        return <LeaderboardPage hasGithubConnected={false} />;
      case "pricing":
        return <PricingPage />;
      case "playground":
        return <PlaygroundPage />;
      default:
        return <HQPage user={user ?? undefined} onNavigateToThread={handleNavigateToThread} />;
    }
  };

  const isFullBleed = activePage === "messages" || activePage === "lobby" || activePage === "playground" || activePage === "connect";

  return (
    <div className="h-screen w-screen bg-background p-3 flex gap-3 overflow-hidden">
      {/* Sidebar — in flex flow, expands into chat */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        aiOpen={aiOpen}
        onAIToggle={() => setAiOpen(!aiOpen)}
      />

      {/* Main content — flexes to fill remaining space */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Top bar — outside the card */}
        <div className="flex items-center justify-end gap-3 px-2 pb-2 shrink-0">
          <ThemeToggle />
          <ProfileDropdown user={user} onLogout={logout} />
        </div>

        {/* Page card */}
        <main className="flex-1 min-h-0 bg-card/40 border border-border/50 rounded-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <header className="h-12 border-b border-border/50 flex items-center px-5 shrink-0">
            <h1 className="text-sm font-semibold">{pageTitles[activePage] || "HQ"}</h1>
          </header>

          {isFullBleed ? (
            <div className="flex-1 min-h-0">
              {renderPage()}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className={cn(
                "mx-auto",
                ["leaderboard", "hq", "events", "projects", "pricing"].includes(activePage) ? "max-w-7xl" : "max-w-4xl"
              )}>
                {renderPage()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
