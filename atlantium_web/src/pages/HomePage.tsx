import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { ProfileDropdown } from "@/components/ProfileDropdown";
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

export function HomePage() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState("hq");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);

  const handleNavigate = (page: string) => {
    setActivePage(page);
    // Clear initial thread when navigating away from messages
    if (page !== "messages") {
      setInitialThreadId(null);
    }
  };

  const handleNavigateToThread = (threadId: string) => {
    setInitialThreadId(threadId);
    setActivePage("messages");
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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
      projects: "Projects",
      leaderboard: "Leaderboard",
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
      case "projects":
        return <ProjectsPage />;
      case "leaderboard":
        return <LeaderboardPage hasGithubConnected={false} />;
      default:
        return <HQPage user={user ?? undefined} onNavigateToThread={handleNavigateToThread} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main content area */}
      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          sidebarCollapsed ? "pl-16" : "pl-56"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileDropdown user={user} onLogout={logout} />
          </div>
        </header>

        {/* Page content */}
        {activePage === "messages" || activePage === "lobby" ? (
          // Full-bleed pages with no padding
          <div className="w-full h-[calc(100vh-3.5rem)]">
            {renderPage()}
          </div>
        ) : (
          <div className="p-6 w-full">
            <div className={cn(
              "mx-auto",
              ["connections", "leaderboard", "hq", "events", "projects", "groups"].includes(activePage) ? "max-w-7xl" : "max-w-4xl"
            )}>
              {renderPage()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
