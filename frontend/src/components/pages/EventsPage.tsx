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
  Users,
  Loader2,
  Video,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: "virtual" | "in_person";
  start_time: string;
  end_time?: string;
  location?: string;
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [rsvpedEventIds, setRsvpedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsData, rsvpsData] = await Promise.all([
          api.getPublicEvents(),
          api.getMyRsvps().catch(() => []),
        ]);
        setEvents(eventsData);
        setRsvpedEventIds(new Set(rsvpsData.map((r) => r.id)));
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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

  const handleRsvp = async () => {
    if (!selectedEvent) return;

    setIsRsvpLoading(true);
    try {
      await api.rsvpEvent(selectedEvent.id);
      setRsvpedEventIds((prev) => new Set([...prev, selectedEvent.id]));
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
      setRsvpedEventIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedEvent.id);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to cancel RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const isEventRsvped = (eventId: string) => rsvpedEventIds.has(eventId);

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
                  <h4 className="font-semibold mb-2">{event.title}</h4>
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
                {isEventRsvped(selectedEvent.id) ? (
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
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleRsvp}
                    disabled={isRsvpLoading}
                  >
                    {isRsvpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        RSVP to this Event
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
