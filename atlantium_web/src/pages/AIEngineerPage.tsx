import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { Check, Loader2, Lock, Mail, Shield, Zap, BookOpen, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { stripePromise } from "@/lib/stripe";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { InlineAuth } from "@/components/InlineAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/api";

const trainingBenefits = [
  { icon: Zap, text: "Full AI Engineer training curriculum" },
  { icon: BookOpen, text: "Hands-on projects with real-world applications" },
  { icon: Users, text: "Access to the Atlantium community & network" },
  { icon: Shield, text: "2 months of free Atlantium membership included" },
];

function TrainingPaymentForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    if (!email) {
      setError("Email is required");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Submit the PaymentElement
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      // Confirm the SetupIntent
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: {
            billing_details: { email },
          },
        },
        redirect: "if_required",
      });

      if (setupError) throw new Error(setupError.message);
      if (!setupIntent?.payment_method) throw new Error("Failed to set up payment method");

      // Call purchase-training endpoint
      const response = await api.purchaseTraining(setupIntent.payment_method as string);

      if (response.requires_action && response.client_secret) {
        // Handle 3DS for the $500 payment
        const { error: confirmError } = await stripe.confirmCardPayment(response.client_secret);
        if (confirmError) throw new Error(confirmError.message);

        // After 3DS success, activate the training (creates subscription)
        if (response.payment_intent_id) {
          await api.activateTraining(response.payment_intent_id);
        }
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = stripe && paymentReady && email;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="billing-email" className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Billing Email
        </Label>
        <Input
          id="billing-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: { country: "auto" },
              },
            },
          }}
          onChange={(e) => {
            setPaymentReady(e.complete);
            setError(null);
          }}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe. Your payment details are encrypted.</span>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-medium"
        disabled={!isFormValid || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay $500 — Start Training"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        $500 one-time payment today. After 2 months, $128/mo for Atlantium membership.
        Cancel anytime.
      </p>
    </form>
  );
}

function CheckoutSection({ onSuccess }: { onSuccess: () => void }) {
  const { isAuthenticated } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initSetupIntent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.createSetupIntent();
      setClientSecret(response.client_secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !clientSecret) {
      initSetupIntent();
    }
  }, [isAuthenticated, clientSecret]);

  const handleAuthSuccess = (_user: User, token: string) => {
    api.setAuthToken(token);
    // Auth context will pick this up; setupIntent will init via the useEffect
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Create your account to get started
        </p>
        <InlineAuth onSuccess={handleAuthSuccess} ctaText="Continue to Payment" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={initSetupIntent}>
          Try again
        </Button>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "hsl(var(--primary))",
            colorBackground: "hsl(var(--background))",
            colorText: "hsl(var(--foreground))",
            colorDanger: "hsl(var(--destructive))",
            fontFamily: "inherit",
            borderRadius: "6px",
          },
        },
      }}
    >
      <TrainingPaymentForm clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  );
}

export function AIEngineerPage() {
  const [purchased, setPurchased] = useState(false);
  const { refreshSubscription } = useSubscription();

  const handleSuccess = async () => {
    setPurchased(true);
    await refreshSubscription();
    toast.success("Welcome to AI Engineer Training!");
  };

  if (purchased) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">You're In!</h1>
          <p className="text-muted-foreground">
            Your AI Engineer training access is active. Your Atlantium membership
            will begin in 2 months at $128/mo.
          </p>
          <Button asChild className="w-full">
            <a href="/dashboard">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <nav className="border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Atlantium" className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight">Atlantium</span>
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          {/* Left — offer details */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-medium text-primary tracking-wide uppercase">
                AI Engineer Training
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                Become an AI Engineer
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A hands-on training program to build real AI applications.
                Includes 2 months of Atlantium membership at no extra cost.
              </p>
            </div>

            <div className="space-y-4">
              {trainingBenefits.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* Pricing breakdown */}
            <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AI Engineer Training</span>
                <span className="font-semibold">$500</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Atlantium Membership (first 2 months)</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">After 2 months</span>
                <span className="font-semibold">$128/mo</span>
              </div>
            </div>
          </div>

          {/* Right — checkout form */}
          <div className="md:sticky md:top-24">
            <div className="rounded-xl border bg-card p-6 md:p-8 space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-semibold">Get Started</h2>
                <p className="text-sm text-muted-foreground">
                  One-time payment of <span className="font-medium text-foreground">$500</span>
                </p>
              </div>

              <CheckoutSection onSuccess={handleSuccess} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
