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
    console.log("[useThreadChannel] Effect triggered", {
      hasClient: !!client,
      isConnected,
      threadId,
    });

    if (!client || !isConnected || !threadId) {
      console.log("[useThreadChannel] Skipping subscription - missing requirements");
      channelRef.current = null;
      return;
    }

    const channelName = getThreadChannelName(threadId);
    console.log("[useThreadChannel] Subscribing to channel:", channelName);

    try {
      const channel = client.channel(channelName);
      channelRef.current = channel;
      console.log("[useThreadChannel] Channel object created:", channel);

      // Also subscribe to parent "thread" channel to test
      const parentChannel = client.channel("thread");
      parentChannel.on((msg: RealtimeMessage) => {
        console.log("[useThreadChannel] PARENT 'thread' channel message:", msg);
      });

      // Listen for "event" action specifically (what api.realtime_event sends)
      channel.on("event" as any, (message: RealtimeMessage) => {
        console.log("[useThreadChannel] EVENT action received:", message);
        handleIncomingMessage(message);
      });

      // Also listen for all messages as fallback
      channel.on((message: RealtimeMessage) => {
        console.log("[useThreadChannel] RAW MESSAGE RECEIVED:", JSON.stringify(message, null, 2));
        handleIncomingMessage(message);
      });

      function handleIncomingMessage(message: RealtimeMessage) {
        console.log("[useThreadChannel] Processing message:", message);

        // Handle different message formats from Xano
        let action = message.action;
        const msgAny = message as any;
        let payload = msgAny.payload || msgAny.data || message;

        console.log("[useThreadChannel] Initial - action:", action, "payload:", payload);

        // If this is an "event" from api.realtime_event, unwrap it
        // Xano wraps the data as: { action: "event", payload: { data: { action: "new_message", payload: {...} }, dbo_id, row_id } }
        if (action === "event" && payload) {
          const eventData = payload as any;

          // Check if the actual data is nested inside a 'data' field
          if (eventData.data && eventData.data.action) {
            action = eventData.data.action;
            payload = eventData.data.payload || eventData.data;
            console.log("[useThreadChannel] Unwrapped from data field - action:", action, "payload:", payload);
          } else if (eventData.action) {
            // Direct structure: { action: "new_message", payload: {...} }
            action = eventData.action;
            payload = eventData.payload || eventData;
            console.log("[useThreadChannel] Unwrapped directly - action:", action, "payload:", payload);
          }
        }

        switch (action) {
          case "new_message":
          case "message": {
            const msgPayload = payload as NewMessagePayload;
            console.log("[useThreadChannel] new_message case - msgPayload:", msgPayload);

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
              console.log("[useThreadChannel] Calling onNewMessage callback with:", threadMessage);
              onNewMessageRef.current?.(threadMessage);
            } else {
              console.log("[useThreadChannel] Validation failed - missing message_id or thread_id");
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

          default:
            // Log unknown actions for debugging
            console.log("Unknown thread channel action:", action, payload);
        }
      }

      console.log("[useThreadChannel] Successfully subscribed to:", channelName);
    } catch (error) {
      console.error("[useThreadChannel] Failed to subscribe:", error);
      channelRef.current = null;
    }

    // Cleanup on unmount or thread change
    return () => {
      console.log("[useThreadChannel] Unsubscribing from channel:", channelName);
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
        console.log("Broadcasted message:", message.message_id);
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
