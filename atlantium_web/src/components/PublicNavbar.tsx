import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ReactNode } from "react";


const navLinks = [
  { to: "/mission", label: "Mission" },
  { to: "/focus-groups", label: "Focus Groups" },
  { to: "/services", label: "Services" },
  { to: "/index", label: "Newsroom" },
  { to: "/jobs", label: "Jobs" },
];

interface PublicNavbarProps {
  center?: ReactNode;
}

export function PublicNavbar({ center }: PublicNavbarProps) {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
      <div className="w-full px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="Atlantium" className="h-7 w-7 sm:h-8 sm:w-8" />
            <div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">Atlantium</span>
              <p className="hidden sm:block text-[10px] text-muted-foreground tracking-wide">Citizen Technology Lab</p>
            </div>
          </Link>
        </div>

        {center && <div>{center}</div>}

        <div className="flex items-center gap-1 sm:gap-4">
          {navLinks.map(({ to, label }) => {
            const isActive = pathname === to;
            return (
              <Link key={to} to={to} className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative text-muted-foreground hover:text-foreground ${isActive ? "text-foreground" : ""}`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-2 right-2 h-[2px] rounded-full bg-foreground/60" />
                  )}
                </Button>
              </Link>
            );
          })}
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="gap-1.5 sm:gap-2 bg-white text-black hover:bg-gray-100 border-0 text-xs sm:text-sm">
              Enter Lab
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
