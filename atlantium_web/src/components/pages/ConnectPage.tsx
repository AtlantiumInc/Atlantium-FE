import { useState } from "react";
import { cn } from "@/lib/utils";
import { Users, UserPlus, ContactRound } from "lucide-react";
import { GroupsPage } from "./GroupsPage";
import { ConnectionsPage } from "./ConnectionsPage";
import { MembersPage } from "./MembersPage";

interface ConnectPageProps {
  onNavigateToThread?: (threadId: string) => void;
}

const tabs = [
  { id: "groups", label: "Groups", icon: Users },
  { id: "connections", label: "Connections", icon: UserPlus },
  { id: "members", label: "Members", icon: ContactRound },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ConnectPage({ onNavigateToThread }: ConnectPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("groups");

  return (
    <div className="flex h-full">
      {/* Inner sidebar */}
      <div className="w-48 shrink-0 border-r border-border/50 py-3 px-2 flex flex-col gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left",
                activeTab === tab.id
                  ? "bg-white/10 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl">
          {activeTab === "groups" && (
            <GroupsPage onNavigateToThread={onNavigateToThread} />
          )}
          {activeTab === "connections" && <ConnectionsPage />}
          {activeTab === "members" && <MembersPage />}
        </div>
      </div>
    </div>
  );
}
