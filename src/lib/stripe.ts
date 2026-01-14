import { loadStripe } from "@stripe/stripe-js";

// Stripe publishable key from environment variable
const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHING_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn(
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
