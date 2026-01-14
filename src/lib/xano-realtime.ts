// Xano Realtime client configuration and utilities

import { XanoClient } from "@xano/js-sdk";

// Xano instance configuration
const XANO_INSTANCE_URL = "https://cloud.atlantium.ai/";
const XANO_REALTIME_HASH = import.meta.env.VITE_XANO_REALTIME_HASH || "";

// Singleton XanoClient instance
let xanoClientInstance: XanoClient | null = null;

/**
 * Get or create the singleton XanoClient instance
 */
export function getXanoClient(): XanoClient {
  if (!xanoClientInstance) {
    xanoClientInstance = new XanoClient({
      instanceBaseUrl: XANO_INSTANCE_URL,
      realtimeConnectionHash: XANO_REALTIME_HASH,
    });
  }
  return xanoClientInstance;
}

/**
 * Reset the XanoClient instance (useful for testing or logout)
 */
export function resetXanoClient(): void {
  xanoClientInstance = null;
}

/**
 * Get the channel name for a specific thread
 * Uses nested channel format: thread/{threadId}
 */
export function getThreadChannelName(threadId: string): string {
  return `thread/${threadId}`;
}

/**
 * Get the global presence channel name
 */
export function getPresenceChannelName(): string {
  return "presence-global";
}

/**
 * Check if realtime is properly configured
 */
export function isRealtimeConfigured(): boolean {
  return Boolean(XANO_REALTIME_HASH);
}
