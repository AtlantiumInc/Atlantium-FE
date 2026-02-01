import { loadStripe } from "@stripe/stripe-js";

// Stripe publishable key from environment variable
const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHING_KEY;

console.log("[Stripe] Publishable key loaded:", STRIPE_PUBLISHABLE_KEY ? `${STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...` : "MISSING");

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error(
    "Missing VITE_STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHING_KEY environment variable"
  );
}

// Initialize Stripe - this returns a Promise that resolves to the Stripe instance
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY || "");

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
