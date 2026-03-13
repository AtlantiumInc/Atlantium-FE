import { cn } from "@/lib/utils";
import {
  Calendar,
  ContactRound,
  FlaskConical,
  MessageCircle,
  Radio,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

interface SidebarProps {
  onNavigate?: (page: string) => void;
  activePage?: string;
  onAIClick?: () => void;
  aiOpen?: boolean;
}

export function Sidebar({
  onNavigate,
  activePage = "hq",
  onAIClick,
  aiOpen = false,
}: SidebarProps) {

  const navItems = [
    { id: "lobby",       icon: <Radio size={20} />,        label: "Lobby" },
    { id: "playground",  icon: <FlaskConical size={20} />,  label: "Playground" },
    { id: "events",      icon: <Calendar size={20} />,      label: "Events" },
    { id: "messages",    icon: <MessageCircle size={20} />, label: "Inbox" },
    { id: "groups",      icon: <Users size={20} />,         label: "Groups" },
    { id: "connections", icon: <UserPlus size={20} />,      label: "Connections" },
    { id: "members",     icon: <ContactRound size={20} />,  label: "Members" },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-card border-r border-border flex flex-col items-center">
      {/* Logo */}
      <button
        onClick={() => onNavigate?.("hq")}
        className={cn(
          "h-14 w-full flex items-center justify-center border-b border-border transition-colors",
          activePage === "hq" ? "bg-secondary" : "hover:bg-muted/50"
        )}
      >
        <img
          src="/logo.png"
          alt="Atlantium"
          className={cn(
            "h-6 w-6 transition-opacity",
            activePage === "hq" ? "opacity-100" : "opacity-70"
          )}
        />
      </button>

      {/* Navigation */}
      <nav className="flex-1 w-full py-3 flex flex-col items-center gap-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className={cn(
              "group relative h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
              activePage === item.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {item.icon}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-md bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 shadow-lg">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* AI Button at bottom */}
      <div className="w-full px-2 pb-4">
        <button
          onClick={onAIClick}
          className={cn(
            "group relative h-10 w-10 mx-auto rounded-lg flex items-center justify-center transition-colors",
            aiOpen
              ? "bg-cyan-500/15 text-cyan-400"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Sparkles size={20} />
          {/* Tooltip */}
          <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-md bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 shadow-lg">
            AI Assistant
          </span>
        </button>
      </div>
    </aside>
  );
}
