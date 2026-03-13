import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { AccessPendingOverlay } from "@/components/AccessPendingOverlay";
import { useAuth } from "@/contexts/AuthContext";

// Page components
import { HQPage } from "@/components/pages/HQPage";
import { FrontierPage } from "@/components/pages/FrontierPage";
import { EventsPage } from "@/components/pages/EventsPage";
import { LeaderboardPage } from "@/components/pages/LeaderboardPage";
import { MessagesPage } from "@/components/pages/MessagesPage";
import { GroupsPage } from "@/components/pages/GroupsPage";
import { ConnectionsPage } from "@/components/pages/ConnectionsPage";
import { ProjectsPage } from "@/components/pages/ProjectsPage";
import { LobbyPage } from "@/components/pages/LobbyPage";
import { PricingPage } from "@/components/pages/PricingPage";
import { PlaygroundPage } from "@/components/pages/PlaygroundPage";
import { MembersPage } from "@/components/pages/MembersPage";

export function DashboardPage() {
  const { user, logout, hasAccess } = useAuth();
  const [activePage, setActivePage] = useState("hq");
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  // If user doesn't have access, show pending approval overlay
  if (!hasAccess) {
    return <AccessPendingOverlay onLogout={logout} />;
  }

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setAiOpen(false);
    if (page !== "messages") {
      setInitialThreadId(null);
    }
  };

  const handleNavigateToThread = (threadId: string) => {
    setInitialThreadId(threadId);
    setActivePage("messages");
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      hq: "HQ",
      lobby: "Lobby",
      frontier: "Frontier",
      events: "Events",
      messages: "Inbox",
      groups: "Groups",
      connections: "Connections",
      members: "Members",
      projects: "Projects",
      leaderboard: "Leaderboard",
      pricing: "Pricing",
      playground: "Playground",
    };
    return titles[activePage] || "HQ";
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
      case "groups":
        return <GroupsPage onNavigateToThread={handleNavigateToThread} />;
      case "connections":
        return <ConnectionsPage />;
      case "members":
        return <MembersPage />;
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

  const isFullBleed = activePage === "messages" || activePage === "lobby" || activePage === "playground";

  return (
    <div className="h-screen w-screen bg-background p-3 flex gap-3 overflow-hidden">
      {/* Sidebar — floating, rendered inline in the flex layout */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onAIClick={() => setAiOpen(!aiOpen)}
        aiOpen={aiOpen}
      />

      {/* AI Chat Panel */}
      <AIChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Click-away overlay when AI panel is open */}
      {aiOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setAiOpen(false)}
        />
      )}

      {/* Main content — takes remaining space, offset for the fixed sidebar */}
      <main className="flex-1 ml-[4.5rem] flex flex-col min-h-0 bg-card/40 border border-border/50 rounded-2xl overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card/60 backdrop-blur-sm border-b border-border/50 flex items-center justify-between px-6 shrink-0 rounded-t-2xl">
          <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileDropdown user={user} onLogout={logout} />
          </div>
        </header>

        {/* Page content */}
        {isFullBleed ? (
          <div className="flex-1 min-h-0">
            {renderPage()}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className={cn(
              "mx-auto",
              ["connections", "members", "leaderboard", "hq", "events", "projects", "groups", "pricing"].includes(activePage) ? "max-w-7xl" : "max-w-4xl"
            )}>
              {renderPage()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
