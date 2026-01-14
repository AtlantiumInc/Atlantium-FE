import { useState } from "react";
import { Crown, ExternalLink, AlertTriangle, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UpgradeModal } from "./UpgradeModal";

export function MembershipCard() {
  const { subscription, isLoading, refreshSubscription } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true);
      const response = await api.getPortalSession();
      window.open(response.portal_url, "_blank");
    } catch (error) {
      toast.error("Failed to open billing portal");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleUpgradeSuccess = async () => {
    setShowUpgradeModal(false);
    await refreshSubscription();
    toast.success("Welcome to Club Membership!");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isClubMember = subscription?.membership_tier === "club";
  const isPastDue = subscription?.subscription_status === "past_due";
  const isCanceling = subscription?.cancel_at_period_end;

  // Format period end date
  const periodEndDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Format grace period end date
  const gracePeriodEnd = subscription?.grace_period_end
    ? new Date(subscription.grace_period_end).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isClubMember ? "text-yellow-500" : "text-muted-foreground"}`} />
              <CardTitle>Membership</CardTitle>
            </div>
            {isClubMember && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                <Check className="h-3 w-3" />
                Club Member
              </span>
            )}
          </div>
          <CardDescription>
            {isClubMember
              ? "You have access to all Club features including event RSVPs."
              : "Upgrade to Club for exclusive access to event RSVPs."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status alerts */}
          {isPastDue && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Payment Failed</p>
                <p className="text-muted-foreground">
                  Please update your payment method. Access expires {gracePeriodEnd || "soon"}.
                </p>
              </div>
            </div>
          )}

          {isCanceling && !isPastDue && (
            <div className="flex items-start gap-3 rounded-lg bg-yellow-500/10 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-600 dark:text-yellow-400">Cancellation Scheduled</p>
                <p className="text-muted-foreground">
                  Your membership will end on {periodEndDate}. You can reactivate anytime.
                </p>
              </div>
            </div>
          )}

          {/* Membership details */}
          {isClubMember ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Club Membership</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">$49/month</span>
              </div>
              {periodEndDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isCanceling ? "Access until" : "Renews on"}
                  </span>
                  <span className="font-medium">{periodEndDate}</span>
                </div>
              )}
              {subscription?.payment_method && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment method</span>
                  <span className="font-medium capitalize">
                    {subscription.payment_method.brand} ****{subscription.payment_method.last4}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current plan</span>
                <span className="font-medium">Free</span>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">Club Membership - $49/month</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    RSVP to exclusive tech events
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Network with local builders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Access to member-only meetups
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2">
            {isClubMember ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
              >
                {isLoadingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Manage Subscription
                  </>
                )}
              </Button>
            ) : (
              <Button className="w-full" onClick={() => setShowUpgradeModal(true)}>
                <Crown className="h-4 w-4" />
                Upgrade to Club - $49/mo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onSuccess={handleUpgradeSuccess}
      />
    </>
  );
}
