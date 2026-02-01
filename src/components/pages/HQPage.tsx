import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  const getMembershipBadgeColor = (tier?: string) => {
    switch (tier) {
      case "club":
        return "bg-cyan-500/20 text-cyan-600 border-cyan-500/30";
      case "club_annual":
        return "bg-amber-500/20 text-amber-600 border-amber-500/30";
      case "free":
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getMembershipLabel = (tier?: string) => {
    switch (tier) {
      case "club":
        return "Club Member";
      case "club_annual":
        return "Annual Member";
      case "free":
      default:
        return "Free Member";
    }
  };

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
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex gap-8 w-full">
      {/* Left Column - Main Content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Featured Articles - Top Row */}
        <div className="grid grid-cols-2 gap-6">
          {isLoadingArticles ? (
            <>
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-20 mb-2" />
                    <div className="h-5 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            featuredArticles.map((article) => (
              <Card key={article.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                <div className="aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-background relative overflow-hidden">
                  {article.content.featured_image?.url ? (
                    <img
                      src={article.content.featured_image.url}
                      alt={article.content.featured_image.alt || article.content.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                      {article.content.tags?.[0] || "Article"}
                    </span>
                  </div>
                </div>
                <CardContent className="p-5 space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles size={12} className="flex-shrink-0" />
                    <span>{article.content.publisher?.name || "Unknown"}</span>
                  </p>
                  <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {article.content.title}
                  </h3>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Second Row - Upcoming Events */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingUpcomingEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 cursor-pointer hover:bg-muted/40 rounded-lg p-4 -mx-4 transition-colors duration-200 border-l-3 border-primary"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold leading-snug">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatEventDate(event.start_time)}</span>
                        <span>•</span>
                        <span>{formatEventTime(event.start_time)}</span>
                      </div>
                      {event.event_type && (
                        <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded capitalize font-medium">
                          {event.event_type}
                        </span>
                      )}
                    </div>
                    {event.going_count !== undefined && (
                      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {event.going_count} going
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground font-medium">Good morning</p>
                <h2 className="text-2xl font-bold leading-tight">{userName}</h2>
                <p className="text-xs text-muted-foreground">
                  {currentDate} at {currentTime}
                </p>
              </div>
              <Avatar className="h-14 w-14 flex-shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="text-base font-semibold">{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </div>
            {/* Membership Badge */}
            {user && (user as any)?._profile?.registration_details?.membership_tier && (
              <div className={`px-3 py-2 rounded-lg border text-xs font-semibold w-fit ${getMembershipBadgeColor((user as any)._profile.registration_details.membership_tier)}`}>
                {getMembershipLabel((user as any)._profile.registration_details.membership_tier)}
              </div>
            )}
          </CardContent>
        </Card>


        {/* My Events */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              My Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingMyEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : myEvents.length > 0 ? (
              <div className="space-y-3">
                {myEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 cursor-pointer hover:bg-muted/40 rounded-lg p-3 -mx-3 transition-colors duration-200"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventDate(event.start_time)} • {formatEventTime(event.start_time)}
                      </p>
                    </div>
                    {event.user_rsvp && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded whitespace-nowrap ${getRsvpStatusColor(event.user_rsvp.rsvp_status)}`}>
                        {getRsvpStatusLabel(event.user_rsvp.rsvp_status)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>

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
