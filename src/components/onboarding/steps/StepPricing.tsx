import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Elements } from "@stripe/react-stripe-js";
import { ArrowLeft, Check, Crown, Loader2, Calendar, Star } from "lucide-react";
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
  existingSubscription?: string;
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
  icon: typeof Crown;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "club",
    name: "Club Membership",
    price: "$49",
    period: "/month",
    description: "For serious builders",
    popular: true,
    icon: Crown,
    features: [
      "Everything in Free",
      "Exclusive member events",
      "Daily office hours",
      "Priority event registration",
      "Startup advisor",
    ],
  },
  {
    id: "club_annual",
    name: "Annual Membership",
    price: "$399",
    period: "/year",
    description: "Committed to the frontier",
    savings: "Save $189",
    icon: Calendar,
    features: [
      "Everything in Club",
      "2 months free",
      "Quarterly performance review",
      "Discounted services",
      "Project support",
    ],
  },
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: " forever",
    description: "Get started with the basics",
    icon: Star,
    features: [
      "Frontier feed access",
      "Focus groups",
      "Public events",
      "Templates & source code",
      "Software perks & discounts",
    ],
  },
];

function PricingCard({
  plan,
  selected,
  onSelect,
  compact = false,
}: {
  plan: PricingPlan;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const Icon = plan.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-xl border-2 p-5 cursor-pointer transition-all h-full",
        selected
          ? "border-primary bg-primary/5"
          : plan.id === "free"
            ? "border-border/50 bg-muted/30 opacity-80 hover:opacity-100 hover:border-border"
            : "border-border hover:border-primary/50",
        plan.popular && !selected && "ring-2 ring-primary/30 border-primary/40",
        plan.popular && selected && "ring-2 ring-primary"
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

      <div className={cn("flex items-start justify-between", compact ? "mb-2" : "mb-4")}>
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {plan.id !== "free" && <Icon className="h-4 w-4 text-yellow-500" />}
            {plan.name}
          </h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
            selected ? "border-primary bg-primary" : "border-muted-foreground"
          )}
        >
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      </div>

      <div className={compact ? "mb-2" : "mb-4"}>
        <span className="text-3xl font-bold">{plan.price}</span>
        <span className="text-muted-foreground">{plan.period}</span>
      </div>

      <ul className={cn("space-y-2", compact && "flex flex-wrap gap-x-4 gap-y-1")}>
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
  existingSubscription,
}: StepPricingProps) {
  // If user already has a subscription, use that as the selected plan
  const hasExistingPaidSubscription = existingSubscription && existingSubscription !== "free";

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(
    (existingSubscription as PlanTier) || (formData.membership_tier as PlanTier) || "club"
  );
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPaid, setHasPaid] = useState(!!hasExistingPaidSubscription);

  const selectedPlanData = PRICING_PLANS.find((p) => p.id === selectedPlan);
  const paidPlans = PRICING_PLANS.filter((p) => p.id !== "free");
  const freePlan = PRICING_PLANS.find((p) => p.id === "free")!;

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
    if (hasPaid) return; // Can't change after payment
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    // If user already has a paid subscription, just continue
    if (hasExistingPaidSubscription) {
      onUpdate("membership_tier" as keyof OnboardingFormData, selectedPlan);
      onPlanSelected(selectedPlan);
      return;
    }

    if (selectedPlan === "free") {
      onUpdate("membership_tier" as keyof OnboardingFormData, "free");
      onPlanSelected("free");
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    setHasPaid(true);
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

        {/* If user already has subscription or just paid, only show their plan */}
        {hasPaid ? (
          <div className="max-w-md mx-auto">
            <PricingCard
              plan={selectedPlanData!}
              selected={true}
              onSelect={() => {}}
            />
            <p className="text-center text-sm text-muted-foreground mt-4">
              {hasExistingPaidSubscription
                ? "You already have an active membership"
                : "Your membership has been confirmed"}
            </p>
          </div>
        ) : (
          <>
            {/* Club & Annual side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paidPlans.map((plan) => (
                <div key={plan.id} className="min-w-0">
                  <PricingCard
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={() => handlePlanSelect(plan.id)}
                  />
                </div>
              ))}
            </div>

            {/* Free card spans below */}
            <div className="border-t border-border/50 pt-4">
              <PricingCard
                plan={freePlan}
                selected={selectedPlan === "free"}
                onSelect={() => handlePlanSelect("free")}
                compact
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-4 pt-6">
          {onBack && !hasPaid && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            size="lg"
            className="min-w-[200px]"
          >
            {hasPaid ? (
              "Continue"
            ) : selectedPlan === "free" ? (
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
    console.log("[StepPricing] Rendering Elements with clientSecret:", clientSecret.substring(0, 30) + "...");
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
              <h3 className="font-semibold text-lg">{selectedPlanData?.name}</h3>
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
          options={{ clientSecret }}
        >
          <PaymentForm
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onCancel={handleBackToPlans}
            tier={selectedPlan as "club" | "club_annual"}
          />
        </Elements>
      </motion.div>
    );
  }

  return null;
}
