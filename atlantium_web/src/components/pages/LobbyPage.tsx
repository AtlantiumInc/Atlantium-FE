import { useState, useEffect, useRef, useCallback } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Users } from "lucide-react";
import { api } from "@/lib/api";
import { LobbyMediaPanel } from "@/components/lobby/LobbyMediaPanel";
import { LobbyControls } from "@/components/lobby/LobbyControls";
import { AdminPanel } from "@/components/lobby/AdminPanel";
import { toast } from "sonner";
import type { LobbyMember, ThreadMessage } from "@/lib/types";
import type {
  LobbyJoinPayload,
  LobbyLeavePayload,
  PositionUpdatePayload,
  AdminMutePayload,
  AdminKickPayload,
  AdminSpotlightPayload,
} from "@/lib/realtime-types";

export function LobbyPage() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const isAdmin = user?.is_admin === true;

  const [threadId, setThreadId] = useState<string | null>(null);
  const [members, setMembers] = useState<Map<string, LobbyMember>>(new Map());
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime callbacks
  const handleMemberJoin = useCallback((payload: LobbyJoinPayload) => {
    setMembers((prev) => {
      const next = new Map(prev);
      next.set(payload.user_id, {
        user_id: payload.user_id,
        position: payload.position,
        username: payload.username,
        display_name: payload.display_name,
        avatar_url: payload.avatar_url,
      });
      return next;
    });
  }, []);

  const handleMemberLeave = useCallback((payload: LobbyLeavePayload) => {
    setMembers((prev) => {
      const next = new Map(prev);
      next.delete(payload.user_id);
      return next;
    });
  }, []);

  const handlePositionUpdate = useCallback((payload: PositionUpdatePayload) => {
    setMembers((prev) => {
      const existing = prev.get(payload.user_id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(payload.user_id, { ...existing, position: payload.position });
      return next;
    });
  }, []);

  const handleNewMessage = useCallback((message: ThreadMessage) => {
    if (message.sender_id === user?.id) return;
    setMessages((prev) => {
      if (prev.some((m) => m.message_id === message.message_id)) return prev;
      return [...prev, message];
    });
  }, [user?.id]);

  const handleAdminMute = useCallback(
    (payload: AdminMutePayload) => {
      if (payload.target_user_id === userId) {
        toast.warning(
          `An admin muted your ${payload.track_type}. Please keep it muted.`
        );
        window.dispatchEvent(
          new CustomEvent("lobby-admin-mute", {
            detail: { trackType: payload.track_type },
          })
        );
      }
    },
    [userId]
  );

  const handleAdminKick = useCallback(
    (payload: AdminKickPayload) => {
      if (payload.target_user_id === userId) {
        toast.error("You have been kicked from the lobby by an admin.");
        setLivekitToken(null);
        setMembers(new Map());
      }
    },
    [userId]
  );

  const handleAdminSpotlight = useCallback(
    (payload: AdminSpotlightPayload) => {
      setSpotlightUserId(payload.target_user_id);
      toast.info("An admin has spotlighted a participant.");
    },
    []
  );

  const { broadcastMessage: _broadcastMessage } = useLobbyChannel({
    threadId,
    onMemberJoin: handleMemberJoin,
    onMemberLeave: handleMemberLeave,
    onPositionUpdate: handlePositionUpdate,
    onNewMessage: handleNewMessage,
    onAdminMute: handleAdminMute,
    onAdminKick: handleAdminKick,
    onAdminSpotlight: handleAdminSpotlight,
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("[Lobby] Admin mute received for track:", detail.trackType);
    };
    window.addEventListener("lobby-admin-mute", handler);
    return () => window.removeEventListener("lobby-admin-mute", handler);
  }, []);

  // Initialize lobby on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const lobbyData = await api.getLobby();
        if (cancelled) return;

        setThreadId(lobbyData.thread_id);
        threadIdRef.current = lobbyData.thread_id;

        await api.joinLobby();
        if (cancelled) return;

        const freshData = await api.getLobby();
        if (cancelled) return;
        const membersMap = new Map<string, LobbyMember>();
        for (const m of freshData.members) {
          membersMap.set(m.user_id, m);
        }
        setMembers(membersMap);

        try {
          const msgData = await api.getThreadMessages(lobbyData.thread_id, 1, 50);
          if (cancelled) return;
          setMessages(msgData.messages.reverse());
        } catch {
          // Messages may fail if thread is brand new
        }

        try {
          const lkResponse = await api.getLobbyLivekitToken();
          if (cancelled) return;
          console.log("[Lobby] LiveKit token received, url:", lkResponse.url);
          setLivekitToken(lkResponse.token);
          setLivekitUrl(lkResponse.url);
        } catch (lkErr: any) {
          console.warn("[Lobby] LiveKit token failed, continuing without media:", lkErr.message);
          toast.warning("Voice/video unavailable: " + (lkErr.message || "token error"));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lobby");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (threadIdRef.current) {
        api.leaveLobby().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (threadIdRef.current) {
        const token = api.getAuthToken();
        if (token) {
          fetch("https://cloud.atlantium.ai/api:_c66cUCc/lobby/leave", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            keepalive: true,
          }).catch(() => {});
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !threadId || isSending) return;

    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ThreadMessage = {
      message_id: tempId,
      thread_id: threadId,
      sender_id: user?.id || "",
      sender_username: user?.display_name || user?.email || "",
      sender_avatar: user?.avatar,
      content,
      is_reply: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const result = await api.sendMessage(threadId, content);
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === tempId
            ? { ...m, message_id: result.message_id, created_at: result.created_at }
            : m
        )
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleLeave = async () => {
    try {
      await api.leaveLobby();
      threadIdRef.current = null;
      setLivekitToken(null);
      setMembers(new Map());
    } catch (err: any) {
      toast.error(err.message || "Failed to leave lobby");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const membersArray: LobbyMember[] = Array.from(members.values());

  const lobbyContent = (
    <div className="absolute inset-0 flex flex-col">
      {/* Main area: media + chat sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Video / media area */}
        <div className="flex-1 min-w-0 min-h-0 p-3">
          {livekitToken ? (
            <div className="h-full">
              <LobbyMediaPanel spotlightUserId={spotlightUserId} isAdmin={isAdmin} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Users size={32} />
              <p className="text-sm">Connecting to lobby...</p>
            </div>
          )}
        </div>

        {/* Right sidebar: Chat */}
        <div className="w-72 shrink-0 border-l border-border flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border shrink-0 flex items-center justify-between">
            <h3 className="text-sm font-medium">Chat</h3>
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{members.size}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="p-2 border-b border-border shrink-0">
              <AdminPanel members={membersArray} currentUserId={userId} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center mt-4">
                No messages yet
              </p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={msg.message_id} className="text-sm">
                    <span className={`font-medium ${isOwn ? "text-primary" : "text-foreground"}`}>
                      {msg.sender_username}
                    </span>
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <p className="text-foreground/90 break-words">{msg.content}</p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-border p-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-1.5"
            >
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Message..."
                className="text-sm h-8"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={!messageInput.trim() || isSending}
                className="h-8 w-8 p-0 shrink-0"
              >
                <Send size={14} />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Controls bar — pinned to bottom */}
      {livekitToken && (
        <div className="shrink-0 border-t border-border">
          <LobbyControls onLeave={handleLeave} />
        </div>
      )}
    </div>
  );

  if (livekitToken && livekitUrl) {
    return (
      <div className="relative h-full">
        <LiveKitRoom
          token={livekitToken}
          serverUrl={livekitUrl}
          connect={true}
          audio={false}
          video={false}
          style={{ height: "100%", position: "relative" }}
          onDisconnected={() => {
            console.log("[Lobby] LiveKit disconnected");
          }}
        >
          <RoomAudioRenderer />
          {lobbyContent}
        </LiveKitRoom>
      </div>
    );
  }

  return <div className="relative h-full">{lobbyContent}</div>;
}
