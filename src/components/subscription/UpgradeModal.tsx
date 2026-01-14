import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { Crown, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { stripePromise } from "@/lib/stripe";
import { PaymentForm } from "./PaymentForm";
import { api } from "@/lib/api";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const benefits = [
  "RSVP to exclusive tech events",
  "Network with local builders",
  "Access to member-only meetups",
  "Priority event registration",
];

export function UpgradeModal({ open, onOpenChange, onSuccess }: UpgradeModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !clientSecret) {
      setIsLoading(true);
      setError(null);

      api.createSetupIntent()
        .then((response) => {
          setClientSecret(response.client_secret);
        })
        .catch((err) => {
          setError(err.message || "Failed to initialize payment");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, clientSecret]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Upgrade to Club</DialogTitle>
          </div>
          <DialogDescription>
            Join the Atlantium Club for $49/month and unlock exclusive features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benefits list */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-3">What you'll get:</p>
            <ul className="space-y-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment form with Stripe Elements */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : clientSecret ? (
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
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={onSuccess}
                onCancel={() => onOpenChange(false)}
              />
            </Elements>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
