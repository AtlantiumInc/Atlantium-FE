import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";
import {
  getXanoClient,
  getPresenceChannelName,
  isRealtimeConfigured,
} from "@/lib/xano-realtime";
import type {
  ConnectionState,
  PresenceMap,
  PresencePayload,
  RealtimeMessage,
} from "@/lib/realtime-types";
import type { XanoClient } from "@xano/js-sdk";

// Type for the channel returned by XanoClient.channel()
type XanoChannel = ReturnType<XanoClient["channel"]>;

interface XanoRealtimeContextType {
  client: XanoClient | null;
  connectionState: ConnectionState;
  presenceMap: PresenceMap;
  isConnected: boolean;
  updatePresence: (status: "online" | "away") => void;
}

const XanoRealtimeContext = createContext<XanoRealtimeContextType | null>(null);

export function XanoRealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [client, setClient] = useState<XanoClient | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [presenceMap, setPresenceMap] = useState<PresenceMap>(new Map());

  // Refs for cleanup
  const presenceChannelRef = useRef<XanoChannel | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize client when authenticated
  useEffect(() => {
    if (!isRealtimeConfigured()) {
      console.warn("Xano Realtime is not configured. Skipping initialization.");
      return;
    }

    if (isAuthenticated && user && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const xanoClient = getXanoClient();
      const token = api.getAuthToken();

      if (token) {
        xanoClient.setRealtimeAuthToken(token);
      }

      setClient(xanoClient);
      setConnectionState("connected");
    } else if (!isAuthenticated) {
      // Disconnect when logged out
      isInitializedRef.current = false;
      setClient(null);
      setConnectionState("disconnected");
      setPresenceMap(new Map());
      presenceChannelRef.current = null;
    }
  }, [isAuthenticated, user]);

  // Sync auth token changes
  useEffect(() => {
    if (client && isAuthenticated) {
      const token = api.getAuthToken();
      if (token) {
        client.setRealtimeAuthToken(token);
      }
    }
  }, [client, isAuthenticated]);

  // Subscribe to global presence channel
  useEffect(() => {
    if (!client || connectionState !== "connected" || !user) return;

    // Don't re-subscribe if already subscribed
    if (presenceChannelRef.current) return;

    try {
      const presenceChannel = client.channel(getPresenceChannelName());
      presenceChannelRef.current = presenceChannel;

      presenceChannel.on((message: RealtimeMessage) => {
        if (
          message.action === "presence_update" ||
          message.action === "message"
        ) {
          const payload = (message.payload || message) as PresencePayload;
          if (payload.user_id && payload.status) {
            setPresenceMap((prev) => {
              const next = new Map(prev);
              if (payload.status === "offline") {
                next.delete(payload.user_id);
              } else {
                next.set(payload.user_id, payload);
              }
              return next;
            });
          }
        }

        // Handle Xano's built-in presence events
        if (message.action === "presence_full") {
          const members = message.payload as PresencePayload[];
          if (Array.isArray(members)) {
            setPresenceMap((prev) => {
              const next = new Map(prev);
              members.forEach((member) => {
                if (member.user_id) {
                  next.set(member.user_id, member);
                }
              });
              return next;
            });
          }
        }
      });

      // Announce own presence
      presenceChannel.message({
        action: "presence_update",
        payload: {
          user_id: user.id,
          username: user.display_name || user.email,
          status: "online",
        },
      });
    } catch (error) {
      console.error("Failed to subscribe to presence channel:", error);
    }

    // Cleanup on unmount
    return () => {
      if (presenceChannelRef.current && user) {
        try {
          presenceChannelRef.current.message({
            action: "presence_update",
            payload: {
              user_id: user.id,
              username: user.display_name || user.email,
              status: "offline",
            },
          });
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, [client, connectionState, user]);

  // Handle page visibility for presence
  useEffect(() => {
    if (!presenceChannelRef.current || !user) return;

    const handleVisibilityChange = () => {
      if (!presenceChannelRef.current || !user) return;

      try {
        presenceChannelRef.current.message({
          action: "presence_update",
          payload: {
            user_id: user.id,
            username: user.display_name || user.email,
            status: document.hidden ? "away" : "online",
          },
        });
      } catch {
        // Ignore errors
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  // Handle page unload
  useEffect(() => {
    if (!presenceChannelRef.current || !user) return;

    const handleBeforeUnload = () => {
      if (!presenceChannelRef.current || !user) return;

      try {
        presenceChannelRef.current.message({
          action: "presence_update",
          payload: {
            user_id: user.id,
            username: user.display_name || user.email,
            status: "offline",
          },
        });
      } catch {
        // Ignore errors
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  const updatePresence = useCallback(
    (status: "online" | "away") => {
      if (presenceChannelRef.current && user) {
        try {
          presenceChannelRef.current.message({
            action: "presence_update",
            payload: {
              user_id: user.id,
              username: user.display_name || user.email,
              status,
            },
          });
        } catch (error) {
          console.error("Failed to update presence:", error);
        }
      }
    },
    [user]
  );

  return (
    <XanoRealtimeContext.Provider
      value={{
        client,
        connectionState,
        presenceMap,
        isConnected: connectionState === "connected",
        updatePresence,
      }}
    >
      {children}
    </XanoRealtimeContext.Provider>
  );
}

export function useXanoRealtime() {
  const context = useContext(XanoRealtimeContext);
  if (!context) {
    throw new Error(
      "useXanoRealtime must be used within a XanoRealtimeProvider"
    );
  }
  return context;
}
