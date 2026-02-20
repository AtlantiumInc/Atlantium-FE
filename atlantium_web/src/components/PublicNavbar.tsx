import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatePresence, motion } from "motion/react";
import { X, Menu, ChevronRight } from "lucide-react";

const navLinks = [
  { to: "/mission",       label: "Mission" },
  { to: "/focus-groups",  label: "Focus Groups" },
  { to: "/services",      label: "Services" },
  { to: "/index",         label: "Newsroom" },
  { to: "/jobs",          label: "Jobs" },
  { to: "/training",      label: "Training" },
];

export function PublicNavbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="Atlantium" className="h-7 w-7 sm:h-8 sm:w-8" />
            <div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">Atlantium</span>
              <p className="hidden sm:block text-[10px] text-muted-foreground tracking-wide">Citizen Technology Lab</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2">
            {navLinks.map(({ to, label }) => {
              const isActive = pathname === to;
              return (
                <Link key={to} to={to}>
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
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100 border-0">
                Join Lab
              </Button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile right: Join Lab + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100 border-0 text-xs h-8 px-3">
                Join Lab
              </Button>
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col"
            style={{
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              backgroundColor: "rgba(0,0,0,0.75)",
            }}
          >
            {/* Close button */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <img src="/logo.png" alt="Atlantium" className="h-7 w-7" />
                <span className="text-lg font-bold tracking-tight text-white">Atlantium</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-white/70 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-6 py-4">
              {navLinks.map(({ to, label }, i) => {
                const isActive = pathname === to;
                return (
                  <motion.div
                    key={to}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.25 }}
                  >
                    <Link
                      to={to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between py-4 border-b border-white/10 group ${isActive ? "text-white" : "text-white/60"}`}
                    >
                      <span className="text-2xl font-semibold tracking-tight group-hover:text-white transition-colors">
                        {label}
                      </span>
                      <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-white/60 transition-colors" />
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="px-6 pb-10 pt-4 flex flex-col gap-3 border-t border-white/10"
            >
              <Link to="/signup" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2 bg-white text-black hover:bg-gray-100 border-0 h-12 text-base">
                  Join Lab
                </Button>
              </Link>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full h-12 text-base text-white/60 hover:text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
