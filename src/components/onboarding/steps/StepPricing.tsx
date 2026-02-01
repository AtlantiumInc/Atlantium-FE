import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Elements } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { PaymentForm } from "../../subscription/PaymentForm";
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

  const handleBackToPlans = () => {
    setShowPayment(false);
    setClientSecret(null);
  };

  // Show pricing cards
  if (!showPayment) {
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

        <div className="flex items-center justify-between pt-6">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            size="lg"
            className="min-w-[200px] ml-auto"
          >
            {selectedPlan === "free" ? (
              "Continue with Free"
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Continue with {selectedPlanData?.name}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Show loading
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Setting up payment...</p>
      </motion.div>
    );
  }

  // Show payment form
  if (clientSecret) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Complete your membership
          </h2>
          <p className="text-muted-foreground">
            Enter your payment details to get started
          </p>
        </div>

        {/* Plan summary */}
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{selectedPlanData?.name} Membership</h3>
              <p className="text-2xl font-bold">
                {selectedPlanData?.price}{selectedPlanData?.period}
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {selectedPlanData?.features.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stripe Elements with PaymentForm */}
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
            onSuccess={handlePaymentSuccess}
            onCancel={handleBackToPlans}
          />
        </Elements>
      </motion.div>
    );
  }

  return null;
}
