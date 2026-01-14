import { useState, type ReactNode } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradeModal } from "./UpgradeModal";
import type { MembershipTier } from "@/lib/types";

interface MembershipGateProps {
  requiredTier: MembershipTier;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Gates content behind a membership tier requirement.
 * Shows upgrade prompt if user doesn't have required access.
 */
export function MembershipGate({
  requiredTier,
  children,
  fallback,
}: MembershipGateProps) {
  const { subscription, hasClubAccess, isLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // While loading, don't show anything to prevent flash
  if (isLoading) {
    return null;
  }

  // Check if user has access
  const hasAccess =
    requiredTier === "free" ||
    (requiredTier === "club" && hasClubAccess);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <DefaultUpgradePrompt onUpgrade={() => setShowUpgradeModal(true)} />
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onSuccess={() => {
          setShowUpgradeModal(false);
          // The SubscriptionContext will automatically refresh
        }}
      />
    </>
  );
}

interface DefaultUpgradePromptProps {
  onUpgrade: () => void;
}

function DefaultUpgradePrompt({ onUpgrade }: DefaultUpgradePromptProps) {
  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
      <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
      <p className="font-medium mb-1">Club Members Only</p>
      <p className="text-sm text-muted-foreground mb-3">
        Upgrade to access this feature
      </p>
      <Button onClick={onUpgrade} size="sm">
        <Crown className="h-4 w-4" />
        Upgrade to Club
      </Button>
    </div>
  );
}

interface UpgradePromptProps {
  message?: string;
  onUpgrade?: () => void;
}

/**
 * Standalone upgrade prompt component that can be used as a fallback
 * or anywhere an upgrade CTA is needed.
 */
export function UpgradePrompt({
  message = "Upgrade to access this feature",
  onUpgrade,
}: UpgradePromptProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowUpgradeModal(true);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
        <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
        <p className="font-medium mb-1">Club Members Only</p>
        <p className="text-sm text-muted-foreground mb-3">{message}</p>
        <Button onClick={handleClick} size="sm">
          <Crown className="h-4 w-4" />
          Upgrade to Club
        </Button>
      </div>

      {!onUpgrade && (
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          onSuccess={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
}
