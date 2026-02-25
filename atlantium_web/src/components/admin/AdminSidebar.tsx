import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Rocket,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: "dashboard",
      path: "/admin",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
    },
    {
      id: "events",
      path: "/admin/events",
      icon: <Calendar size={20} />,
      label: "Events",
    },
    {
      id: "articles",
      path: "/admin/articles",
      icon: <FileText size={20} />,
      label: "Articles",
    },
    {
      id: "users",
      path: "/admin/users",
      icon: <Users size={20} />,
      label: "Users",
    },
    {
      id: "gtm",
      path: "/admin/gtm",
      icon: <Rocket size={20} />,
      label: "GTM Plan",
    },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={cn(
        "flex items-center h-14 border-b border-border px-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <span className="font-semibold">Admin</span>
          </div>
        )}
        {collapsed && <Shield size={20} className="text-primary" />}
        {/* Desktop collapse button */}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 hidden md:flex"
          >
            <ChevronLeft size={16} />
          </Button>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          className="h-8 w-8 md:hidden"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Expand button when collapsed (desktop only) */}
      {collapsed && (
        <div className="px-2 py-2 hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="w-full h-8"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={isActive(item.path) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              collapsed && "md:justify-center md:px-2"
            )}
            onClick={() => handleNav(item.path)}
          >
            {item.icon}
            {/* Always show label on mobile, respect collapsed on desktop */}
            <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "md:justify-center md:px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span className={cn(collapsed && "md:hidden")}>Logout</span>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base
          "fixed left-0 top-0 z-50 h-screen bg-card border-r border-border flex flex-col",
          // Mobile: slide in/out
          "transition-transform duration-300 w-56 md:transition-all md:duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible, width depends on collapsed
          "md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-56"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
