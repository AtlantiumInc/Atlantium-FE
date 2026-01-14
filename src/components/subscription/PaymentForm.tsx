import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({ clientSecret, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!email) {
      setError("Email is required");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Submit the PaymentElement first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm the SetupIntent with the PaymentElement
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: {
            billing_details: {
              email,
            },
          },
        },
        redirect: "if_required",
      });

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (!setupIntent?.payment_method) {
        throw new Error("Failed to set up payment method");
      }

      // Create the subscription with the payment method
      const subscribeResponse = await api.subscribe(
        setupIntent.payment_method as string
      );

      // Handle 3D Secure if required
      if (subscribeResponse.requires_action && subscribeResponse.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          subscribeResponse.client_secret
        );

        if (confirmError) {
          throw new Error(confirmError.message);
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
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* Stripe Payment Element */}
      <div className="space-y-2">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: {
                  country: "auto",
                },
              },
            },
          }}
          onChange={(e) => {
            setPaymentReady(e.complete);
            if (e.error) {
              setError(e.error.message || null);
            } else {
              setError(null);
            }
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe. Your payment details are encrypted.</span>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!isFormValid || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Subscribe - $49/mo"
          )}
        </Button>
      </div>
    </form>
  );
}
