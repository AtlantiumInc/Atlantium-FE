import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ApprovalOverlay } from "@/components/ApprovalOverlay";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The member chrome — sidebar, header, content area.
 *
 * The dashboard used to own this markup, so any page routed outside it lost the
 * sidebar entirely and became a dead end: no way back, no sense of where you
 * are. Anything a signed-in member sees belongs inside this shell, and it lives
 * here so there's one copy rather than one per route.
 */
const SECTION_COPY: Record<string, { eyebrow: string; title: string }> = {
  "/network": { eyebrow: "Community", title: "Your network" },
  "/messages": { eyebrow: "Community", title: "Messages" },
  "/discover": { eyebrow: "Community", title: "Find people" },
  "/members": { eyebrow: "Community", title: "Member" },
};

export function MemberShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [aiOpen, setAiOpen] = useState(false);

  const needsApproval = !user?.is_approved && !user?.is_admin;
  const key = Object.keys(SECTION_COPY).find((p) => location.pathname.startsWith(p));
  const copy = key ? SECTION_COPY[key] : { eyebrow: "Atlantium", title: "Lab" };

  // The sidebar's non-route items switch panes inside the dashboard, so send
  // those back there rather than leaving the click dead.
  const activeId = key === "/messages" ? "messages" : key === "/discover" ? "discover" : "network";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {needsApproval && <ApprovalOverlay />}
      <div className="flex h-screen gap-3 p-3">
        <Sidebar
          activePage={activeId}
          aiOpen={aiOpen}
          onAIToggle={() => setAiOpen((open) => !open)}
          onNavigate={(page) => navigate(`/dashboard?section=${page}`)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 py-2">
            <div className="min-w-[7rem] shrink-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {copy.eyebrow}
              </p>
              <h1 className="truncate text-base font-semibold">{copy.title}</h1>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <ProfileDropdown user={user} onLogout={logout} />
            </div>
          </header>

          <section className="flex-1 overflow-y-auto p-5 md:p-8">{children}</section>
        </main>
      </div>
    </div>
  );
}
