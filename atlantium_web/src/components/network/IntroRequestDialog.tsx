import { useState } from "react";
import { Handshake, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, type MemberCard } from "@/lib/api";
import { toast } from "sonner";

const MIN_REASON = 20;

/**
 * Request a curated introduction.
 *
 * This is the sanctioned path to members who can't be cold-contacted — chiefly
 * verified investors. The reason field isn't decoration: a human reads it and
 * decides, and the target never sees the request unless it clears that review.
 */
export function IntroRequestDialog({
  member,
  open,
  onOpenChange,
  onDone,
}: {
  member: MemberCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    setIsSending(true);
    try {
      await api.requestIntroduction(member.profile_id, reason.trim());
      toast.success("Introduction requested — we'll review it and let you know.");
      onDone?.();
      onOpenChange(false);
      setReason("");
    } catch (error) {
      const err = error as { code?: string; message?: string };
      const copy: Record<string, string> = {
        already_requested: "You already have an introduction pending with them.",
        already_connected: "You're already connected — just message them.",
        upgrade_required: "Requesting introductions is part of paid membership.",
        outreach_paused: "Outreach is paused while your recent requests go unanswered.",
        not_found: "That member isn't available.",
      };
      toast.error(copy[err.code ?? ""] ?? err.message ?? "That didn't work.");
    } finally {
      setIsSending(false);
    }
  };

  const short = reason.trim().length < MIN_REASON;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Request an introduction to {member.display_name}
          </DialogTitle>
          <DialogDescription>
            A person at Atlantium reads this and decides whether to pass it on.
            {member.display_name.split(" ")[0]} won't see it unless we do.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
              Why this introduction?
            </p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="What you're building, what stage you're at, and why them specifically."
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {short
                ? `${MIN_REASON - reason.trim().length} more characters — specifics get passed on, "would love to connect" doesn't.`
                : "Specifics travel well. Generic asks get declined."}
            </p>
          </div>

          <p className="rounded-lg border border-border/50 bg-card/40 p-3 text-[11px] text-muted-foreground">
            Introductions draw on the same monthly outreach budget as messages and
            connection requests.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={send} disabled={isSending || short} className="gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
              Request introduction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
