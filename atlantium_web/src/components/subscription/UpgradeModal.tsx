import { UpgradeDialog } from "@/components/billing/UpgradeDialog";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Kept as a thin wrapper so the existing call sites (MembershipCard,
 * MembershipGate) keep working.
 *
 * It used to build its own Elements form against the retired Xano billing API,
 * which is why upgrading failed with "Unauthorized — Authentication Required":
 * the endpoint it called no longer exists. Payment now goes through the one
 * platform upgrade path, so there is a single flow to keep correct.
 */
export function UpgradeModal({ open, onOpenChange, onSuccess }: UpgradeModalProps) {
  return (
    <UpgradeDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // The dialog closes itself once the subscription is created; the old
        // contract was a success callback, so preserve it for callers that
        // refresh their own state.
        if (!next) onSuccess();
      }}
      reason="Rene your frontier agent, member DMs, and Club events — virtual and in-person."
    />
  );
}
