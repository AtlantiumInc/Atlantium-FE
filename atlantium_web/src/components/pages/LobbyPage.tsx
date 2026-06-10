import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import {
  Clock,
  Crown,
  Loader2,
  MessageCircle,
  Radio,
  Send,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPanel } from "@/components/lobby/AdminPanel";
import { LobbyControls } from "@/components/lobby/LobbyControls";
import { LobbyMediaPanel } from "@/components/lobby/LobbyMediaPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LobbyEvent, LobbyMessage, LobbyResponse, LobbyRoom } from "@/lib/types";

interface LobbyPageProps {
  headerPortalId?: string;
}

export function LobbyPage({ headerPortalId }: LobbyPageProps) {
  const { user } = useAuth();
  const [lobby, setLobby] = useState<LobbyResponse | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [headerHost, setHeaderHost] = useState<HTMLElement | null>(null);
  const [mediaSession, setMediaSession] = useState<{
    eventId?: string;
    roomId?: string;
    token: string;
    url: string;
    canPublish: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedRoom = useMemo(
    () => lobby?.rooms.find((room) => room.id === selectedRoomId) ?? lobby?.rooms[0] ?? null,
    [lobby?.rooms, selectedRoomId]
  );
  const officeHoursRoom = useMemo(
    () => lobby?.rooms.find((room) => room.type === "office_hours") ?? null,
    [lobby?.rooms]
  );
  const activeEvent = lobby?.active_event ?? null;
  const isModerator = lobby?.permissions.is_moderator === true;
  const canPublish = mediaSession?.canPublish ?? lobby?.permissions.can_publish_now ?? false;
  const lobbyCount = useMemo(() => {
    const userIds = new Set(messages.map((message) => message.sender_id).filter(Boolean));
    if (user?.id) userIds.add(user.id);
    return Math.max(userIds.size, user ? 1 : 0);
  }, [messages, user]);

  useEffect(() => {
    if (!headerPortalId || typeof document === "undefined") {
      setHeaderHost(null);
      return;
    }
    setHeaderHost(document.getElementById(headerPortalId));
  }, [headerPortalId]);

  const loadLobby = useCallback(async () => {
    const data = await api.getLobby();
    setLobby((previous) => {
      if (!selectedRoomId && data.rooms.length > 0) {
        const lounge = data.rooms.find((room) => room.slug === "lounge");
        setSelectedRoomId(lounge?.id ?? data.rooms[0].id);
      }
      if (previous?.active_event?.id !== data.active_event?.id) {
        setMediaSession(null);
      }
      return data;
    });
  }, [selectedRoomId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setIsLoading(true);
        await loadLobby();
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || "Failed to load lobby");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    init();
    const interval = window.setInterval(() => {
      loadLobby().catch((err) => console.warn("[Lobby] refresh failed", err));
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadLobby]);

  const loadMessages = useCallback(async (roomId: string) => {
    const response = await api.getLobbyRoomMessages(roomId, 60);
    setMessages(response.messages);
  }, []);

  useEffect(() => {
    if (!selectedRoom?.id) return;
    const roomId = selectedRoom.id;
    let cancelled = false;
    async function refresh() {
      try {
        const response = await api.getLobbyRoomMessages(roomId, 60);
        if (!cancelled) setMessages(response.messages);
      } catch (err) {
        console.warn("[Lobby] messages refresh failed", err);
      }
    }
    refresh();
    const interval = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedRoom || isSending || !user) return;
    setMessageInput("");
    setIsSending(true);

    const optimistic: LobbyMessage = {
      id: `temp-${Date.now()}`,
      room_id: selectedRoom.id,
      sender_id: user.id,
      sender_username: user.email.split("@")[0],
      sender_display_name: user.display_name || user.email,
      sender_avatar: user.avatar ?? null,
      content,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const response = await api.sendLobbyMessage(selectedRoom.id, content);
      setMessages((current) => current.map((message) => message.id === optimistic.id ? response.message : message));
    } catch (err: any) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      toast.error(err.message || "Message failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleJoinMediaRoom = async () => {
    if (!selectedRoom || isJoining) return;
    setIsJoining(true);
    try {
      const response = selectedRoom.type === "office_hours"
        ? activeEvent
          ? await api.getLobbyEventLivekitToken(activeEvent.id)
          : null
        : await api.getLobbyRoomLivekitToken(selectedRoom.id);
      if (!response) {
        toast.error("Office hours are not live right now");
        return;
      }
      setMediaSession({
        eventId: activeEvent?.id,
        roomId: selectedRoom.id,
        token: response.token,
        url: response.url,
        canPublish: response.permissions.can_publish,
      });
      if (officeHoursRoom) {
        setSelectedRoomId(officeHoursRoom.id);
        void loadMessages(officeHoursRoom.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not join office hours");
    } finally {
      setIsJoining(false);
    }
  };

  const leaveOfficeHours = () => {
    setMediaSession(null);
  };

  const handleSpotlight = (userId: string | null) => {
    setLobby((current) => current && current.active_event
      ? {
          ...current,
          active_event: { ...current.active_event, spotlight_user_id: userId },
          upcoming_events: current.upcoming_events.map((event) =>
            event.id === current.active_event?.id ? { ...event, spotlight_user_id: userId } : event
          ),
        }
      : current);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lobby || !selectedRoom) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Lobby unavailable.
      </div>
    );
  }

  const headerControls = (
    <LobbyHeaderControls
      rooms={lobby.rooms}
      selectedRoom={selectedRoom}
      activeEvent={activeEvent}
      upcomingEvents={lobby.upcoming_events}
      isFreeMember={lobby.membership.membership_tier === "free" && !isModerator}
      canPublish={canPublish}
      publishLabel={publishStatusLabel(lobby.permissions)}
      lobbyCount={lobbyCount}
      mediaActive={Boolean(mediaSession)}
      isJoining={isJoining}
      onRoomChange={setSelectedRoomId}
      onJoinMediaRoom={handleJoinMediaRoom}
      onLeaveOfficeHours={leaveOfficeHours}
    />
  );

  const headerPortal = headerPortalId
    ? headerHost
      ? createPortal(headerControls, headerHost)
      : null
    : headerControls;

  const lobbyContent = (
    <div className={cn("flex h-full min-h-0 flex-col", !headerPortalId && "gap-4")}>
      {headerPortal}

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="min-h-0 rounded-lg border border-border/60 bg-background/50">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-cyan-300" />
                  <h2 className="text-base font-semibold">{selectedRoom.name}</h2>
                  {selectedRoom.type === "office_hours" && activeEvent && (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Live</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{selectedRoom.description}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4">
              {mediaSession ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/30">
                  <div className="min-h-0 flex-1 p-3">
                    <LobbyMediaPanel
                      spotlightUserId={activeEvent?.spotlight_user_id}
                      isModerator={isModerator}
                      canPublish={canPublish}
                    />
                  </div>
                  {isModerator && activeEvent && (
                    <div className="shrink-0 border-t border-border/60 p-3">
                      <AdminPanel
                        eventId={activeEvent.id}
                        currentUserId={user?.id || ""}
                        onSpotlight={handleSpotlight}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <OfficeHoursPanel
                  activeEvent={activeEvent}
                  upcomingEvents={lobby.upcoming_events}
                  onJoin={handleJoinMediaRoom}
                  isJoining={isJoining}
                />
              )}
            </div>
          </div>
        </main>

        <aside className="flex min-h-0 flex-col rounded-lg border border-border/60 bg-background/50">
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="h-4 w-4 text-cyan-300" />
              {selectedRoom.name} chat
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {messages.length}
            </Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} isOwn={message.sender_id === user?.id} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-border/60 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendMessage();
            }}
          >
            <div className="flex gap-2">
              <Textarea
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Message the lobby"
                rows={1}
                className="min-h-10 resize-none"
              />
              <Button type="submit" size="icon" disabled={!messageInput.trim() || isSending} className="h-10 w-10 shrink-0">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </div>
  );

  if (mediaSession) {
    return (
      <LiveKitRoom
        serverUrl={mediaSession.url}
        token={mediaSession.token}
        connect={true}
        audio={false}
        video={false}
        onDisconnected={leaveOfficeHours}
        className="h-full"
      >
        {lobbyContent}
        <RoomAudioRenderer />
      </LiveKitRoom>
    );
  }

  return lobbyContent;
}

function LobbyHeaderControls({
  rooms,
  selectedRoom,
  activeEvent,
  upcomingEvents,
  isFreeMember,
  canPublish,
  publishLabel,
  lobbyCount,
  mediaActive,
  isJoining,
  onRoomChange,
  onJoinMediaRoom,
  onLeaveOfficeHours,
}: {
  rooms: LobbyRoom[];
  selectedRoom: LobbyRoom;
  activeEvent: LobbyEvent | null;
  upcomingEvents: LobbyEvent[];
  isFreeMember: boolean;
  canPublish: boolean;
  publishLabel: string;
  lobbyCount: number;
  mediaActive: boolean;
  isJoining: boolean;
  onRoomChange: (roomId: string) => void;
  onJoinMediaRoom: () => void;
  onLeaveOfficeHours: () => void;
}) {
  const canJoinMedia = selectedRoom.type === "lounge" || Boolean(activeEvent);
  const joinLabel = selectedRoom.type === "lounge" ? "Join room" : "Join";

  return (
    <div className="flex w-full min-w-0 flex-nowrap items-center justify-end gap-1.5">
      <RoomSwitch
        rooms={rooms}
        selectedRoom={selectedRoom}
        activeEvent={activeEvent}
        onRoomChange={onRoomChange}
      />
      <HeaderMetric
        icon={<Clock className={cn("h-4 w-4", activeEvent ? "text-emerald-400" : "text-cyan-300")} />}
        label={activeEvent ? "Live" : "Next"}
        value={activeEvent ? timeRange(activeEvent) : nextEventLabel(upcomingEvents)}
      />
      <HeaderMetric
        icon={<Users className="h-4 w-4 text-cyan-300" />}
        label="Lobby"
        value={`${lobbyCount}`}
      />
      <div className="flex shrink-0 items-center gap-1.5">
        {mediaActive ? (
          <LobbyControls onLeave={onLeaveOfficeHours} canPublish={canPublish} compact />
        ) : (
          <DisabledAvControls
            activeEvent={activeEvent}
            canJoinMedia={canJoinMedia}
            canPublish={canPublish}
            isFreeMember={isFreeMember}
            isJoining={isJoining}
            joinLabel={joinLabel}
            publishLabel={publishLabel}
            onJoinMediaRoom={onJoinMediaRoom}
          />
        )}
        {isFreeMember && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.location.assign("/pricing")}
            className="h-8 gap-1.5 px-2.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/15 dark:text-cyan-200"
          >
            <Crown className="h-4 w-4" />
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
}

function HeaderMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex h-8 min-w-0 max-w-[12rem] items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2">
      {icon}
      <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground xl:inline">
        {label}
      </span>
      <span className="min-w-0 truncate text-xs font-semibold">{value}</span>
    </div>
  );
}

function RoomSwitch({
  rooms,
  selectedRoom,
  activeEvent,
  onRoomChange,
}: {
  rooms: LobbyRoom[];
  selectedRoom: LobbyRoom;
  activeEvent: LobbyEvent | null;
  onRoomChange: (roomId: string) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-md border border-border/60 bg-card/40 p-0.5">
      {rooms.map((room) => {
        const selected = room.id === selectedRoom.id;
        const live = room.type === "office_hours" && activeEvent?.room_id === room.id;
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onRoomChange(room.id)}
            className={cn(
              "relative inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[11px] font-semibold transition-colors",
              selected
                ? "bg-cyan-500/15 text-cyan-200"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {room.name}
            {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>
        );
      })}
    </div>
  );
}

function DisabledAvControls({
  activeEvent,
  canJoinMedia,
  canPublish,
  isFreeMember,
  isJoining,
  joinLabel,
  publishLabel,
  onJoinMediaRoom,
}: {
  activeEvent: LobbyEvent | null;
  canJoinMedia: boolean;
  canPublish: boolean;
  isFreeMember: boolean;
  isJoining: boolean;
  joinLabel: string;
  publishLabel: string;
  onJoinMediaRoom: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {canJoinMedia && (
        <Button
          onClick={onJoinMediaRoom}
          disabled={isJoining}
          size="sm"
          className="h-8 gap-2 bg-cyan-500 text-black hover:bg-cyan-400"
        >
          {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          {joinLabel}
        </Button>
      )}
      <AccessHint activeEvent={activeEvent} canPublish={canPublish} isFreeMember={isFreeMember} publishLabel={publishLabel} />
    </div>
  );
}

function AccessHint({
  activeEvent,
  canPublish,
  isFreeMember,
  publishLabel,
}: {
  activeEvent: LobbyEvent | null;
  canPublish: boolean;
  isFreeMember: boolean;
  publishLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const title = canPublish ? "AV available after joining" : "Watch and chat access";
  const body = canPublish
    ? "Join this room to use mic, camera, and screen share."
    : activeEvent
      ? publishLabel
      : "Watch and chat are available. AV unlocks during live Office Hours when your access allows it.";

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        data-disabled="true"
        aria-expanded={isOpen}
        aria-label={title}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="h-8 w-8 cursor-not-allowed border-border/60 bg-background/50 text-muted-foreground opacity-60"
      >
        {canPublish ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-border/70 bg-popover p-3 text-left text-popover-foreground shadow-lg transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        )}
      >
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
        {isFreeMember && (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Free members can chat and watch anytime, with one publishing pass every 14 days during office hours.
          </p>
        )}
      </div>
    </div>
  );
}

function OfficeHoursPanel({
  activeEvent,
  upcomingEvents,
  onJoin,
  isJoining,
}: {
  activeEvent: LobbyEvent | null;
  upcomingEvents: LobbyEvent[];
  onJoin: () => void;
  isJoining: boolean;
}) {
  const nextEvent = upcomingEvents[0] ?? null;
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/20 p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
          <Video className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {activeEvent ? "Office hours is live" : "Next office hours"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeEvent ? timeRange(activeEvent) : nextEvent ? eventTimeLabel(nextEvent) : "Schedule is being prepared."}
        </p>
        {activeEvent && (
          <Button
            onClick={onJoin}
            disabled={isJoining}
            className="mt-5 gap-2 bg-cyan-500 text-black hover:bg-cyan-400"
          >
            {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            Join live room
          </Button>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ message, isOwn }: { message: LobbyMessage; isOwn: boolean }) {
  return (
    <div className={cn("rounded-md px-2 py-1.5", isOwn ? "bg-cyan-500/10" : "bg-card/30")}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("min-w-0 truncate text-xs font-semibold", isOwn ? "text-cyan-200" : "text-foreground")}>
          {message.sender_display_name}
        </p>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-foreground/90">{message.content}</p>
    </div>
  );
}

function publishStatusLabel(permissions: LobbyResponse["permissions"]) {
  if (permissions.can_publish_now) return "Mic, camera, and screen share available";
  if (permissions.next_free_publish_at) {
    return `Next free publishing pass: ${new Date(permissions.next_free_publish_at).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })}`;
  }
  return "Watch and chat access";
}

function nextEventLabel(events: LobbyEvent[]) {
  return events[0] ? eventTimeLabel(events[0]) : "No events scheduled";
}

function eventTimeLabel(event: LobbyEvent) {
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(event.starts_at));
}

function timeRange(event: LobbyEvent) {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
