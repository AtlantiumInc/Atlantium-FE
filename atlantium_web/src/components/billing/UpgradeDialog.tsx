import { useCallback, useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe, type Appearance } from "@stripe/stripe-js";
import { Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MEMBER_PLAN, useBilling } from "./UpgradeCta";

/**
 * Embedded payment (Stripe Elements) — the card is collected in our own page
 * rather than on a redirect.
 *
 * Flow: SetupIntent → confirmSetup in the browser → the server creates the
 * subscription with the resulting payment method. Collecting first means an
 * abandoned form leaves no `incomplete` subscription behind, and the member
 * never leaves Atlantium.
 *
 * The webhook remains the authority on membership state; this dialog only
 * decides what to show while `customer.subscription.created` is in flight.
 */

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(publishableKey: string) {
  // loadStripe injects a script tag — memoize so reopening doesn't reload it.
  stripePromise ??= loadStripe(publishableKey);
  return stripePromise;
}

const appearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#22d3ee",
    colorBackground: "#0b1220",
    colorText: "#e2e8f0",
    colorDanger: "#f87171",
    borderRadius: "10px",
    fontFamily: "inherit",
  },
};

type Plan = "club_annual";

export function UpgradeDialog({
  open,
  onOpenChange,
  reason,
  defaultPlan = "club_annual",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
  defaultPlan?: Plan;
}) {
  const [plan] = useState<Plan>(defaultPlan);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // One SetupIntent per opening — switching plans reuses it, since the card is
  // collected before the plan is charged.
  useEffect(() => {
    if (!open || clientSecret) return;
    setIsLoading(true);
    (async () => {
      try {
        const config = await api.getBillingConfig();
        if (!config.publishable_key) {
          setError("Card payments aren't switched on yet.");
          return;
        }
        setPublishableKey(config.publishable_key);
        const { client_secret } = await api.createBillingSetupIntent();
        setClientSecret(client_secret);
      } catch (e) {
        const err = e as { code?: string; message?: string };
        setError(err.code === "billing_unavailable"
          ? "Card payments aren't switched on yet."
          : err.message ?? "Couldn't start checkout.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [open, clientSecret]);

  const options = useMemo(
    () => (clientSecret ? { clientSecret, appearance } : null),
    [clientSecret],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join as a member</DialogTitle>
          <DialogDescription>
            {reason ?? "Member DMs, exclusive events, and the agent."}
          </DialogDescription>
        </DialogHeader>

        <PlanSummary />

        {error ? (
          <p className="rounded-lg border border-border/60 bg-card/50 p-3 text-sm text-muted-foreground">{error}</p>
        ) : isLoading || !options || !publishableKey ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <Elements stripe={getStripe(publishableKey)} options={options}>
            <PaymentForm plan={plan} onDone={() => onOpenChange(false)} />
          </Elements>
        )}

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Card details go straight to Stripe — they never touch Atlantium's servers.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** One plan, so this states the terms rather than offering a choice. */
function PlanSummary() {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
      <span className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{MEMBER_PLAN.annual.price}</span>
        <span className="text-[11px] text-muted-foreground">{MEMBER_PLAN.annual.period}</span>
      </span>
      <span className="block text-[11px] text-muted-foreground">
        {MEMBER_PLAN.annual.note} · about $24 a month
      </span>
    </div>
  );
}

function PaymentForm({ plan, onDone }: { plan: Plan; onDone: () => void }) {
  const [promoCode, setPromoCode] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { refresh } = useBilling();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setIsPaying(true);
    setError(null);

    try {
      const ready = await elements.submit();
      if (ready.error) {
        setError(ready.error.message ?? "Check your card details.");
        return;
      }

      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: { billing_details: { email: user?.email ?? undefined } },
          // 3DS sends the member away and back; everything else stays in-page.
          return_url: `${window.location.origin}/dashboard?upgraded=1`,
        },
        redirect: "if_required",
      });

      if (setupError) {
        setError(setupError.message ?? "That card couldn't be saved.");
        return;
      }
      const paymentMethodId = setupIntent?.payment_method;
      if (typeof paymentMethodId !== "string") {
        setError("We couldn't confirm that payment method.");
        return;
      }

      const result = await api.subscribeWithPaymentMethod(plan, paymentMethodId, promoCode.trim() || undefined);
      // Membership lands via webhook; refresh so the UI catches up as soon as
      // it does rather than claiming success the server hasn't recorded.
      await refresh();
      toast.success(result.active
        ? "You're a member — welcome in."
        : "Payment received. Your membership activates in a moment.");
      onDone();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(err.code === "already_subscribed"
        ? "You already have an active membership."
        : err.message ?? "Something went wrong taking that payment.");
    } finally {
      setIsPaying(false);
    }
  }, [stripe, elements, plan, user, refresh, onDone, promoCode]);

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {/* Promo code — collapsed behind a link so the default path stays clean.
          Applied server-side at subscription creation; an invalid code fails
          BEFORE any charge. */}
      {showPromo ? (
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Promo code"
          autoFocus
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-primary/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPromo(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Have a promo code?
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" className="w-full gap-2" disabled={!stripe || isPaying}>
        {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {`Pay ${MEMBER_PLAN.annual.price} / year`}
        {promoCode.trim() && <span className="text-xs opacity-80">· code {promoCode.trim()}</span>}
      </Button>
    </form>
  );
}
