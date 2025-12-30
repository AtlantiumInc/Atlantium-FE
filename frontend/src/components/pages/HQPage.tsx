import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Trophy,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Users,
  Loader2,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface HQPageProps {
  user?: {
    email?: string;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_type?: "virtual" | "in_person";
  start_time: string;
  end_time?: string;
  location?: string;
}

// Demo articles for the top section
const FEATURED_ARTICLES = [
  {
    id: "1",
    title: "Claude 3.5 Sonnet Now Available",
    source: "Anthropic",
    image: null,
    tag: "AI Models",
  },
  {
    id: "2",
    title: "GPT-5 Research Preview",
    source: "OpenAI",
    image: null,
    tag: "Research",
  },
];

// Demo top builders
const TOP_BUILDERS = [
  { rank: 1, name: "Sarah Chen", username: "sarah_dev", additions: 2453, avatar: null },
  { rank: 2, name: "Marcus J.", username: "mjohnson", additions: 1876, avatar: null },
  { rank: 3, name: "Elena R.", username: "elena_r", additions: 1234, avatar: null },
];

export function HQPage({ user }: HQPageProps) {
  const [upcomingEvent, setUpcomingEvent] = useState<Event | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await api.getPublicEvents();
        if (events && events.length > 0) {
          // Filter to get upcoming events (not today)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const upcoming = events.filter((event) => {
            const eventDate = new Date(event.start_time);
            return eventDate >= tomorrow;
          });

          if (upcoming.length > 0) {
            setUpcomingEvent(upcoming[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoadingEvent(false);
      }
    };

    const fetchMyRsvps = async () => {
      try {
        const rsvps = await api.getMyRsvps();
        // Filter to only show upcoming events
        const now = new Date();
        const upcomingRsvps = rsvps.filter((event) => {
          const eventDate = new Date(event.start_time);
          return eventDate >= now;
        });
        setMyEvents(upcomingRsvps);
      } catch (error) {
        console.error("Failed to fetch my RSVPs:", error);
      } finally {
        setIsLoadingMyEvents(false);
      }
    };

    fetchEvents();
    fetchMyRsvps();
  }, []);

  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
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

  const handleCancelRsvp = async () => {
    if (!selectedEvent) return;

    setIsRsvpLoading(true);
    try {
      await api.cancelRsvp(selectedEvent.id);
      setMyEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to cancel RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
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
    <div className="flex gap-6 w-full">
      {/* Left Column - Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Featured Articles - Top Row */}
        <div className="grid grid-cols-2 gap-4">
          {FEATURED_ARTICLES.map((article) => (
            <Card key={article.id} className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              <div className="aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    {article.tag}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-primary/40" />
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles size={12} />
                  {article.source}
                </p>
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Second Row - Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total Commits</span>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <div className="text-3xl font-bold">287</div>
              <p className="text-xs text-green-500 mt-1">+12% this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">PRs Merged</span>
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div className="text-3xl font-bold">23</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Streak</span>
                <span className="text-2xl">🔥</span>
              </div>
              <div className="text-3xl font-bold">14</div>
              <p className="text-xs text-muted-foreground mt-1">Days active</p>
            </CardContent>
          </Card>
        </div>

        {/* Third Row - Quick Actions */}
        <Card className="bg-gradient-to-br from-primary/10 to-background">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-2">
              <Button variant="secondary" size="sm">New Post</Button>
              <Button variant="secondary" size="sm">Start Task</Button>
              <Button variant="secondary" size="sm">Join Chat</Button>
              <Button variant="secondary" size="sm">View Stats</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-4">
        {/* Welcome Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good morning,</p>
                <h2 className="text-xl font-semibold">{userName}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentDate} - {currentTime}
                </p>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback className="text-lg">{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </div>
          </CardContent>
        </Card>

        {/* My Events */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} />
                My Events
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingMyEvents ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : myEvents.length > 0 ? (
              myEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2 transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <span className="text-xs text-muted-foreground w-16">
                    {formatEventTime(event.start_time)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEventDate(event.start_time)}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Builders Today */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                Top Builders Today
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOP_BUILDERS.map((builder) => (
              <div key={builder.rank} className="flex items-center gap-3">
                <span className={`font-bold w-5 ${
                  builder.rank === 1 ? "text-amber-500" :
                  builder.rank === 2 ? "text-gray-400" :
                  "text-amber-700"
                }`}>
                  #{builder.rank}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {builder.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{builder.name}</p>
                  <p className="text-xs text-muted-foreground">@{builder.username}</p>
                </div>
                <span className="text-xs text-green-500 font-medium">
                  +{builder.additions.toLocaleString()}
                </span>
              </div>
            ))}
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-lg">
                    <CheckCircle size={20} />
                    <span className="font-medium">You're registered for this event!</span>
                  </div>
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
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
