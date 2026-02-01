import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { api } from "./api";

// Cache the Stripe promise so we only fetch the key once
let stripePromiseCache: Promise<Stripe | null> | null = null;

// Fetch publishable key from Xano and initialize Stripe
async function initializeStripe(): Promise<Stripe | null> {
  try {
    const config = await api.getStripeConfig();
    if (!config.publishable_key) {
      console.error("[Stripe] No publishable key returned from API");
      return null;
    }
    console.log("[Stripe] Publishable key loaded from API:", config.publishable_key.substring(0, 20) + "...");
    return loadStripe(config.publishable_key);
  } catch (error) {
    console.error("[Stripe] Failed to fetch config:", error);
    return null;
  }
}

// Get or create the Stripe promise
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromiseCache) {
    stripePromiseCache = initializeStripe();
  }
  return stripePromiseCache;
}

// For backwards compatibility - this will be a promise that resolves to Stripe
export const stripePromise = getStripePromise();

// Card element styling to match the app's design system
export const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      fontFamily: "inherit",
      "::placeholder": {
        color: "hsl(var(--muted-foreground))",
      },
    },
    invalid: {
      color: "hsl(var(--destructive))",
      iconColor: "hsl(var(--destructive))",
    },
  },
  hidePostalCode: true,
};
