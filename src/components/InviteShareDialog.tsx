import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check, Share2, Loader2, AlertCircle, Link2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface InviteShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "group_join" | "event_rsvp" | "user_connect" | "platform";
  referenceId: string;
  name: string;
}

export function InviteShareDialog({
  open,
  onOpenChange,
  type,
  referenceId,
  name,
}: InviteShareDialogProps) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      generateInvite();
    } else {
      // Reset state when dialog closes
      setInviteLink(null);
      setError(null);
      setCopied(false);
    }
  }, [open, type, referenceId]);

  const generateInvite = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.createInvite(type, referenceId);
      setInviteLink(result.link);
    } catch {
      setError("Failed to generate invite link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await navigator.share({
        title: `Join ${name} on Atlantium`,
        url: inviteLink,
      });
    } catch (err) {
      // User cancelled share or share not supported — ignore AbortError
      if (err instanceof Error && err.name !== "AbortError") {
        handleCopy();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Invite Link</DialogTitle>
          <DialogDescription>
            Share this link to invite people to <span className="font-medium text-foreground">{name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={generateInvite}>
                Try Again
              </Button>
            </div>
          ) : inviteLink ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{inviteLink}</span>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>

                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This link expires in 7 days
              </p>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
