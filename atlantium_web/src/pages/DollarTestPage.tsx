import { useState, useEffect } from "react";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Check, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { stripePromise } from "@/lib/stripe";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { InlineAuth } from "@/components/InlineAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/api";

function TestPaymentForm({
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
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

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

      const response = await api.dollarTest(setupIntent.payment_method as string);

      if (response.requires_action && response.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(response.client_secret);
        if (confirmError) throw new Error(confirmError.message);
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

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

      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { address: { country: "auto" } } },
        }}
        onChange={(e) => {
          setPaymentReady(e.complete);
          setError(null);
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe. This is a $1 test charge.</span>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-medium"
        disabled={!stripe || !paymentReady || !email || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay $1 — Test Charge"
        )}
      </Button>
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
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Sign in to run the test charge
        </p>
        <InlineAuth onSuccess={handleAuthSuccess} ctaText="Sign In" hideGoogle />
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
      <TestPaymentForm clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  );
}

export function DollarTestPage() {
  const [paid, setPaid] = useState(false);

  if (paid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Successful</h1>
          <p className="text-muted-foreground">
            $1 test charge went through. Stripe live mode is working.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Atlantium" className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight">Atlantium</span>
          </a>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 py-20">
        <div className="rounded-xl border bg-card p-6 md:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold">Stripe Live Test</h2>
            <p className="text-sm text-muted-foreground">
              One-time charge of <span className="font-medium text-foreground">$1.00</span>
            </p>
          </div>

          <CheckoutSection onSuccess={() => { setPaid(true); toast.success("$1 test charge successful!"); }} />
        </div>
      </div>
    </div>
  );
}
