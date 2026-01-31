import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Elements } from "@stripe/react-stripe-js";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Crown, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "../../ui/button";
import { stripePromise } from "../../../lib/stripe";
import { api } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepPricingProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
  onPlanSelected: (tier: string) => void;
  onBack?: () => void;
}

type PlanTier = "free" | "club" | "club_annual";

interface PricingPlan {
  id: PlanTier;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  savings?: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    features: [
      "Access to public events",
      "Community feed access",
      "Basic member profile",
    ],
  },
  {
    id: "club",
    name: "Club",
    price: "$49",
    period: "/month",
    description: "For serious builders",
    popular: true,
    features: [
      "Everything in Free",
      "Exclusive member events",
      "Weekly office hours",
      "Member directory access",
      "Priority event registration",
      "Founder resources library",
    ],
  },
  {
    id: "club_annual",
    name: "Club Annual",
    price: "$399",
    period: "/year",
    description: "Best value for committed builders",
    savings: "Save $189",
    features: [
      "Everything in Club",
      "2 months free",
      "Annual member badge",
      "Early access to new features",
    ],
  },
];

function PricingCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PricingPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
        plan.popular && "ring-2 ring-primary/20"
      )}
      onClick={onSelect}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {plan.savings && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            {plan.savings}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {plan.id !== "free" && <Crown className="h-4 w-4 text-yellow-500" />}
            {plan.name}
          </h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
            selected ? "border-primary bg-primary" : "border-muted-foreground"
          )}
        >
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold">{plan.price}</span>
        <span className="text-muted-foreground">{plan.period}</span>
      </div>

      <ul className="space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function PaymentFormInline({
  clientSecret,
  onSuccess,
  onCancel,
  planName,
  planPrice,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  planName: string;
  planPrice: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

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
        },
        redirect: "if_required",
      });

      if (setupError) throw new Error(setupError.message);

      if (!setupIntent?.payment_method) {
        throw new Error("Failed to set up payment method");
      }

      const subscribeResponse = await api.subscribe(
        setupIntent.payment_method as string
      );

      if (subscribeResponse.requires_action && subscribeResponse.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          subscribeResponse.client_secret
        );
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
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4 mt-6 p-4 rounded-lg border bg-card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{planName} Membership</p>
          <p className="text-sm text-muted-foreground">{planPrice}</p>
        </div>
        <Sparkles className="h-5 w-5 text-yellow-500" />
      </div>

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe. Cancel anytime.</span>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Choose Free
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !paymentReady || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            `Subscribe ${planPrice}`
          )}
        </Button>
      </div>
    </motion.form>
  );
}

export function StepPricing({
  formData,
  onUpdate,
  onPlanSelected,
  onBack,
}: StepPricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(
    (formData.membership_tier as PlanTier) || "free"
  );
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedPlanData = PRICING_PLANS.find((p) => p.id === selectedPlan);

  useEffect(() => {
    if (showPayment && !clientSecret && selectedPlan !== "free") {
      setIsLoading(true);
      api
        .createSetupIntent()
        .then((response) => setClientSecret(response.client_secret))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [showPayment, clientSecret, selectedPlan]);

  const handlePlanSelect = (planId: PlanTier) => {
    setSelectedPlan(planId);
    setShowPayment(false);
    setClientSecret(null);
  };

  const handleContinue = () => {
    if (selectedPlan === "free") {
      onUpdate("membership_tier" as keyof OnboardingFormData, "free");
      onPlanSelected("free");
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    onUpdate("membership_tier" as keyof OnboardingFormData, selectedPlan);
    onPlanSelected(selectedPlan);
  };

  const handlePaymentCancel = () => {
    setSelectedPlan("free");
    setShowPayment(false);
    onUpdate("membership_tier" as keyof OnboardingFormData, "free");
    onPlanSelected("free");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Choose your membership
        </h2>
        <p className="text-muted-foreground">
          Select the plan that fits your journey. You can change anytime.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan === plan.id}
            onSelect={() => handlePlanSelect(plan.id)}
          />
        ))}
      </div>

      {!showPayment ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between pt-4"
        >
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button onClick={handleContinue} size="lg" className="min-w-[200px] ml-auto">
            {selectedPlan === "free" ? (
              "Continue with Free"
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Continue with {selectedPlanData?.name}
              </>
            )}
          </Button>
        </motion.div>
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
          <PaymentFormInline
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            planName={selectedPlanData?.name || "Club"}
            planPrice={`${selectedPlanData?.price}${selectedPlanData?.period}`}
          />
        </Elements>
      ) : null}
    </motion.div>
  );
}
