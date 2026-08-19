import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ApprovalOverlay } from "@/components/ApprovalOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * The member chrome — sidebar, header, content area.
 *
 * Every signed-in surface is a real route rendered inside this, rather than a
 * pane switched by local state. That means each one is linkable, survives a
 * refresh, and works with the back button; and the chrome exists once instead
 * of once per page.
 */
export const MEMBER_SECTIONS: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Dashboard", title: "Member HQ" },
  "/lobby": { eyebrow: "Community", title: "Lobby" },
  "/partners": { eyebrow: "Creator program", title: "Partners" },
  "/playground": { eyebrow: "Workspace", title: "Playground" },
  "/network": { eyebrow: "Community", title: "Your network" },
  "/messages": { eyebrow: "Community", title: "Messages" },
  "/discover": { eyebrow: "Community", title: "Find people" },
  "/members": { eyebrow: "Community", title: "Member" },
};

/** Sidebar id ↔ route, so the active item and the URL can't drift apart. */
export const SIDEBAR_ROUTES: Record<string, string> = {
  hq: "/dashboard",
  lobby: "/lobby",
  discover: "/discover",
  network: "/network",
  messages: "/messages",
  partners: "/partners",
  playground: "/playground",
};

export function MemberShell({
  children,
  title,
  /** Full-bleed: the surface manages its own scrolling (the lobby does). */
  fullBleed = false,
  headerSlotId,
}: {
  children: React.ReactNode;
  title?: string;
  fullBleed?: boolean;
  headerSlotId?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [aiOpen, setAiOpen] = useState(false);

  const needsApproval = !user?.is_approved && !user?.is_admin;
  const path = Object.keys(MEMBER_SECTIONS).find((p) => location.pathname.startsWith(p));
  const copy = path ? MEMBER_SECTIONS[path] : { eyebrow: "Atlantium", title: "Network" };
  const activeId = Object.entries(SIDEBAR_ROUTES).find(([, route]) => route === path)?.[0] ?? "hq";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {needsApproval && <ApprovalOverlay />}
      <div className="flex h-screen gap-3 p-3">
        <Sidebar
          activePage={activeId}
          aiOpen={aiOpen}
          onAIToggle={() => setAiOpen((open) => !open)}
          onNavigate={(page) => navigate(SIDEBAR_ROUTES[page] ?? "/dashboard")}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 py-2">
            <div className="min-w-[7rem] shrink-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.eyebrow}
              </p>
              {/* `title` lets a page name itself once it knows — a member's
                  profile can't until it has loaded them. */}
              <h1 className="truncate text-base font-semibold">{title ?? copy.title}</h1>
            </div>

            {headerSlotId && <div id={headerSlotId} className="flex min-w-0 flex-1 justify-end" />}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <ProfileDropdown user={user} onLogout={logout} />
            </div>
          </header>

          <section className={cn("flex-1", fullBleed ? "min-h-0 overflow-hidden p-4" : "overflow-y-auto p-5 md:p-8")}>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
