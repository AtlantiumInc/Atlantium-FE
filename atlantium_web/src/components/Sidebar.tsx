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
    <aside className="fixed left-3 top-3 bottom-3 z-40 w-[4.5rem] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl flex flex-col items-center shadow-lg">
      {/* Logo */}
      <button
        onClick={() => onNavigate?.("hq")}
        className={cn(
          "h-16 w-full flex items-center justify-center rounded-t-2xl transition-colors",
          activePage === "hq" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <img
          src="/logo.png"
          alt="Atlantium"
          className={cn(
            "h-7 w-7 transition-opacity",
            activePage === "hq" ? "opacity-100" : "opacity-60"
          )}
        />
      </button>

      {/* Navigation */}
      <nav className="flex-1 w-full py-2 flex flex-col items-center gap-1.5 px-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className={cn(
              "group relative h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-150",
              activePage === item.id
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            {item.icon}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 shadow-xl">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* AI Button at bottom */}
      <div className="w-full px-3 pb-4">
        <button
          onClick={onAIClick}
          className={cn(
            "group relative h-11 w-11 mx-auto rounded-xl flex items-center justify-center transition-all duration-150",
            aiOpen
              ? "bg-cyan-500/15 text-cyan-400"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          )}
        >
          <Sparkles size={20} />
          {/* Tooltip */}
          <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 shadow-xl">
            AI Assistant
          </span>
        </button>
      </div>
    </aside>
  );
}
