import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "motion/react";
import { X, Menu, ChevronRight, Users, Wrench, BookOpen, Newspaper, Briefcase, GraduationCap, Building2 } from "lucide-react";

const solutionItems = [
  {
    to: "/services",
    label: "Services",
    description: "Custom AI solutions, integrations, and consulting for your business",
    icon: Wrench,
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop&q=80",
  },
  {
    to: "/focus-groups",
    label: "Focus Groups",
    description: "Live video sessions with builders tackling real-world AI projects",
    icon: Users,
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop&q=80",
  },
  {
    to: "/training",
    label: "AI Engineer Training",
    description: "4-week hands-on program — build enterprise apps, daily office hours, warm introductions",
    icon: GraduationCap,
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=250&fit=crop&q=80",
  },
  {
    to: "/jobs",
    label: "Job Board",
    description: "Curated AI engineering roles from top companies in your area",
    icon: Briefcase,
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=250&fit=crop&q=80",
  },
];

const resourceItems = [
  {
    to: "/docs",
    label: "Docs",
    description: "Guides, reports, and long reads for building with AI",
    icon: BookOpen,
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=250&fit=crop&q=80",
  },
  {
    to: "/directory",
    label: "Directory",
    description: "Grants, investors, and Atlanta companies hiring — verified and deadline-sorted",
    icon: Building2,
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=250&fit=crop&q=80",
  },
  {
    to: "/blog",
    label: "Blog",
    description: "Atlanta tech, covered — the people, companies, and money moving the scene",
    icon: Newspaper,
    image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&h=250&fit=crop&q=80",
  },
];

const missionLink = { to: "/mission", label: "Mission" };

/** An uploaded picture lives on the profile record, not on the auth user, so
 *  the navbar has to look in both. Cached for the session: this runs on every
 *  public page and the answer doesn't change mid-visit. */
const PROFILE_AVATAR_KEY = "atlantium_profile_avatar";

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.charAt(0).toUpperCase();
  return "U";
}

/** When `reading` is set the bar collapses to hamburger + article identity —
 *  used by the blog reader once the header scrolls away. Other pages pass
 *  nothing and render exactly as before. */
export function PublicNavbar({ reading }: { reading?: { title: string; coverUrl?: string | null; meta?: string | null } | null } = {}) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(
    () => sessionStorage.getItem(PROFILE_AVATAR_KEY),
  );
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  // Mobile accordion state
  const [mobileSolutions, setMobileSolutions] = useState(false);
  const [mobileResources, setMobileResources] = useState(false);
  const solutionsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resourcesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solutionsRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  const handleSolutionsEnter = () => {
    if (solutionsTimeout.current) clearTimeout(solutionsTimeout.current);
    setSolutionsOpen(true);
  };
  const handleSolutionsLeave = () => {
    solutionsTimeout.current = setTimeout(() => setSolutionsOpen(false), 150);
  };
  const handleResourcesEnter = () => {
    if (resourcesTimeout.current) clearTimeout(resourcesTimeout.current);
    setResourcesOpen(true);
  };
  const handleResourcesLeave = () => {
    resourcesTimeout.current = setTimeout(() => setResourcesOpen(false), 150);
  };

  // Close on route change
  useEffect(() => { setOpen(false); setSolutionsOpen(false); setResourcesOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!user || user.avatar || profileAvatar !== null) return;
    let cancelled = false;
    api.getProfile()
      .then((p) => {
        if (cancelled) return;
        const url = p.avatar_url ?? "";
        sessionStorage.setItem(PROFILE_AVATAR_KEY, url);
        setProfileAvatar(url);
      })
      .catch(() => { /* initials are a fine fallback */ });
    return () => { cancelled = true; };
  }, [user?.id, user?.avatar, profileAvatar]);

  const isSolutionsActive = solutionItems.some(s => pathname === s.to);
  const isResourcesActive = resourceItems.some(r => pathname === r.to);

  const avatarLink = user ? (
    <Link to="/dashboard" aria-label="Your profile" className="shrink-0">
      <Avatar className="h-8 w-8 border border-border/50 hover:border-cyan-500/40 transition-colors">
        <AvatarImage src={user.avatar || profileAvatar || undefined} alt={user.display_name ?? user.email} />
        <AvatarFallback className="text-[11px] font-medium">
          {getInitials(user.display_name ?? user.first_name, user.email)}
        </AvatarFallback>
      </Avatar>
    </Link>
  ) : null;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="w-full px-6 h-16 flex items-center">
          {/* Left — reading mode swaps the wordmark for the article's identity */}
          {reading ? (
            <div className="flex items-center gap-2.5 min-w-0 mr-3">
              {/* Dropped on mobile: the title needs the width, and the
                  hamburger still gets you everywhere. */}
              <Link to="/" className="shrink-0 hidden sm:block">
                <img src="/logo.png" alt="Atlantium" className="h-7 w-7" />
              </Link>
              {reading.coverUrl && (
                <img
                  src={reading.coverUrl}
                  alt=""
                  className="h-8 w-12 rounded object-cover border border-border/40 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{reading.title}</p>
                {reading.meta && (
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{reading.meta}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <img src="/logo.png" alt="Atlantium" className="h-7 w-7 sm:h-8 sm:w-8" />
                <div>
                  <span className="text-lg sm:text-xl font-bold tracking-tight">Atlantium</span>
                  <p className="hidden sm:block text-[10px] text-muted-foreground tracking-wide">Citizen Technology Network</p>
                </div>
              </Link>
              <Link to={missionLink.to} className="hidden sm:inline-flex">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
                  pathname === missionLink.to
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                }`}>
                  Our Mission
                </span>
              </Link>
            </div>
          )}

          {/* Nav links — pushed right; reading mode drops them for the hamburger */}
          <div className={reading ? "hidden" : "hidden md:flex items-center gap-1 ml-auto mr-3"}>
            {/* Solutions dropdown trigger */}
            <div
              ref={solutionsRef}
              className="relative"
              onMouseEnter={handleSolutionsEnter}
              onMouseLeave={handleSolutionsLeave}
            >
              <Button
                variant="ghost"
                size="sm"
                className={`relative text-muted-foreground hover:text-foreground gap-1 ${isSolutionsActive ? "text-foreground" : ""}`}
              >
                Solutions
                <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${solutionsOpen ? "rotate-90" : ""}`} />
                {isSolutionsActive && (
                  <span className="absolute -bottom-1 left-2 right-2 h-[2px] rounded-full bg-foreground/60" />
                )}
              </Button>

              {/* Mega menu dropdown */}
              <AnimatePresence>
                {solutionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed left-6 right-6 top-[72px] mx-auto w-[980px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border/50 bg-background shadow-2xl shadow-black/25 p-4 z-[60]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Solutions</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {solutionItems.map(({ to, label, description, icon: Icon, image }) => (
                        <Link
                          key={to}
                          to={to}
                          className="group rounded-xl overflow-hidden border border-border/40 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                        >
                          <div className="relative h-36 overflow-hidden">
                            <img
                              src={image}
                              alt={label}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-base font-semibold text-white">{label}</span>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Resources dropdown trigger */}
            <div
              ref={resourcesRef}
              className="relative"
              onMouseEnter={handleResourcesEnter}
              onMouseLeave={handleResourcesLeave}
            >
              <Button
                variant="ghost"
                size="sm"
                className={`relative text-muted-foreground hover:text-foreground gap-1 ${isResourcesActive ? "text-foreground" : ""}`}
              >
                Resources
                <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${resourcesOpen ? "rotate-90" : ""}`} />
                {isResourcesActive && (
                  <span className="absolute -bottom-1 left-2 right-2 h-[2px] rounded-full bg-foreground/60" />
                )}
              </Button>

              <AnimatePresence>
                {resourcesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed left-6 right-6 top-[72px] mx-auto w-[820px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border/50 bg-background shadow-2xl shadow-black/25 p-4 z-[60]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Resources</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {resourceItems.map(({ to, label, description, icon: Icon, image }) => (
                        <Link
                          key={to}
                          to={to}
                          className="group rounded-xl overflow-hidden border border-border/40 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all duration-200"
                        >
                          <div className="relative h-36 overflow-hidden">
                            <img
                              src={image}
                              alt={label}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-base font-semibold text-white">{label}</span>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Partners — direct link to the creator program */}
            <Link to="/creator-program">
              <Button
                variant="ghost"
                size="sm"
                className={`relative text-muted-foreground hover:text-foreground ${pathname === "/creator-program" ? "text-foreground" : ""}`}
              >
                Partners
                {pathname === "/creator-program" && (
                  <span className="absolute -bottom-1 left-2 right-2 h-[2px] rounded-full bg-foreground/60" />
                )}
              </Button>
            </Link>
          </div>

          {/* Right — Auth stacked + theme */}
          <div className={reading ? "hidden" : "hidden md:flex items-center gap-3 shrink-0"}>
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100 border-0 h-8 text-xs px-3">
                    Enter Network
                  </Button>
                </Link>
                {avatarLink}
              </>
            ) : (
              <div className="flex flex-col items-center">
                <Link to="/signup" className="cursor-pointer">
                  <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100 border-0 h-7 text-xs px-3 cursor-pointer">
                    Join Network
                  </Button>
                </Link>
                <Link to="/login" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                  Sign In
                </Link>
              </div>
            )}
            <ThemeToggle />
          </div>

          {/* Right: Join Network + hamburger. Reading mode keeps this at every width. */}
          <div className={`items-center gap-2 ml-auto shrink-0 ${reading ? "flex" : "flex md:hidden"}`}>
            {/* Signed in, the avatar carries both jobs at this width: it says
                who you are and it's the way in. Keeps the title room back. */}
            {user ? avatarLink : (
              <Link to="/signup">
                <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100 border-0 text-xs h-8 px-3">
                  Join Network
                </Button>
              </Link>
            )}
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
              backgroundColor: "rgba(10,18,35,0.95)",
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
              {/* Mission */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.25 }}
              >
                <Link
                  to={missionLink.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center py-4 border-b border-white/10 group ${pathname === missionLink.to ? "text-white" : "text-white/60"}`}
                >
                  <span className="text-2xl font-semibold tracking-tight group-hover:text-white transition-colors">
                    {missionLink.label}
                  </span>
                </Link>
              </motion.div>

              {/* Solutions accordion */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <button
                  onClick={() => setMobileSolutions(!mobileSolutions)}
                  className="flex items-center justify-between py-4 border-b border-white/10 w-full text-white/60"
                >
                  <span className="text-2xl font-semibold tracking-tight">Solutions</span>
                  <ChevronRight className={`h-5 w-5 text-white/30 transition-transform duration-200 ${mobileSolutions ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {mobileSolutions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {solutionItems.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 py-3 pl-4 border-b border-white/5 group ${pathname === to ? "text-white" : "text-white/50"}`}
                        >
                          <Icon className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
                          <span className="text-lg font-medium group-hover:text-white transition-colors">{label}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Resources accordion */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                <button
                  onClick={() => setMobileResources(!mobileResources)}
                  className="flex items-center justify-between py-4 border-b border-white/10 w-full text-white/60"
                >
                  <span className="text-2xl font-semibold tracking-tight">Resources</span>
                  <ChevronRight className={`h-5 w-5 text-white/30 transition-transform duration-200 ${mobileResources ? "rotate-90" : ""}`} />
                </button>
                <AnimatePresence>
                  {mobileResources && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {resourceItems.map(({ to, label, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 py-3 pl-4 border-b border-white/5 group ${pathname === to ? "text-white" : "text-white/50"}`}
                        >
                          <Icon className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" />
                          <span className="text-lg font-medium group-hover:text-white transition-colors">{label}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Partners */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Link
                  to="/creator-program"
                  onClick={() => setOpen(false)}
                  className={`w-full flex items-center justify-between py-4 border-b border-white/10 ${pathname === "/creator-program" ? "text-white" : "text-white/90"}`}
                >
                  <span className="text-2xl font-semibold tracking-tight">Partners</span>
                  <ChevronRight className="h-5 w-5 text-white/30" />
                </Link>
              </motion.div>

            </nav>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
              className="px-6 pb-10 pt-4 flex flex-col gap-3 border-t border-white/10"
            >
              {user ? (
                <Link to="/dashboard" onClick={() => setOpen(false)}>
                  <Button className="w-full gap-2 bg-white text-black hover:bg-gray-100 border-0 h-12 text-base">
                    Enter Network
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup" onClick={() => setOpen(false)}>
                    <Button className="w-full gap-2 bg-white text-black hover:bg-gray-100 border-0 h-12 text-base">
                      Join Network
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full h-12 text-base text-white/60 hover:text-white hover:bg-white/10">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
