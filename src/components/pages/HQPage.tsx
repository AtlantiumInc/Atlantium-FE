import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission } from "@/lib/notifications";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { MembershipGate, UpgradePrompt } from "@/components/subscription";

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

export function HQPage({ user: userProp }: HQPageProps) {
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

  const fetchFrontierArticles = async () => {
    try {
      const articles = await api.getFrontierArticles();
      setFeaturedArticles(articles.slice(0, 2));
    } catch (error) {
      console.error("Failed to fetch frontier articles:", error);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const events = await api.getPublicEvents();
      if (events && events.length > 0) {
        // Filter to get all upcoming events
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
      // Filter to show only events the user has registered for (has user_rsvp)
      const now = new Date();
      const myRsvpEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.start_time);
        // Show events where user has RSVP'd and event is upcoming or today
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
  }, []);

  // Request notification permission on dashboard load
  useEffect(() => {
    requestNotificationPermission().catch((error) => {
      console.error("Error requesting notification permission:", error);
    });
  }, []);

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
        return "text-green-500 bg-green-500/10";
      case "maybe":
        return "text-amber-500 bg-amber-500/10";
      case "not_going":
        return "text-red-500 bg-red-500/10";
      case "waitlist":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "";
    }
  };

  const userName = user?.email?.split("@")[0] || "User";
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex gap-6 w-full max-w-6xl mx-auto">
      {/* Left Column - Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Welcome Banner */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentDate}</p>
        </div>

        {/* Featured Articles */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Latest from Frontier</h2>
          <div className="grid grid-cols-2 gap-4">
            {isLoadingArticles ? (
              <>
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-card border border-border">
                    <div className="aspect-[16/10] bg-muted animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-muted rounded w-16" />
                      <div className="h-4 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              featuredArticles.map((article) => (
                <div
                  key={article.id}
                  className="rounded-xl overflow-hidden bg-card border border-border group cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                    {article.content.featured_image?.url ? (
                      <img
                        src={article.content.featured_image.url}
                        alt={article.content.featured_image.alt || article.content.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Sparkles className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 text-xs text-white/90 font-medium">
                      {article.content.tags?.[0] || "Article"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1.5">{article.content.publisher?.name || "Unknown"}</p>
                    <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {article.content.title}
                    </h3>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Upcoming Events</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {isLoadingUpcomingEvents ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatEventDate(event.start_time)} · {formatEventTime(event.start_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.event_type && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {event.event_type.replace("_", " ")}
                      </span>
                    )}
                    {event.going_count !== undefined && event.going_count > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {event.going_count} going
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right Column - Sidebar */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* My Events */}
        <div className="rounded-xl bg-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium">My Events</h3>
          </div>
          <div className="p-2">
            {isLoadingMyEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : myEvents.length > 0 ? (
              <div className="space-y-1">
                {myEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventDate(event.start_time)}
                      </p>
                    </div>
                    {event.user_rsvp && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${getRsvpStatusColor(event.user_rsvp.rsvp_status)}`}>
                        {getRsvpStatusLabel(event.user_rsvp.rsvp_status)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">No registered events</p>
              </div>
            )}
          </div>
        </div>
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
                    <Calendar size={16} className="text-muted-foreground" />
                    <span>{formatEventDateLong(selectedEvent.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-muted-foreground" />
                    <span>{formatEventTime(selectedEvent.start_time)}</span>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-muted-foreground" />
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
