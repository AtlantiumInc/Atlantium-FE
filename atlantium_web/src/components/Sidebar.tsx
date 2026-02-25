import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MessageCircle,
  Radio,
  UserPlus,
  Users,
} from "lucide-react";

interface SidebarProps {
  onNavigate?: (page: string) => void;
  activePage?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onNavigate,
  activePage = "hq",
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {

  const navItems = [
    {
      id: "lobby",
      icon: <Radio size={20} />,
      label: "Lobby",
    },
    {
      id: "events",
      icon: <Calendar size={20} />,
      label: "Events",
    },
    {
      id: "messages",
      icon: <MessageCircle size={20} />,
      label: "Inbox",
    },
    {
      id: "groups",
      icon: <Users size={20} />,
      label: "Groups",
    },
    {
      id: "connections",
      icon: <UserPlus size={20} />,
      label: "Connections",
    },
    {
      id: "training",
      icon: <GraduationCap size={20} />,
      label: "Training",
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
      <div className="h-14 border-b border-border px-2 flex items-center justify-between">
        <Button
          variant={activePage === "hq" ? "secondary" : "ghost"}
          className={cn(
            "flex-1 justify-start gap-3",
            collapsed && "justify-center px-2"
          )}
          onClick={() => onNavigate?.("hq")}
        >
          <img
            src="/logo.png"
            alt="Atlantium"
            className={cn(
              "h-5 w-5 transition-opacity",
              activePage === "hq" ? "opacity-100" : "opacity-70"
            )}
          />
          {!collapsed && <span className="font-semibold">Atlantium</span>}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 flex-shrink-0"
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

    </aside>
  );
}
