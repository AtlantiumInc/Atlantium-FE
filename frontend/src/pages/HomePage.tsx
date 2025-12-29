import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

// Page components
import { HQPage } from "@/components/pages/HQPage";
import { FrontierPage } from "@/components/pages/FrontierPage";
import { ObjectivesPage } from "@/components/pages/ObjectivesPage";
import { InboxPage } from "@/components/pages/InboxPage";
import { LeaderboardPage } from "@/components/pages/LeaderboardPage";

export function HomePage() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState("hq");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNavigate = (page: string) => {
    setActivePage(page);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      hq: "HQ",
      frontier: "Frontier",
      objectives: "Objectives",
      inbox: "Inbox",
      leaderboard: "Leaderboard",
    };
    return titles[activePage] || "HQ";
  };

  const renderPage = () => {
    switch (activePage) {
      case "hq":
        return <HQPage user={user} />;
      case "frontier":
        return <FrontierPage />;
      case "objectives":
        return <ObjectivesPage />;
      case "inbox":
        return <InboxPage />;
      case "leaderboard":
        return <LeaderboardPage hasGithubConnected={false} />;
      default:
        return <HQPage user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={logout}
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
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 w-full">
          <div className={cn(
            "mx-auto",
            ["inbox", "leaderboard", "hq"].includes(activePage) ? "max-w-7xl" : "max-w-4xl"
          )}>
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}
