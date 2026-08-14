import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type BillingStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "./UpgradeDialog";

/**
 * ONE upgrade path for the whole platform.
 *
 * Every "become a member" moment routes through here, so the payment mechanism
 * is a single decision rather than a dozen. Today that's Stripe Checkout by
 * redirect; when the Elements refactor lands, `startPurchase()` below is the
 * only place that changes — every call site keeps working.
 *
 * It also means one consistent answer to "what does this cost and what do I
 * get", instead of each surface inventing its own copy.
 */

export const MEMBER_PLAN = {
  monthly: { plan: "club" as const, price: "$29", period: "/month" },
  annual: { plan: "club_annual" as const, price: "$290", period: "/year", note: "two months free" },
};

type BillingContextValue = {
  status: BillingStatus | null;
  isMember: boolean;
  refresh: () => Promise<void>;
};

const BillingContext = createContext<BillingContextValue>({
  status: null,
  isMember: false,
  refresh: async () => {},
});

/** Optional: wrap authenticated areas so status is fetched once, not per CTA. */
export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setStatus(null); return; }
    try {
      setStatus(await api.getBillingStatus());
    } catch {
      // Billing being unreachable must never break the page around it.
      setStatus(null);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo(
    () => ({ status, isMember: (status?.tier ?? "free") !== "free", refresh }),
    [status, refresh],
  );
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  return useContext(BillingContext);
}

/**
 * The single seam between "the member said yes" and how we take money.
 * Payment happens in-page via Elements (UpgradeDialog); this remains as the
 * hosted-Checkout fallback for surfaces that would rather redirect.
 */
export async function startPurchase(plan: "club" | "club_annual") {
  const { checkout_url } = await api.startCheckout(plan);
  window.location.href = checkout_url;
}

type Variant = "button" | "inline" | "card";

export function UpgradeCta({
  reason,
  plan = "club",
  variant = "button",
  label,
  className,
}: {
  /** Why this member is seeing it — shown on the card, and useful for copy. */
  reason?: string;
  plan?: "club" | "club_annual";
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { status } = useBilling();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Members don't get sold to. A CTA that keeps appearing after you've paid is
  // the fastest way to make paying feel pointless.
  if (status && status.tier !== "free") return null;

  // Elements keeps the member on Atlantium; no redirect, no lost context.
  const go = () => setDialogOpen(true);

  // Signed out: joining comes before paying.
  if (!user) {
    return (
      <Link to="/signup" className={variant === "card" ? "block" : undefined}>
        <Button variant={variant === "inline" ? "link" : "outline"} className={cn("gap-1.5", className)}>
          {label ?? "Join the lab"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    );
  }

  const cta = label ?? `Upgrade — ${MEMBER_PLAN.monthly.price}${MEMBER_PLAN.monthly.period}`;

  if (variant === "card") {
    return (
      <div className={cn("rounded-xl border border-primary/30 bg-primary/5 p-4", className)}>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{reason ?? "This is part of membership"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {MEMBER_PLAN.monthly.price}{MEMBER_PLAN.monthly.period} — member DMs, exclusive events, and the
              agent. {MEMBER_PLAN.annual.price}/year gets {MEMBER_PLAN.annual.note}.
            </p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={go}>{cta}</Button>
            <UpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} reason={reason} defaultPlan={plan} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant={variant === "inline" ? "link" : "outline"}
        size={variant === "inline" ? "sm" : "default"}
        className={cn("gap-1.5", className)}
        onClick={go}
      >
        {cta}
      </Button>
      <UpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} reason={reason} defaultPlan={plan} />
    </>
  );
}
