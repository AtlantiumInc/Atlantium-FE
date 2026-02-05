import { useEffect, useCallback, useRef } from "react";
import { useXanoRealtime } from "@/contexts/XanoRealtimeContext";
import { getThreadChannelName } from "@/lib/xano-realtime";
import type {
  RealtimeMessage,
  NewMessagePayload,
  LobbyJoinPayload,
  LobbyLeavePayload,
  PositionUpdatePayload,
} from "@/lib/realtime-types";
import type { ThreadMessage } from "@/lib/types";
import type { XanoClient } from "@xano/js-sdk";

type XanoChannel = ReturnType<XanoClient["channel"]>;

interface UseLobbyChannelOptions {
  threadId: string | null;
  onMemberJoin?: (payload: LobbyJoinPayload) => void;
  onMemberLeave?: (payload: LobbyLeavePayload) => void;
  onPositionUpdate?: (payload: PositionUpdatePayload) => void;
  onNewMessage?: (message: ThreadMessage) => void;
}

interface UseLobbyChannelReturn {
  broadcastMessage: (message: NewMessagePayload) => void;
}

export function useLobbyChannel({
  threadId,
  onMemberJoin,
  onMemberLeave,
  onPositionUpdate,
  onNewMessage,
}: UseLobbyChannelOptions): UseLobbyChannelReturn {
  const { client, isConnected } = useXanoRealtime();

  const onMemberJoinRef = useRef(onMemberJoin);
  const onMemberLeaveRef = useRef(onMemberLeave);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onMemberJoinRef.current = onMemberJoin;
    onMemberLeaveRef.current = onMemberLeave;
    onPositionUpdateRef.current = onPositionUpdate;
    onNewMessageRef.current = onNewMessage;
  }, [onMemberJoin, onMemberLeave, onPositionUpdate, onNewMessage]);

  const channelRef = useRef<XanoChannel | null>(null);

  useEffect(() => {
    if (!client || !isConnected || !threadId) {
      channelRef.current = null;
      return;
    }

    const channelName = getThreadChannelName(threadId);
    console.log("[LobbyChannel] Subscribing to channel:", channelName);

    try {
      const channel = client.channel(channelName);
      channelRef.current = channel;

      const parentChannel = client.channel("thread");
      parentChannel.on((msg: RealtimeMessage) => {
        handleIncomingMessage(msg);
      });

      channel.on("event" as any, (message: RealtimeMessage) => {
        handleIncomingMessage(message);
      });

      channel.on((message: RealtimeMessage) => {
        handleIncomingMessage(message);
      });

      function handleIncomingMessage(message: RealtimeMessage) {
        let action = message.action;
        const msgAny = message as any;
        let payload = msgAny.payload || msgAny.data || message;

        // Unwrap Xano event wrapping
        if (action === "event" && payload) {
          const eventData = payload as any;
          if (eventData.data && eventData.data.action) {
            action = eventData.data.action;
            payload = eventData.data.payload || eventData.data;
          } else if (eventData.action) {
            action = eventData.action;
            payload = eventData.payload || eventData;
          }
        }

        switch (action) {
          case "lobby_join": {
            const joinPayload = payload as LobbyJoinPayload;
            if (joinPayload.user_id) {
              onMemberJoinRef.current?.(joinPayload);
            }
            break;
          }

          case "lobby_leave": {
            const leavePayload = payload as LobbyLeavePayload;
            if (leavePayload.user_id) {
              onMemberLeaveRef.current?.(leavePayload);
            }
            break;
          }

          case "position_update": {
            const posPayload = payload as PositionUpdatePayload;
            if (posPayload.user_id && posPayload.position) {
              onPositionUpdateRef.current?.(posPayload);
            }
            break;
          }

          case "new_message":
          case "message": {
            const msgPayload = payload as NewMessagePayload;
            if (msgPayload.message_id && msgPayload.thread_id) {
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
        }
      }
    } catch (error) {
      console.error("Failed to subscribe to lobby channel:", error);
      channelRef.current = null;
    }

    return () => {
      channelRef.current = null;
    };
  }, [client, isConnected, threadId]);

  const broadcastMessage = useCallback((message: NewMessagePayload) => {
    if (channelRef.current) {
      try {
        channelRef.current.message({
          action: "new_message",
          payload: message,
        });
      } catch (error) {
        console.error("Failed to broadcast lobby message:", error);
      }
    }
  }, []);

  return { broadcastMessage };
}
