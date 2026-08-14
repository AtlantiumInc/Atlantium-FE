import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "motion/react";
import BorderGlow from "@/components/ui/BorderGlow";
import { Users, Wrench, BookOpen, Newspaper, Briefcase, GraduationCap, Building2 } from "lucide-react";

type DeckItem = {
  to: string;
  label: string;
  description: string;
  icon: typeof Wrench;
  readout: string | null;
  featured?: boolean;
};

const solutionItems: DeckItem[] = [
  {
    to: "/services",
    label: "Services",
    description: "Custom AI solutions, integrations, and consulting for your business",
    icon: Wrench,
    readout: "Custom builds",
  },
  {
    to: "/focus-groups",
    label: "Focus Groups",
    description: "Live video sessions with builders tackling real-world AI projects",
    icon: Users,
    readout: "Live cohorts",
  },
  {
    to: "/jobs",
    label: "Job Board",
    description: "Curated AI engineering roles from top companies in your area",
    icon: Briefcase,
    readout: null, // live: "{total} live roles · {new} new this week"
  },
  {
    to: "/training",
    label: "AI Engineer Training",
    description: "8-week AI engineering intensive — live sessions, a real client build, warm introductions",
    icon: GraduationCap,
    readout: "8 weeks · 30 seats",
    /** Closing position + the Boomin home-button border glow: the one item
     *  that sells something gets the moving light. */
    featured: true,
  },
];

const resourceItems: DeckItem[] = [
  {
    to: "/docs",
    label: "Docs",
    description: "Guides, reports, and long reads for building with AI",
    icon: BookOpen,
    readout: "Guides + reports",
  },
  {
    to: "/directory",
    label: "Directory",
    description: "Grants, investors, and Atlanta companies hiring — verified and deadline-sorted",
    icon: Building2,
    readout: null, // live: "{companies} companies · {investors} investors"
  },
  {
    to: "/blog",
    label: "Blog",
    description: "Atlanta tech, covered — the people, companies, and money moving the scene",
    icon: Newspaper,
    readout: "Atlanta, covered",
  },
];

const platformSections = [
  { num: "01", title: "Solutions", items: solutionItems },
  { num: "02", title: "Resources", items: resourceItems },
];

/** Live instrument readouts for the Platform panel — real numbers from the
 *  board and directory, fetched once per session on first open. A failed
 *  fetch leaves the static fallbacks; never show a zero we didn't measure. */
const READOUTS_KEY = "atlantium_platform_readouts";
let readoutsPromise: Promise<Record<string, string>> | null = null;

function usePlatformReadouts(open: boolean) {
  const [live, setLive] = useState<Record<string, string>>(() => {
    try { return JSON.parse(sessionStorage.getItem(READOUTS_KEY) ?? "{}"); } catch { return {}; }
  });
  useEffect(() => {
    if (!open || Object.keys(live).length > 0) return;
    readoutsPromise ??= Promise.allSettled([
      api.getJobPostingsPaged({ limit: 1 }),
      api.getDirectory({ limit: 1 }),
    ]).then(([jobs, dir]) => {
      const out: Record<string, string> = {};
      if (jobs.status === "fulfilled" && jobs.value.total > 0) {
        out["/jobs"] = `${jobs.value.total.toLocaleString()} live roles · ${(jobs.value.counts.new_this_week ?? 0).toLocaleString()} new this week`;
      }
      if (dir.status === "fulfilled" && (dir.value.counts?.company ?? 0) > 0) {
        out["/directory"] = `${dir.value.counts.company.toLocaleString()} companies · ${(dir.value.counts.investor ?? 0).toLocaleString()} investors`;
      }
      return out;
    });
    let cancelled = false;
    readoutsPromise.then((out) => {
      if (cancelled || Object.keys(out).length === 0) return;
      sessionStorage.setItem(READOUTS_KEY, JSON.stringify(out));
      setLive(out);
    });
    return () => { cancelled = true; };
  }, [open, live]);
  return live;
}

const missionLink = { to: "/mission", label: "Mission" };

/** Wayfinding readout left of the logo — tells you where you are, and by
 *  being obviously an instrument label, points you at the logo for the menu. */
function pageTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  const map: Array<[string, string]> = [
    ["/jobs", "Job Board"],
    ["/directory", "Directory"],
    ["/grants", "Directory"],
    ["/training", "Training"],
    ["/services", "Services"],
    ["/focus-groups", "Focus Groups"],
    ["/docs", "Docs"],
    ["/blog", "Blog"],
    ["/mission", "Mission"],
    ["/creator-program", "Partners"],
    ["/pricing", "Pricing"],
    ["/dashboard", "Network"],
    ["/community", "Community"],
  ];
  const hit = map.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
  if (hit) return hit[1];
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  return seg.replace(/-/g, " ") || "Atlantium";
}

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileAvatar, setProfileAvatar] = useState<string | null>(
    () => sessionStorage.getItem(PROFILE_AVATAR_KEY),
  );
  const [platformOpen, setPlatformOpen] = useState(false);
  // Hover state for the living logo; once wanted, the video stays mounted so
  // it never re-downloads, and later hovers resume instantly.
  const [logoHover, setLogoHover] = useState(false);
  const [logoVideoWanted, setLogoVideoWanted] = useState(false);
  useEffect(() => {
    if (logoHover || platformOpen) setLogoVideoWanted(true);
  }, [logoHover, platformOpen]);
  const liveReadouts = usePlatformReadouts(platformOpen);

  // Close on route change
  useEffect(() => { setPlatformOpen(false); }, [pathname]);

  /** Deck navigation rides the View Transitions API: fold the deck and swap
   *  the route inside one snapshot, so the new page wipes in with no flash.
   *  (The Link viewTransition prop needs a data router; this app mounts a
   *  declarative BrowserRouter, so we drive the API ourselves.) Modified
   *  clicks keep native behavior — new tab beats cool vibe. */
  const deckGo = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const go = () => { setPlatformOpen(false); navigate(to); };
    if (document.startViewTransition) document.startViewTransition(() => { flushSync(go); });
    else go();
  };

  // The deck is click-driven (the logo is the button), so give it the two
  // standard dismissals a modal surface owes: Escape and click-outside.
  useEffect(() => {
    if (!platformOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPlatformOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [platformOpen]);

  // Prevent body scroll while the deck is unfolded
  useEffect(() => {
    document.body.style.overflow = platformOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [platformOpen]);

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
            /* Left — where you are. The readout is the visual cue that the
               centered logo is the way everywhere else. */
            <div className="flex-1 basis-0 min-w-0 flex items-center">
              <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground truncate">
                <span className="text-primary/60 mr-1.5">//</span>
                {platformOpen ? "Index" : pageTitle(pathname)}
                <span className="ml-0.5 text-primary/70 animate-pulse">▍</span>
              </span>
            </div>
          )}

          {/* Center — the logo IS the menu button, at every width */}
          {!reading && (
            <div className="relative shrink-0">
              <button
                onClick={() => setPlatformOpen((o) => !o)}
                onPointerEnter={() => setLogoHover(true)}
                onPointerLeave={() => setLogoHover(false)}
                aria-label={platformOpen ? "Close menu" : "Open menu"}
                aria-expanded={platformOpen}
                className={`group relative h-11 w-11 rounded-full overflow-hidden border transition-all duration-300 ${
                  platformOpen
                    ? "border-cyan-400/60 shadow-[0_0_24px_rgba(0,212,255,0.25)]"
                    : "border-border/60 hover:border-cyan-400/40 hover:shadow-[0_0_18px_rgba(0,212,255,0.15)]"
                }`}
              >
                {/* The mark on its mountain — path to the frontier, cropped to
                    the circle. Hover swaps in the living version: the video
                    only ever loads after the first hover. */}
                <img
                  src="/nav-logo.png"
                  alt="Atlantium"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${platformOpen ? "scale-110" : "group-hover:scale-110"}`}
                />
                {logoVideoWanted && (
                  <video
                    src="/nav-logo.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${logoHover || platformOpen ? "opacity-100" : "opacity-0"}`}
                  />
                )}
              </button>
              {/* idle ping advertises that the mark is a control, not a
                  decoration — outside the button so overflow-hidden can crop
                  the media without eating the ring */}
              {!platformOpen && (
                <span className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping [animation-duration:3s] pointer-events-none" />
              )}

            </div>
          )}


          {/* Right — one control: avatar rides inside Enter Network (same
              destination, one button). Theme toggle lives in the deck now. */}
          <div className={reading ? "hidden" : "hidden md:flex flex-1 basis-0 items-center justify-end"}>
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="gap-2 bg-white text-black hover:bg-gray-100 border-0 h-9 text-xs pl-1.5 pr-3.5 rounded-full">
                  <Avatar className="h-6 w-6 border border-black/10">
                    <AvatarImage src={user.avatar || profileAvatar || undefined} alt={user.display_name ?? user.email} />
                    <AvatarFallback className="text-[9px] font-medium bg-black/10 text-black">
                      {getInitials(user.display_name ?? user.first_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  Enter Network
                </Button>
              </Link>
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
          </div>

          {/* Right (mobile + reading): auth only — the centered logo is the
              menu. Reading mode hides the center, so a mini mark stands in. */}
          <div className={`items-center gap-2 flex-1 basis-0 justify-end shrink-0 ${reading ? "flex" : "flex md:hidden"}`}>
            {/* Signed in, the avatar carries both jobs at this width: it says
                who you are and it's the way in. Keeps the title room back. */}
            {user ? avatarLink : (
              <Link to="/signup">
                <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100 border-0 text-xs h-8 px-3">
                  Join Network
                </Button>
              </Link>
            )}
            {reading && (
              <button
                onClick={() => setPlatformOpen((o) => !o)}
                aria-label={platformOpen ? "Close menu" : "Open menu"}
                aria-expanded={platformOpen}
                className={`h-8 w-8 flex items-center justify-center rounded-full border transition-all ${
                  platformOpen ? "border-cyan-400/60 bg-cyan-400/5" : "border-border/60 hover:border-cyan-400/40"
                }`}
              >
                <img src="/logo.png" alt="" className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* The deck IS the bar: same surface, same blur — the bar's bottom
            edge simply travels down. Height-animated so the border-b rides
            the unfolding edge. */}
        <AnimatePresence>
          {platformOpen && (
            <>
              {/* page dims behind the whole nav (negative z keeps it under
                  the bar+deck; nav's own z-50 wins the viewport) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setPlatformOpen(false)}
                className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[3px]"
              />
              <motion.section
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                {/* scan line where the bar's old edge was */}
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                <div className="max-w-5xl mx-auto px-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="grid md:grid-cols-2 md:divide-x divide-border/40">
                    {platformSections.map(({ num, title, items }, si) => (
                      <div key={num} className={`py-6 min-w-0 ${si === 0 ? "md:pr-8" : "md:pl-8"}`}>
                        <div className="flex items-baseline gap-2 mb-4 px-1">
                          <span className="font-mono text-[11px] text-primary/80">{num}</span>
                          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
                          <span className="flex-1 border-t border-dashed border-border/40 self-center" />
                        </div>
                        <div className="flex flex-col gap-1">
                          {items.map(({ to, label, description, icon: Icon, readout, featured }, ii) => {
                            const row = (
                              <Link
                                to={to}
                                onClick={(e) => deckGo(e, to)}
                                className={`group block rounded-lg px-3 py-2.5 border transition-all duration-150 ${
                                  featured
                                    ? "border-transparent"
                                    : pathname === to
                                      ? "border-primary/30 bg-primary/5"
                                      : "border-transparent hover:border-border/60 hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 shrink-0 rounded-md border border-border/50 bg-muted/30 flex items-center justify-center group-hover:border-primary/40 group-hover:text-primary transition-colors">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-3 min-w-0">
                                      <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
                                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/80 group-hover:text-primary/80 transition-colors truncate">
                                        {liveReadouts[to] ?? readout ?? ""}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                                  </div>
                                </div>
                              </Link>
                            );
                            return (
                              <motion.div
                                key={to}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + (si * 4 + ii) * 0.03, duration: 0.2 }}
                              >
                                {featured ? (
                                  <BorderGlow
                                    animated
                                    className="deck-featured"
                                    borderRadius={10}
                                    glowRadius={14}
                                    glowIntensity={1.15}
                                    glowColor="189 100 60"
                                    backgroundColor="hsl(var(--background))"
                                    colors={["#00d4ff", "#38bdf8", "#22d3ee"]}
                                  >
                                    {row}
                                  </BorderGlow>
                                ) : row}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* footer strip — links that left the bar, plus the theme switch */}
                  <div className="flex items-center justify-between py-3 border-t border-border/40">
                    <div className="flex items-center gap-5">
                      <Link to="/" onClick={(e) => deckGo(e, "/")} className="text-xs font-semibold hover:text-primary transition-colors">Atlantium</Link>
                      <Link to={missionLink.to} onClick={(e) => deckGo(e, missionLink.to)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Our Mission</Link>
                      <Link to="/creator-program" onClick={(e) => deckGo(e, "/creator-program")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Partners</Link>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">esc to close</span>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </motion.section>
            </>
          )}
        </AnimatePresence>
      </nav>

    </>
  );
}
