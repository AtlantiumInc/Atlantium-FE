import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requestNotificationPermission } from "@/lib/notifications";
import SpotlightCard from "@/components/ui/SpotlightCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  MapPin,
  XCircle,
  Users,
  ArrowRight,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { MembershipGate, UpgradePrompt } from "@/components/subscription";
import type { Thread } from "@/lib/types";

interface FrontierArticle {
  id: string;
  content: {
    title: string;
    body: string;
    tags: string[];
    tldr: string[];
    author: {
      name: string;
      avatar_url: string;
    };
    publisher: {
      name: string;
      logo_url: string;
      published_at: string;
    };
    featured_image: {
      url: string;
      alt: string;
      caption: string;
    };
  };
  created_at: number;
}

interface HQPageProps {
  user?: {
    email?: string;
  };
  onNavigateToThread?: (threadId: string) => void;
}

type RsvpStatus = "going" | "not_going" | "maybe" | "waitlist";

interface UserRsvp {
  rsvp_status: RsvpStatus;
  checked_in: boolean;
  rsvp_at: number;
  checked_in_at: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_type?: "virtual" | "in_person" | "hybrid";
  start_time: string;
  end_time?: string;
  location?: string;
  user_rsvp?: UserRsvp;
  going_count?: number;
  featured_image?: string;
  address?: string;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function HQPage({ user: userProp, onNavigateToThread }: HQPageProps) {
  const { user: authUser } = useAuth();
  const user = authUser || userProp;
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [isLoadingUpcomingEvents, setIsLoadingUpcomingEvents] = useState(true);
  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [featuredArticles, setFeaturedArticles] = useState<FrontierArticle[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [myGroups, setMyGroups] = useState<Thread[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const fetchFrontierArticles = async () => {
    try {
      const articles = await api.getFrontierArticles();
      setFeaturedArticles(articles);
    } catch (error) {
      console.error("Failed to fetch frontier articles:", error);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const result = await api.getThreads();
      const groupThreads = (result.threads || []).filter(
        (thread) => thread.type === "group" || thread.type === "focus_group"
      );
      setMyGroups(groupThreads);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const events = await api.getPublicEvents();
      if (events && events.length > 0) {
        const now = new Date();
        const upcoming = events.filter((event) => {
          const eventDate = new Date(event.start_time);
          return eventDate >= now;
        });
        setUpcomingEvents(upcoming);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoadingUpcomingEvents(false);
    }
  };

  const fetchMyRsvps = async () => {
    try {
      const allEvents = await api.getPublicEvents();
      const now = new Date();
      const myRsvpEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.start_time);
        return event.user_rsvp && eventDate >= now;
      });
      setMyEvents(myRsvpEvents);
    } catch (error) {
      console.error("Failed to fetch my RSVPs:", error);
    } finally {
      setIsLoadingMyEvents(false);
    }
  };

  const fetchAllEvents = async () => {
    await Promise.all([fetchEvents(), fetchMyRsvps()]);
  };

  useEffect(() => {
    fetchAllEvents();
    fetchFrontierArticles();
    fetchMyGroups();
  }, []);

  useEffect(() => {
    requestNotificationPermission().catch((error) => {
      console.error("Error requesting notification permission:", error);
    });
  }, []);

  const formatEventTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatEventDateLong = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleRsvp = async (status: RsvpStatus) => {
    if (!selectedEvent) return;

    setIsRsvpLoading(true);
    try {
      await api.rsvpEvent(selectedEvent.id, status);
      await fetchAllEvents();
    } catch (error) {
      console.error("Failed to RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    if (!selectedEvent) return;

    setIsRsvpLoading(true);
    try {
      await api.cancelRsvp(selectedEvent.id);
      await fetchAllEvents();
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to cancel RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const getRsvpStatusLabel = (status: RsvpStatus): string => {
    switch (status) {
      case "going":
        return "Going";
      case "not_going":
        return "Not Going";
      case "maybe":
        return "Maybe";
      case "waitlist":
        return "Waitlist";
      default:
        return status;
    }
  };

  const getRsvpStatusColor = (status?: RsvpStatus): string => {
    switch (status) {
      case "going":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "maybe":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "not_going":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "waitlist":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
      default:
        return "";
    }
  };

  const userName = user?.email?.split("@")[0] || "User";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex gap-6 w-full max-w-6xl mx-auto">
      {/* Left Column - Main Content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-foreground via-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              {userName}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening on the frontier
          </p>
        </motion.div>

        {/* Featured Article */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Latest from Frontier
            </h2>
          </div>

          {isLoadingArticles ? (
            <SpotlightCard className="overflow-hidden" spotlightColor="rgba(14, 165, 233, 0.1)">
              <div className="aspect-[2.5/1] bg-muted animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
              </div>
            </SpotlightCard>
          ) : featuredArticles[0] ? (
            <SpotlightCard
              className="overflow-hidden group cursor-pointer"
              spotlightColor="rgba(14, 165, 233, 0.15)"
            >
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="relative md:w-1/2 h-48 md:h-auto overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/90 z-10 pointer-events-none hidden md:block" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent z-10 pointer-events-none md:hidden" />
                  {featuredArticles[0].content.featured_image?.url ? (
                    <img
                      src={featuredArticles[0].content.featured_image.url}
                      alt={featuredArticles[0].content.featured_image.alt || featuredArticles[0].content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-primary/10 flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-cyan-500/40" />
                    </div>
                  )}
                  {/* Featured Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 backdrop-blur-sm">
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        Featured
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col justify-center">
                  {/* Publisher */}
                  {featuredArticles[0].content.publisher?.name && (
                    <div className="flex items-center gap-2 mb-3">
                      {featuredArticles[0].content.publisher.logo_url && (
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={featuredArticles[0].content.publisher.logo_url}
                            alt={featuredArticles[0].content.publisher.name}
                          />
                          <AvatarFallback className="text-[8px]">
                            {featuredArticles[0].content.publisher.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {featuredArticles[0].content.publisher.name}
                      </span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(featuredArticles[0].created_at)}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-cyan-400 transition-colors">
                    {featuredArticles[0].content.title}
                  </h3>

                  {/* TL;DR */}
                  {featuredArticles[0].content.tldr?.[0] && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {featuredArticles[0].content.tldr[0]}
                    </p>
                  )}

                  {/* Tags */}
                  {featuredArticles[0].content.tags && featuredArticles[0].content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {featuredArticles[0].content.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SpotlightCard>
          ) : (
            <SpotlightCard className="p-8 text-center" spotlightColor="rgba(14, 165, 233, 0.1)">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No articles yet</p>
            </SpotlightCard>
          )}
        </motion.section>

        {/* Upcoming Events */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Upcoming Events
            </h2>
          </div>

          <SpotlightCard spotlightColor="rgba(14, 165, 233, 0.1)">
            {isLoadingUpcomingEvents ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="divide-y divide-border/50">
                {upcomingEvents.slice(0, 5).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    {/* Date Badge */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">
                        {new Date(event.start_time).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-foreground leading-none">
                        {new Date(event.start_time).getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatEventTime(event.start_time)}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {event.going_count !== undefined && event.going_count > 0 && (
                        <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.going_count}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            )}
          </SpotlightCard>
        </motion.section>

        {/* More Articles */}
        {featuredArticles.length > 1 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                More Stories
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/30 to-transparent" />
            </div>

            <div className="space-y-3">
              {featuredArticles.slice(1, 5).map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <SpotlightCard
                    className="overflow-hidden group cursor-pointer"
                    spotlightColor="rgba(14, 165, 233, 0.08)"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-14 rounded-lg bg-muted relative overflow-hidden flex-shrink-0">
                        {article.content.featured_image?.url ? (
                          <img
                            src={article.content.featured_image.url}
                            alt={article.content.featured_image.alt || article.content.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-primary/5">
                            <Sparkles className="h-4 w-4 text-cyan-500/30" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {article.content.publisher?.name || "Unknown"}
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(article.created_at)}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-cyan-400 transition-colors">
                          {article.content.title}
                        </h3>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* Right Column - Sidebar */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* My Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SpotlightCard spotlightColor="rgba(14, 165, 233, 0.08)">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Events
              </h3>
            </div>
            <div className="p-2">
              {isLoadingMyEvents ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                </div>
              ) : myEvents.length > 0 ? (
                <div className="space-y-1">
                  {myEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      {/* Mini Date */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-bold text-cyan-400 uppercase leading-none">
                          {new Date(event.start_time).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-sm font-bold text-foreground leading-none">
                          {new Date(event.start_time).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.title}</p>
                        {event.user_rsvp && (
                          <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border ${getRsvpStatusColor(event.user_rsvp.rsvp_status)}`}>
                            {getRsvpStatusLabel(event.user_rsvp.rsvp_status)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No registered events</p>
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>

        {/* My Groups */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SpotlightCard spotlightColor="rgba(14, 165, 233, 0.08)">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Groups
              </h3>
            </div>
            <div className="p-2">
              {isLoadingGroups ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                </div>
              ) : myGroups.length > 0 ? (
                <div className="space-y-1">
                  {myGroups.slice(0, 4).map((group) => (
                    <div
                      key={group.thread_id}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onNavigateToThread?.(group.thread_id)}
                    >
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          group.type === "focus_group"
                            ? "bg-cyan-500/20 border border-cyan-500/30"
                            : "bg-primary/20 border border-primary/30"
                        }`}
                      >
                        {group.type === "focus_group" ? (
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {group.name || "Unnamed Group"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {group.participant_count || 0} members
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Users className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No groups yet</p>
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      </div>

      {/* Event Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.event_type === "virtual" ? "Virtual Event" : "In-Person Event"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-cyan-400" />
                    <span>{formatEventDateLong(selectedEvent.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-cyan-400" />
                    <span>{formatEventTime(selectedEvent.start_time)}</span>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-cyan-400" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                </div>
                <MembershipGate
                  requiredTier="club"
                  fallback={<UpgradePrompt message="Upgrade to RSVP to events" />}
                >
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Your RSVP Status:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["going", "maybe", "not_going", "waitlist"] as RsvpStatus[]).map((status) => {
                        const isSelected = selectedEvent.user_rsvp?.rsvp_status === status;
                        return (
                          <Button
                            key={status}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleRsvp(status)}
                            disabled={isRsvpLoading}
                            className={isSelected ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                          >
                            {isRsvpLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              getRsvpStatusLabel(status)
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    {selectedEvent.user_rsvp && (
                      <Button
                        variant="outline"
                        className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={handleCancelRsvp}
                        disabled={isRsvpLoading}
                      >
                        {isRsvpLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel RSVP
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </MembershipGate>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
