import { useState } from "react";
import type { ComponentType } from "react";
import {
  FlaskConical,
  Radio,
  Sparkles,
} from "lucide-react";
import { ApprovalOverlay } from "@/components/ApprovalOverlay";
import { LobbyPage } from "@/components/pages/LobbyPage";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type DashboardSection = "hq" | "lobby" | "playground";

const sectionCopy: Record<DashboardSection, {
  title: string;
  eyebrow: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = {
  hq: {
    title: "Member HQ",
    eyebrow: "Dashboard",
    description: "Your Atlantium profile is active. This first Neon-backed dashboard keeps login stable while the Xano-era feature data is migrated.",
    icon: Sparkles,
  },
  lobby: {
    title: "Lobby",
    eyebrow: "Community",
    description: "Member chat, office hours, schedule, and live room access.",
    icon: Radio,
  },
  playground: {
    title: "Playground",
    eyebrow: "Workspace",
    description: "Project and AI assistant tools will come back into this shell without blocking auth.",
    icon: FlaskConical,
  },
};

const quickStats = [
  { label: "Profile", value: "Active" },
  { label: "Membership", value: "Free" },
  { label: "Auth", value: "Neon" },
];

export function MemberDashboardPage() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState<DashboardSection>("hq");
  const [aiOpen, setAiOpen] = useState(false);
  const active = sectionCopy[activePage];
  const ActiveIcon = active.icon;
  const lobbyHeaderSlotId = "member-dashboard-lobby-controls";

  const needsApproval = !user?.is_approved && !user?.is_admin;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {needsApproval && <ApprovalOverlay />}
      <div className="flex h-screen gap-3 p-3">
        <Sidebar
          activePage={activePage}
          aiOpen={aiOpen}
          onAIToggle={() => setAiOpen((open) => !open)}
          onNavigate={(page) => setActivePage(page as DashboardSection)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 py-2">
            <div className="min-w-[7rem] shrink-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {active.eyebrow}
              </p>
              <h1 className="truncate text-base font-semibold">{active.title}</h1>
            </div>

            {activePage === "lobby" && (
              <div
                id={lobbyHeaderSlotId}
                className="flex min-w-0 flex-1 justify-end"
              />
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <ProfileDropdown user={user} onLogout={logout} />
            </div>
          </header>

          <section className={cn(
            "flex-1",
            activePage === "lobby" ? "min-h-0 overflow-hidden p-4" : "overflow-y-auto p-5 md:p-8"
          )}>
            {activePage === "lobby" ? (
              <LobbyPage headerPortalId={lobbyHeaderSlotId} />
            ) : (
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                    <ActiveIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                      Welcome{user?.display_name ? `, ${user.display_name}` : ""}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {active.description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {quickStats.map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border/60 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                      <p className="mt-2 text-lg font-semibold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-lg border border-border/60 bg-background/60 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(sectionCopy).map(([id, item]) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActivePage(id as DashboardSection)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                            activePage === id
                              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                              : "border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
