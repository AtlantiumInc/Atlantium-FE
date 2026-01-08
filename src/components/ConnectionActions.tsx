import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  MessageCircle,
  Clock,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { ConnectionStatus } from "@/lib/types";

interface ConnectionActionsProps {
  userId: string;
  displayName?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onMessageClick?: (userId: string) => void;
}

export function ConnectionActions({
  userId,
  displayName,
  onStatusChange,
  onMessageClick,
}: ConnectionActionsProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Fetch connection status on mount
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const result = await api.getConnectionStatus(userId);
      setStatus(result.status);
    } catch (error) {
      console.error("Failed to fetch connection status:", error);
      setStatus("none");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  const handleSendInvitation = async () => {
    try {
      setIsActioning(true);
      await api.sendConnectionInvitation(userId);
      setStatus("invitation_sent");
      onStatusChange?.("invitation_sent");
    } catch (error) {
      console.error("Failed to send invitation:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      setIsActioning(true);
      // Get the invitation ID first (would need backend method or different approach)
      // For now, this is simplified - in production, you'd need to handle this differently
      const invitationsRes = await api.getConnectionInvitations();
      const invitation = invitationsRes.received.find((inv) => inv.user_id === userId);

      if (invitation) {
        await api.acceptConnectionInvitation(invitation.invitation_id);
        setStatus("connected");
        onStatusChange?.("connected");
      }
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      setIsActioning(true);
      const invitationsRes = await api.getConnectionInvitations();
      const invitation = invitationsRes.received.find((inv) => inv.user_id === userId);

      if (invitation) {
        await api.declineConnectionInvitation(invitation.invitation_id);
        setStatus("none");
        onStatusChange?.("none");
      }
    } catch (error) {
      console.error("Failed to decline invitation:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleBlock = async () => {
    try {
      setIsActioning(true);
      await api.blockUser(userId);
      setStatus("blocked_by_me");
      onStatusChange?.("blocked_by_me");
      setIsConfirmDialogOpen(false);
    } catch (error) {
      console.error("Failed to block user:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleUnblock = async () => {
    try {
      setIsActioning(true);
      await api.unblockUser(userId);
      setStatus("none");
      onStatusChange?.("none");
    } catch (error) {
      console.error("Failed to unblock user:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleCreateThread = async () => {
    try {
      setIsActioning(true);
      const result = await api.createDirectThread(userId);
      onMessageClick?.(result.thread_id);
    } catch (error) {
      console.error("Failed to create thread:", error);
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return (
      <Button disabled variant="outline" size="sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  switch (status) {
    case "connected":
      return (
        <Button
          onClick={handleCreateThread}
          disabled={isActioning}
          size="sm"
          className="gap-2"
        >
          {isActioning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          Message
        </Button>
      );

    case "invitation_sent":
      return (
        <Button disabled variant="secondary" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Invitation Sent
        </Button>
      );

    case "invitation_received":
      return (
        <div className="flex gap-2">
          <Button
            onClick={handleAcceptInvitation}
            disabled={isActioning}
            size="sm"
            className="gap-2"
          >
            {isActioning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Accept
          </Button>
          <Button
            onClick={handleDeclineInvitation}
            disabled={isActioning}
            variant="outline"
            size="sm"
          >
            Decline
          </Button>
        </div>
      );

    case "blocked_by_me":
      return (
        <Button
          onClick={handleUnblock}
          disabled={isActioning}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isActioning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
          Unblock
        </Button>
      );

    case "blocked_by_them":
      return (
        <Button disabled variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Ban className="h-4 w-4" />
          Blocked
        </Button>
      );

    case "none":
    default:
      return (
        <Button
          onClick={handleSendInvitation}
          disabled={isActioning}
          variant="default"
          size="sm"
          className="gap-2"
        >
          {isActioning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Connect
        </Button>
      );
  }
}

export default ConnectionActions;
