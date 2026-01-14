import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Compass,
  Calendar,
  Trophy,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  MessageCircle,
  UserPlus,
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
      id: "hq",
      icon: <Home size={20} />,
      label: "HQ",
    },
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
        "flex items-center h-14 border-b border-border px-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Menu size={20} className="text-muted-foreground" />
            <span className="font-semibold">Atlantium</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
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
