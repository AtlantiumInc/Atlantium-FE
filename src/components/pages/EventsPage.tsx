import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  MapPin,
  Loader2,
  Video,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { MembershipGate, UpgradePrompt } from "@/components/subscription";

type RsvpStatus = "going" | "not_going" | "maybe" | "waitlist";

interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: "virtual" | "in_person" | "hybrid";
  start_time: string;
  end_time?: string;
  location?: string;
  user_rsvp?: UserRsvp;
  going_count?: number;
  featured_image?: string;
}

interface UserRsvp {
  rsvp_status: RsvpStatus;
  checked_in: boolean;
  rsvp_at: number;
  checked_in_at: number;
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [userRsvps, setUserRsvps] = useState<Record<string, UserRsvp>>({})

  const fetchEvents = async () => {
    try {
      const eventsData = await api.getPublicEvents();
      setEvents(eventsData);

      try {
        const rsvpsData = await api.getMyRsvps();
        const rsvpMap: Record<string, UserRsvp> = {};
        rsvpsData.forEach((event: any) => {
          if (event.user_rsvp) {
            rsvpMap[event.id] = event.user_rsvp;
          }
        });
        setUserRsvps(rsvpMap);
      } catch {
        console.log("No RSVPs found");
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleRsvp = async (status: RsvpStatus) => {
    if (!selectedEvent) return;

    setIsRsvpLoading(true);
    try {
      await api.rsvpEvent(selectedEvent.id, status);
      await fetchEvents();
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
      await fetchEvents();
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to cancel RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const getUserRsvp = (eventId: string) => userRsvps[eventId];

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

  const getEventCategory = (dateString: string): "today" | "upcoming" | "past" => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate < today) return "past";
    if (eventDate < tomorrow) return "today";
    return "upcoming";
  };

  const todayEvents = events.filter((e) => getEventCategory(e.start_time) === "today");
  const upcomingEvents = events.filter((e) => getEventCategory(e.start_time) === "upcoming");
  const pastEvents = events.filter((e) => getEventCategory(e.start_time) === "past");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">
            Discover and RSVP to upcoming events
          </p>
        </div>
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary">Today</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {todayEvents.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all border-primary/30"
                onClick={() => handleEventClick(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {event.event_type === "virtual" ? (
                        <Video size={16} className="text-blue-500" />
                      ) : (
                        <MapPin size={16} className="text-green-500" />
                      )}
                      <span className="text-xs text-muted-foreground capitalize">
                        {event.event_type.replace("_", " ")}
                      </span>
                    </div>
                    {event.user_rsvp && (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getRsvpStatusColor(event.user_rsvp.rsvp_status)}`}>
                        {getRsvpStatusLabel(event.user_rsvp.rsvp_status)}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold mb-2">{event.title}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{formatTime(event.start_time)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Upcoming</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => handleEventClick(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {event.event_type === "virtual" ? (
                        <Video size={16} className="text-blue-500" />
                      ) : (
                        <MapPin size={16} className="text-green-500" />
                      )}
                      <span className="text-xs text-muted-foreground capitalize">
                        {event.event_type.replace("_", " ")}
                      </span>
                    </div>
                    {event.user_rsvp && (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getRsvpStatusColor(event.user_rsvp.rsvp_status)}`}>
                        {getRsvpStatusLabel(event.user_rsvp.rsvp_status)}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold mb-2">{event.title}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{formatDate(event.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{formatTime(event.start_time)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-muted-foreground">Past Events</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pastEvents.map((event) => (
              <Card
                key={event.id}
                className="opacity-60"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold flex-1">{event.title}</h4>
                    {event.user_rsvp && (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getRsvpStatusColor(event.user_rsvp.rsvp_status)}`}>
                        {getRsvpStatusLabel(event.user_rsvp.rsvp_status)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{formatDate(event.start_time)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No events yet</h3>
          <p className="text-sm text-muted-foreground">
            Check back later for upcoming events
          </p>
        </div>
      )}

      {/* RSVP Modal */}
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
                    <span>{formatDate(selectedEvent.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-muted-foreground" />
                    <span>{formatTime(selectedEvent.start_time)}</span>
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
                        const userRsvp = getUserRsvp(selectedEvent.id);
                        const isSelected = userRsvp?.rsvp_status === status;
                        return (
                          <Button
                            key={status}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleRsvp(status)}
                            disabled={isRsvpLoading}
                            className={isSelected ? "" : ""}
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
                    {getUserRsvp(selectedEvent.id) && (
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
