import { useState, useEffect, useCallback, useRef } from "react";
import { useXanoRealtime } from "@/contexts/XanoRealtimeContext";
import { getThreadChannelName } from "@/lib/xano-realtime";
import type {
  RealtimeMessage,
  NewMessagePayload,
  TypingPayload,
} from "@/lib/realtime-types";
import type { ThreadMessage } from "@/lib/types";
import type { XanoClient } from "@xano/js-sdk";

// Type for the channel returned by XanoClient.channel()
type XanoChannel = ReturnType<XanoClient["channel"]>;

interface UseThreadChannelOptions {
  threadId: string | null;
  onNewMessage?: (message: ThreadMessage) => void;
  onTypingStart?: (payload: TypingPayload) => void;
  onTypingStop?: (payload: TypingPayload) => void;
}

interface UseThreadChannelReturn {
  typingUsers: TypingPayload[];
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  broadcastMessage: (message: NewMessagePayload) => void;
}

export function useThreadChannel({
  threadId,
  onNewMessage,
  onTypingStart,
  onTypingStop,
}: UseThreadChannelOptions): UseThreadChannelReturn {
  const { client, isConnected } = useXanoRealtime();
  const [typingUsers, setTypingUsers] = useState<TypingPayload[]>([]);

  // Use refs for callbacks to avoid re-subscribing on every callback change
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingStartRef = useRef(onTypingStart);
  const onTypingStopRef = useRef(onTypingStop);

  // Update refs when callbacks change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onTypingStartRef.current = onTypingStart;
    onTypingStopRef.current = onTypingStop;
  }, [onNewMessage, onTypingStart, onTypingStop]);

  // Channel ref for sending messages
  const channelRef = useRef<XanoChannel | null>(null);

  // Typing timeout refs for auto-clear
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Subscribe to thread channel
  useEffect(() => {
    if (!client || !isConnected || !threadId) {
      channelRef.current = null;
      return;
    }

    const channelName = getThreadChannelName(threadId);
    console.log("[ThreadChannel] Subscribing to channel:", channelName);

    try {
      const channel = client.channel(channelName);
      channelRef.current = channel;
      console.log("[ThreadChannel] Channel subscribed successfully");

      // Also subscribe to parent "thread" channel
      const parentChannel = client.channel("thread");
      parentChannel.on((msg: RealtimeMessage) => {
        handleIncomingMessage(msg);
      });

      // Listen for "event" action specifically (what api.realtime_event sends)
      channel.on("event" as any, (message: RealtimeMessage) => {
        handleIncomingMessage(message);
      });

      // Also listen for all messages as fallback
      channel.on((message: RealtimeMessage) => {
        handleIncomingMessage(message);
      });

      function handleIncomingMessage(message: RealtimeMessage) {
        console.log("[ThreadChannel] Raw message received:", message);
        // Handle different message formats from Xano
        let action = message.action;
        const msgAny = message as any;
        let payload = msgAny.payload || msgAny.data || message;

        // If this is an "event" from api.realtime_event, unwrap it
        // Xano wraps the data as: { action: "event", payload: { data: { action: "new_message", payload: {...} }, dbo_id, row_id } }
        if (action === "event" && payload) {
          const eventData = payload as any;

          // Check if the actual data is nested inside a 'data' field
          if (eventData.data && eventData.data.action) {
            action = eventData.data.action;
            payload = eventData.data.payload || eventData.data;
          } else if (eventData.action) {
            // Direct structure: { action: "new_message", payload: {...} }
            action = eventData.action;
            payload = eventData.payload || eventData;
          }
        }

        switch (action) {
          case "new_message":
          case "message": {
            const msgPayload = payload as NewMessagePayload;

            // Validate it's a new message payload
            if (msgPayload.message_id && msgPayload.thread_id) {
              // Convert to ThreadMessage format
              const threadMessage: ThreadMessage = {
                message_id: msgPayload.message_id,
                thread_id: msgPayload.thread_id,
                sender_id: msgPayload.sender_id,
                sender_username: msgPayload.sender_username,
                sender_avatar: msgPayload.sender_avatar,
                content: msgPayload.content,
                is_reply: msgPayload.is_reply,
                parent_message: msgPayload.parent_message,
                created_at: msgPayload.created_at,
              };
              onNewMessageRef.current?.(threadMessage);
            }
            break;
          }

          case "typing_start": {
            const typingPayload = payload as TypingPayload;
            if (typingPayload.user_id) {
              setTypingUsers((prev) => {
                const existing = prev.find(
                  (u) => u.user_id === typingPayload.user_id
                );
                if (existing) return prev;
                return [...prev, typingPayload];
              });

              // Auto-clear typing after 3 seconds
              const existingTimeout = typingTimeoutRef.current.get(
                typingPayload.user_id
              );
              if (existingTimeout) clearTimeout(existingTimeout);

              const timeout = setTimeout(() => {
                setTypingUsers((prev) =>
                  prev.filter((u) => u.user_id !== typingPayload.user_id)
                );
                typingTimeoutRef.current.delete(typingPayload.user_id);
              }, 3000);

              typingTimeoutRef.current.set(typingPayload.user_id, timeout);
              onTypingStartRef.current?.(typingPayload);
            }
            break;
          }

          case "typing_stop": {
            const typingPayload = payload as TypingPayload;
            if (typingPayload.user_id) {
              setTypingUsers((prev) =>
                prev.filter((u) => u.user_id !== typingPayload.user_id)
              );

              const timeout = typingTimeoutRef.current.get(
                typingPayload.user_id
              );
              if (timeout) {
                clearTimeout(timeout);
                typingTimeoutRef.current.delete(typingPayload.user_id);
              }
              onTypingStopRef.current?.(typingPayload);
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error("Failed to subscribe to thread channel:", error);
      channelRef.current = null;
    }

    // Cleanup on unmount or thread change
    return () => {
      channelRef.current = null;
      setTypingUsers([]);

      // Clear all typing timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [client, isConnected, threadId]);

  const sendTypingStart = useCallback(() => {
    if (channelRef.current && threadId) {
      try {
        channelRef.current.message({
          action: "typing_start",
          payload: { thread_id: threadId },
        });
      } catch (error) {
        console.error("Failed to send typing start:", error);
      }
    }
  }, [threadId]);

  const sendTypingStop = useCallback(() => {
    if (channelRef.current && threadId) {
      try {
        channelRef.current.message({
          action: "typing_stop",
          payload: { thread_id: threadId },
        });
      } catch (error) {
        console.error("Failed to send typing stop:", error);
      }
    }
  }, [threadId]);

  const broadcastMessage = useCallback((message: NewMessagePayload) => {
    if (channelRef.current) {
      try {
        channelRef.current.message({
          action: "new_message",
          payload: message,
        });
      } catch (error) {
        console.error("Failed to broadcast message:", error);
      }
    }
  }, []);

  return {
    typingUsers,
    sendTypingStart,
    sendTypingStop,
    broadcastMessage,
  };
}
