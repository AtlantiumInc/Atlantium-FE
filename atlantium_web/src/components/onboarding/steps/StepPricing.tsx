import { useEffect } from "react";
import { motion } from "motion/react";
import { Check, Crown, Calendar, Star } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepPricingProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
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
    price: "$128",
    period: "/month",
    description: "For serious builders",
    popular: true,
    icon: Crown,
    features: [
      "Everything in Free",
      "Office hours Mon–Thu",
      "AI engineering curriculum",
      "Focus groups",
      "Exclusive member events",
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
    savings: "Save $1,137",
    icon: Calendar,
    features: [
      "Everything in Club",
      "9 months free",
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
      "iOS app access",
      "Frontier feed access",
      "Public events",
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

export function StepPricing({ formData, onUpdate }: StepPricingProps) {
  const selectedPlan = (formData.membership_tier as PlanTier) || "club";

  const paidPlans = PRICING_PLANS.filter((p) => p.id !== "free");
  const freePlan = PRICING_PLANS.find((p) => p.id === "free")!;

  // Record a default selection so the wizard's Continue always has a value,
  // even if the user doesn't tap a card. No charge or entitlement is applied —
  // the tier is persisted to registration_details for later follow-up.
  useEffect(() => {
    if (!formData.membership_tier) {
      onUpdate("membership_tier" as keyof OnboardingFormData, "club");
    }
  }, [formData.membership_tier, onUpdate]);

  const handlePlanSelect = (planId: PlanTier) => {
    onUpdate("membership_tier" as keyof OnboardingFormData, planId);
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

      {selectedPlan !== "free" && (
        <p className="text-center text-xs text-muted-foreground">
          You won't be charged now — we'll confirm membership details with you
          after you finish setting up.
        </p>
      )}
    </motion.div>
  );
}
