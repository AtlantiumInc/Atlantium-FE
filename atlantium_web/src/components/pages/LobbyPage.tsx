import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { LobbyMember, LobbyPosition, ThreadMessage } from "@/lib/types";
import type {
  LobbyJoinPayload,
  LobbyLeavePayload,
  PositionUpdatePayload,
} from "@/lib/realtime-types";

const GRID_COLS = 10;
const GRID_ROWS = 6;

export function LobbyPage() {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [members, setMembers] = useState<Map<string, LobbyMember>>(new Map());
  const [myPosition, setMyPosition] = useState<LobbyPosition | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMovingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef<string | null>(null);

  // Scroll to bottom of messages
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
    // Skip realtime messages from self (we already have the optimistic one)
    if (message.sender_id === user?.id) return;
    setMessages((prev) => {
      if (prev.some((m) => m.message_id === message.message_id)) return prev;
      return [...prev, message];
    });
  }, [user?.id]);

  // broadcastMessage available for client-side message broadcast if needed
  const { broadcastMessage: _broadcastMessage } = useLobbyChannel({
    threadId,
    onMemberJoin: handleMemberJoin,
    onMemberLeave: handleMemberLeave,
    onPositionUpdate: handlePositionUpdate,
    onNewMessage: handleNewMessage,
  });

  // Initialize lobby on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        // Get or create lobby
        const lobbyData = await api.getLobby();
        if (cancelled) return;

        setThreadId(lobbyData.thread_id);
        threadIdRef.current = lobbyData.thread_id;

        // Join lobby
        const joinData = await api.joinLobby();
        if (cancelled) return;
        setMyPosition(joinData.position);

        // Re-fetch lobby to get accurate members list (includes ourselves with correct profile data)
        const freshData = await api.getLobby();
        if (cancelled) return;
        const membersMap = new Map<string, LobbyMember>();
        for (const m of freshData.members) {
          membersMap.set(m.user_id, m);
        }
        setMembers(membersMap);

        // Load recent messages
        try {
          const msgData = await api.getThreadMessages(lobbyData.thread_id, 1, 50);
          if (cancelled) return;
          setMessages(msgData.messages.reverse());
        } catch {
          // Messages may fail if thread is brand new, that's ok
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lobby");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    // Leave lobby on unmount
    return () => {
      cancelled = true;
      if (threadIdRef.current) {
        api.leaveLobby().catch(() => {});
      }
    };
  }, []);

  // beforeunload handler for tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (threadIdRef.current) {
        const token = api.getAuthToken();
        if (token) {
          navigator.sendBeacon(
            `${window.location.origin}/api/lobby-leave`,
            // sendBeacon doesn't support auth headers, so fall back to fetch keepalive
          );
          // Use fetch with keepalive as fallback
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

  // Arrow key movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!myPosition || !threadId || isMovingRef.current) return;

      let newCol = myPosition.col;
      let newRow = myPosition.row;

      switch (e.key) {
        case "ArrowUp":
          newRow = Math.max(0, myPosition.row - 1);
          break;
        case "ArrowDown":
          newRow = Math.min(GRID_ROWS - 1, myPosition.row + 1);
          break;
        case "ArrowLeft":
          newCol = Math.max(0, myPosition.col - 1);
          break;
        case "ArrowRight":
          newCol = Math.min(GRID_COLS - 1, myPosition.col + 1);
          break;
        default:
          return;
      }

      e.preventDefault();

      if (newCol === myPosition.col && newRow === myPosition.row) return;

      // Check if occupied locally
      for (const member of members.values()) {
        if (
          member.position &&
          member.position.col === newCol &&
          member.position.row === newRow &&
          member.user_id !== user?.id
        ) {
          return; // Cell occupied
        }
      }

      // Optimistic update
      const prevPosition = { ...myPosition };
      setMyPosition({ col: newCol, row: newRow });
      setMembers((prev) => {
        const me = prev.get(user?.id || "");
        if (!me) return prev;
        const next = new Map(prev);
        next.set(user!.id, { ...me, position: { col: newCol, row: newRow } });
        return next;
      });

      isMovingRef.current = true;
      api.moveLobby(newCol, newRow)
        .catch(() => {
          setMyPosition(prevPosition);
          setMembers((prev) => {
            const me = prev.get(user?.id || "");
            if (!me) return prev;
            const next = new Map(prev);
            next.set(user!.id, { ...me, position: prevPosition });
            return next;
          });
        })
        .finally(() => {
          isMovingRef.current = false;
        });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [myPosition, members, threadId, user?.id]);

  // Click to move
  const handleCellClick = (col: number, row: number) => {
    if (!myPosition || !threadId || !user || isMovingRef.current) return;
    if (col === myPosition.col && row === myPosition.row) return;

    // Check if occupied
    for (const member of members.values()) {
      if (
        member.position &&
        member.position.col === col &&
        member.position.row === row &&
        member.user_id !== user.id
      ) {
        return;
      }
    }

    const prevPosition = { ...myPosition };
    setMyPosition({ col, row });
    setMembers((prev) => {
      const me = prev.get(user.id);
      if (!me) return prev;
      const next = new Map(prev);
      next.set(user.id, { ...me, position: { col, row } });
      return next;
    });

    isMovingRef.current = true;
    api.moveLobby(col, row)
      .catch(() => {
        setMyPosition(prevPosition);
        setMembers((prev) => {
          const me = prev.get(user.id);
          if (!me) return prev;
          const next = new Map(prev);
          next.set(user.id, { ...me, position: prevPosition });
          return next;
        });
      })
      .finally(() => {
        isMovingRef.current = false;
      });
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !threadId || isSending) return;

    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    // Optimistic message
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
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === tempId
            ? { ...m, message_id: result.message_id, created_at: result.created_at }
            : m
        )
      );
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // Get member at a specific cell
  const getMemberAtCell = (col: number, row: number): LobbyMember | undefined => {
    for (const member of members.values()) {
      if (member.position && member.position.col === col && member.position.row === row) {
        return member;
      }
    }
    return undefined;
  };

  const getInitials = (member: LobbyMember) => {
    if (member.display_name) return member.display_name.charAt(0).toUpperCase();
    if (member.username) return member.username.charAt(0).toUpperCase();
    return "?";
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

  return (
    <div className="flex h-full">
      {/* Grid panel */}
      <div className="flex-1 flex flex-col p-4 overflow-auto">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {members.size} online
          </span>
        </div>

        <div className="grid grid-cols-10 gap-1.5 max-w-2xl">
          {Array.from({ length: GRID_ROWS }, (_, row) =>
            Array.from({ length: GRID_COLS }, (_, col) => {
              const member = getMemberAtCell(col, row);
              const isMe = member?.user_id === user?.id;

              return (
                <button
                  key={`${col}-${row}`}
                  className={`aspect-square rounded-lg border flex items-center justify-center transition-colors ${
                    isMe
                      ? "border-primary bg-primary/10"
                      : member
                      ? "border-border bg-muted/50"
                      : "border-border/50 bg-background hover:bg-muted/30 cursor-pointer"
                  }`}
                  onClick={() => !member && handleCellClick(col, row)}
                  title={
                    member
                      ? member.display_name || member.username || "Unknown"
                      : `Move to (${col}, ${row})`
                  }
                >
                  {member && (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className={`text-xs ${isMe ? "bg-primary text-primary-foreground" : ""}`}>
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </button>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Use arrow keys or click an empty cell to move
        </p>
      </div>

      {/* Chat panel */}
      <div className="w-80 border-l border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-medium">Chat</h3>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

        {/* Message input */}
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Send a message..."
              className="text-sm"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!messageInput.trim() || isSending}
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
