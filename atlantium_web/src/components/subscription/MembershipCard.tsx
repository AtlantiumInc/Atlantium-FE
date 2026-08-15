import { useState } from "react";
import { Crown, AlertTriangle, Loader2, Check, Camera, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HolographicCard } from "@/components/ui/holographic-card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UpgradeModal } from "./UpgradeModal";

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "U";
}

interface MembershipCardProps {
  onAvatarClick?: () => void;
  /** Clicking the card body (not its buttons) — the dropdown opens the edit form. */
  onCardClick?: () => void;
  username?: string;
  bio?: string;
  createdAt?: string;
}

export function MembershipCard({ onAvatarClick, onCardClick, bio, createdAt }: MembershipCardProps = {}) {
  const { subscription, isLoading, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Get user avatar and display info
  const userAny = user as unknown as Record<string, unknown> | null;
  const profile = userAny?._profile as Record<string, unknown> | undefined;
  const avatarUrl = user?.avatar || (profile?.avatar_url as string);

  // Build full name from first_name and last_name
  const firstName = user?.first_name || (profile?.first_name as string) || "";
  const lastName = (userAny?.last_name as string) || (profile?.last_name as string) || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || user?.display_name || (profile?.display_name as string);
  const initials = getInitials(fullName, user?.email);
  const profileBio = bio || (profile?.bio as string) || "";

  // Get interests from registration details
  const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
  const interests = (registrationDetails?.interests as string[]) || [];


  const handleUpgradeSuccess = async () => {
    setShowUpgradeModal(false);
    await refreshSubscription();
    toast.success("Welcome to Club Membership!");
  };

  if (isLoading) {
    return (
      <HolographicCard intensity={12} glareOpacity={0.25} holographicOpacity={0.12}>
        <Card className="border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </HolographicCard>
    );
  }

  const isClubMember = subscription?.membership_tier === "club";
  const isPastDue = subscription?.subscription_status === "past_due";
  const isCanceling = subscription?.cancel_at_period_end;
  const isAdmin = user?.is_admin === true;
  const planLabel = isAdmin ? "Admin access" : isClubMember ? "Club member" : "Free member";

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
      <HolographicCard intensity={12} glareOpacity={0.25} holographicOpacity={0.12}>
        <Card
          className={`border-0 bg-card/80 backdrop-blur-sm ${onCardClick ? "cursor-pointer" : ""}`}
          onClick={(e) => {
            // Buttons on the card (Open Admin, avatar camera) own their clicks
            if ((e.target as HTMLElement).closest("button, a")) return;
            onCardClick?.();
          }}
        >
          <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {onAvatarClick && (
                <button
                  type="button"
                  onClick={onAvatarClick}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Shield className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <Crown className={`h-5 w-5 ${isClubMember ? "text-yellow-500" : "text-muted-foreground"}`} />
                  )}
                  <CardTitle>{fullName || "Member"}</CardTitle>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-600 dark:text-cyan-300 -mt-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                  {isClubMember && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 -mt-1">
                      <Check className="h-3 w-3" />
                      Club Member
                    </span>
                  )}
                </div>
              </div>
              <CardDescription>
                {profileBio || planLabel}
              </CardDescription>
              {user?.email && (
                <p className="font-mono text-xs text-muted-foreground/80 truncate mt-0.5">{user.email}</p>
              )}
            </div>
          </div>
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
          {isAdmin && (
            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-500" />
                  <span className="font-medium">Admin access</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-cyan-500/30 bg-background/40"
                  onClick={() => window.location.assign("/admin")}
                >
                  Open Admin
                </Button>
              </div>
            </div>
          )}

          {isClubMember ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Club Membership</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">Admin</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Events</span>
                <span className="font-medium">All Access</span>
              </div>
              {interests.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interests</span>
                  <span className="font-medium">
                    {interests[0]}{interests.length > 1 ? ` +${interests.length - 1} more` : ""}
                  </span>
                </div>
              )}
              {periodEndDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isCanceling ? "Access until" : "Renews on"}
                  </span>
                  <span className="font-medium">{periodEndDate}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current plan</span>
                <span className="font-medium">Free</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">Admin</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Events</span>
                <span className="font-medium">{isAdmin ? "All Access" : "Limited Access"}</span>
              </div>
              {interests.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interests</span>
                  <span className="font-medium">
                    {interests[0]}{interests.length > 1 ? ` +${interests.length - 1} more` : ""}
                  </span>
                </div>
              )}
              {!isAdmin && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">Club Membership - $29/month</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Rene — your frontier agent
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Member DMs across the network
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Exclusive member events
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Welcome message */}
          <div className="pt-2">
            <div className="flex items-end justify-between py-1">
              <p
                className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground/70"
                style={{ letterSpacing: "0.1em" }}
              >
                Member since {createdAt ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
              </p>
              <p
                className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60"
                style={{ letterSpacing: "0.1em" }}
              >
                {isAdmin ? "Admin" : isClubMember ? "Welcome to the Frontier" : "Free Member"}
              </p>
            </div>
          </div>
        </CardContent>
        </Card>
      </HolographicCard>

      {/* Upgrade CTA for free members */}
      {!isClubMember && !isAdmin && (
        <div className="mt-3">
          <Button className="w-full" onClick={() => setShowUpgradeModal(true)}>
            <Crown className="h-4 w-4" />
            Upgrade to Club - $29/mo
          </Button>
        </div>
      )}


      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onSuccess={handleUpgradeSuccess}
      />
    </>
  );
}
