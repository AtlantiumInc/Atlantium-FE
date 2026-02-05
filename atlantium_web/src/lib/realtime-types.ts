// Xano Realtime type definitions

// Connection state for UI feedback
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// Realtime message actions
export type RealtimeAction =
  | "new_message"
  | "message_updated"
  | "message_deleted"
  | "typing_start"
  | "typing_stop"
  | "presence_update"
  | "connection_status"
  | "error"
  | "message"
  | "history"
  | "lobby_join"
  | "lobby_leave"
  | "position_update";

// Generic realtime message from Xano
export interface RealtimeMessage {
  action: RealtimeAction | string;
  payload?: unknown;
  timestamp?: number;
  sender_id?: string;
}

// Payload for new messages broadcast
export interface NewMessagePayload {
  message_id: string;
  thread_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar?: string;
  content: string;
  is_reply: boolean;
  parent_message?: {
    message_id: string;
    sender_id: string;
    content: string;
    created_at: string;
  };
  created_at: string;
}

// Payload for typing indicators
export interface TypingPayload {
  thread_id: string;
  user_id: string;
  username: string;
}

// Payload for presence updates
export interface PresencePayload {
  user_id: string;
  username: string;
  status: "online" | "offline" | "away";
  last_seen?: string;
}

// Presence tracking map
export type PresenceMap = Map<string, PresencePayload>;

// Lobby payloads
export interface LobbyJoinPayload {
  user_id: string;
  position: { col: number; row: number };
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface LobbyLeavePayload {
  user_id: string;
}

export interface PositionUpdatePayload {
  user_id: string;
  position: { col: number; row: number };
}

// Channel subscription info
export interface ChannelSubscription {
  channelName: string;
  threadId: string;
  unsubscribe: () => void;
}
