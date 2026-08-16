import { useState } from "react";
import { Loader2, Lock, Send, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, type MemberCard, type OutreachStatus } from "@/lib/api";
import { UpgradeCta } from "@/components/billing/UpgradeCta";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Mode = "connect" | "message";

const PURPOSES: Array<{ value: string; label: string; hint: string }> = [
  { value: "peer", label: "Peer", hint: "Comparing notes, staying in touch" },
  { value: "advice", label: "Advice", hint: "Asking for help in their domain" },
  { value: "hiring", label: "Hiring", hint: "About a specific role" },
  { value: "fundraising", label: "Fundraising", hint: "Raising, or backing a raise" },
];

/**
 * The one door for cold outreach. Both actions cost the same budget, so the UI
 * shows that plainly rather than making a connection look free — that framing
 * is what stops "just connect with everyone" from becoming the cheap path.
 */
export function OutreachDialog({
  member,
  mode,
  open,
  onOpenChange,
  outreach,
  onDone,
}: {
  member: MemberCard;
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outreach: OutreachStatus | null;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState("peer");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const remaining = outreach && outreach.monthlyLimit !== null
    ? Math.max(0, outreach.monthlyLimit - outreach.monthlyUsed)
    : null;

  const send = async () => {
    setIsSending(true);
    try {
      if (mode === "connect") {
        const r = await api.requestConnection({ profile_id: member.profile_id, message: body || undefined, purpose });
        toast.success(r.mutual
          ? `You and ${member.display_name} are connected — they'd already asked.`
          : "Connection request sent.");
      } else {
        const r = await api.sendDmRequest({ profile_id: member.profile_id, body, purpose });
        toast.success(r.direct ? "Message sent." : "Request sent — they'll see it in their inbox.");
      }
      onDone();
      onOpenChange(false);
      setBody("");
    } catch (error) {
      const err = error as { code?: string; message?: string };
      // Server reason codes carry the explanation; the generic not_available is
      // deliberately uninformative and must stay that way in the UI too.
      const copy: Record<string, string> = {
        upgrade_required: "Starting conversations is part of paid membership.",
        verification_required: "This role needs to be verified before you can reach members.",
        org_claim_required: "Verify your company before reaching people as its founder.",
        intro_required: "Reach this member through an Atlantium introduction.",
        too_many_pending: "You have too many requests waiting for a reply.",
        monthly_limit: "You've used this month's outreach budget.",
        outreach_paused: "Outreach is paused while your recent requests go unanswered.",
        not_available: "You can't reach this member.",
      };
      // A dead end with a door: this one is fixable, so hand them the fix.
      toast.error(copy[err.code ?? ""] ?? err.message ?? "That didn't work.",
        err.code === "org_claim_required"
          ? { action: { label: "Claim company", onClick: () => navigate("/company-claim") } }
          : undefined);
    } finally {
      setIsSending(false);
    }
  };

  const canSend = mode === "connect" ? true : body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "connect" ? <UserPlus className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {mode === "connect" ? `Connect with ${member.display_name}` : `Message ${member.display_name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "connect"
              ? "A connection is a relationship you both acknowledge. It doesn't reveal anything private about either of you."
              : "First contact is a request — they choose whether to open the conversation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
              What's this about?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPurpose(p.value)}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-colors",
                    purpose === p.value
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-primary/40",
                  )}
                >
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
              {mode === "connect" ? "Note (optional)" : "Message"}
            </p>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={mode === "connect"
                ? "How do you know each other, or why now?"
                : "Be specific — a reason to reply beats a hello."}
            />
          </div>

          {outreach && !outreach.mayInitiate && (
            <UpgradeCta variant="card" reason="Starting conversations is part of membership" />
          )}

          {/* Both actions draw on one budget; saying so is the deterrent. */}
          {remaining !== null && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              {remaining} of {outreach?.monthlyLimit} outreach left this month. Connections and
              messages share it, and declines don't refund.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={send} disabled={isSending || !canSend} className="gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {mode === "connect" ? "Send request" : "Send message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
