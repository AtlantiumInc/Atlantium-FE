// Xano Realtime client configuration and utilities

import { XanoClient } from "@xano/js-sdk";
import { api } from "./api";

// Xano instance configuration
const XANO_INSTANCE_URL = "https://cloud.atlantium.ai/";

// Singleton XanoClient instance
let xanoClientInstance: XanoClient | null = null;

// Cache for realtime hash
let realtimeHashCache: string | null = null;
let realtimeHashPromise: Promise<string | null> | null = null;

/**
 * Fetch the realtime hash from Xano API
 */
async function fetchRealtimeHash(): Promise<string | null> {
  try {
    const config = await api.getRealtimeConfig();
    if (!config.realtime_hash) {
      console.error("[Xano Realtime] No realtime hash returned from API");
      return null;
    }
    console.log("[Xano Realtime] Hash loaded from API");
    return config.realtime_hash;
  } catch (error) {
    console.error("[Xano Realtime] Failed to fetch config:", error);
    return null;
  }
}

/**
 * Get the realtime hash (cached)
 */
export async function getRealtimeHash(): Promise<string | null> {
  if (realtimeHashCache) {
    return realtimeHashCache;
  }
  if (!realtimeHashPromise) {
    realtimeHashPromise = fetchRealtimeHash().then((hash) => {
      realtimeHashCache = hash;
      return hash;
    });
  }
  return realtimeHashPromise;
}

/**
 * Get or create the singleton XanoClient instance
 * This is now async since we need to fetch the hash first
 */
export async function getXanoClientAsync(): Promise<XanoClient | null> {
  if (xanoClientInstance) {
    return xanoClientInstance;
  }

  const hash = await getRealtimeHash();
  if (!hash) {
    console.warn("[Xano Realtime] Cannot create client - no realtime hash available");
    return null;
  }

  xanoClientInstance = new XanoClient({
    instanceBaseUrl: XANO_INSTANCE_URL,
    realtimeConnectionHash: hash,
  });

  return xanoClientInstance;
}

/**
 * Get the XanoClient instance synchronously (returns null if not initialized)
 * Use getXanoClientAsync() for initialization
 */
export function getXanoClient(): XanoClient | null {
  return xanoClientInstance;
}

/**
 * Reset the XanoClient instance (useful for testing or logout)
 */
export function resetXanoClient(): void {
  xanoClientInstance = null;
  realtimeHashCache = null;
  realtimeHashPromise = null;
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
 * Check if realtime is properly configured (async version)
 */
export async function isRealtimeConfiguredAsync(): Promise<boolean> {
  const hash = await getRealtimeHash();
  return Boolean(hash);
}

/**
 * Check if realtime client has been initialized
 */
export function isRealtimeConfigured(): boolean {
  return xanoClientInstance !== null;
}
