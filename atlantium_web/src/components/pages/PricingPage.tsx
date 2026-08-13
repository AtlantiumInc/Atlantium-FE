import { Check, Crown, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  savings?: string;
  icon: typeof Crown;
}

const tiers: PricingTier[] = [
  {
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
  {
    name: "Club Membership",
    price: "$29",
    period: "/month",
    description: "For serious builders",
    popular: true,
    icon: Crown,
    features: [
      "Everything in Free",
      "Office hours Mon\u2013Thu",
      "AI engineering curriculum",
      "Focus groups",
      "Exclusive member events",
      "Priority event registration",
      "Startup advisor",
    ],
  },
  {
    name: "Annual Membership",
    price: "$290",
    period: "/year",
    description: "Committed to the frontier",
    savings: "2 months free",
    icon: Calendar,
    features: [
      "Everything in Club",
      "9 months free",
      "Quarterly performance review",
      "Discounted services",
      "Project support",
    ],
  },
];

export function PricingPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Membership Plans</h2>
        <p className="text-muted-foreground">
          Choose the plan that fits your journey. You can change anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.name}
              className={cn(
                "relative rounded-xl border-2 p-6 flex flex-col",
                tier.popular
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {tier.savings && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    {tier.savings}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {tier.name !== "Free" && (
                    <Icon className="h-4 w-4 text-yellow-500" />
                  )}
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>

              <ul className="space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
