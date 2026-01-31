import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Calendar,
  Trophy,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageCircle,
  UserPlus,
  FolderKanban,
} from "lucide-react";

interface SidebarProps {
  onNavigate?: (page: string) => void;
  activePage?: string;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onNavigate,
  activePage = "hq",
  onLogout,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {

  const navItems = [
    {
      id: "frontier",
      icon: <Compass size={20} />,
      label: "Frontier",
    },
    {
      id: "events",
      icon: <Calendar size={20} />,
      label: "Events",
    },
    {
      id: "messages",
      icon: <MessageCircle size={20} />,
      label: "Messages",
    },
    {
      id: "connections",
      icon: <UserPlus size={20} />,
      label: "Connections",
    },
    {
      id: "projects",
      icon: <FolderKanban size={20} />,
      label: "Projects",
    },
    {
      id: "leaderboard",
      icon: <Trophy size={20} />,
      label: "Leaderboard",
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header */}
      <div className={cn(
        "relative flex items-center h-14 border-b border-border px-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {collapsed ? (
          <>
            <button onClick={() => onNavigate?.("hq")} className="hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Atlantium" className="h-8 w-8" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-6 w-6 absolute -right-3 top-1/2 -translate-y-1/2 bg-card border border-border rounded-full shadow-sm"
            >
              <ChevronRight size={14} />
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={() => onNavigate?.("hq")}
              className="font-semibold hover:text-primary transition-colors"
            >
              Atlantium
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8"
            >
              <ChevronLeft size={16} />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activePage === item.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              collapsed && "justify-center px-2"
            )}
            onClick={() => onNavigate?.(item.id)}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
          onClick={onLogout}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
