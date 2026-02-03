import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { Subscription } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  hasClubAccess: boolean;
  refreshSubscription: () => Promise<void>;
}

const defaultSubscription: Subscription = {
  membership_tier: "free",
  subscription_status: null,
  has_club_access: false,
  current_period_end: null,
  cancel_at_period_end: false,
  grace_period_end: null,
  payment_method: null,
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getSubscription();
      setSubscription(response.subscription);
    } catch (err) {
      // If no subscription record exists yet, use default (free tier)
      const status = (err as Error & { status?: number }).status;
      if (status === 404) {
        setSubscription(defaultSubscription);
      } else {
        setError("Failed to load subscription status");
        setSubscription(defaultSubscription);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch subscription when auth state changes
  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, isAuthenticated, fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  // Compute hasClubAccess from subscription data
  const hasClubAccess = subscription?.has_club_access ?? false;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading: isLoading || authLoading,
        error,
        hasClubAccess,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
