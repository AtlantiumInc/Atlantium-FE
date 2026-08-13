import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Mail, Phone, Linkedin, Globe, Loader2, Sparkles, ArrowRight, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type DirectoryContact, type ContactState } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useJobReportSignup } from "@/components/JobReportSignupModal";

const ICONS: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  linkedin: Linkedin,
  form: Globe,
  intro_path: Handshake,
};

function formatRefresh(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ContactCard({
  entryId,
  kind,
  slug,
  onJoin,
}: {
  entryId: string;
  kind: string;
  slug: string;
  onJoin: () => void;
}) {
  const { user } = useAuth();
  const signup = useJobReportSignup();
  const [state, setState] = useState<ContactState>("none");
  const [available, setAvailable] = useState<number | null>(null);
  const [refreshesAt, setRefreshesAt] = useState<string | null>(null);
  const [contacts, setContacts] = useState<DirectoryContact[] | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    api.getContactState(kind, slug)
      .then((r) => {
        setState(r.contact_state);
        setAvailable(r.reveals_available);
        setRefreshesAt(r.refreshes_at);
        // Already unlocked (prior reveal or paid): pull the values straight away.
        if (r.contact_state === "revealed") {
          api.getEntryContacts(entryId)
            .then((cr) => setContacts(cr.contacts))
            .catch(() => setContacts([]));
        }
      })
      .catch(() => {});
  }, [entryId, kind, slug, user?.id]);

  if (state === "none") return null;

  const reveal = async () => {
    api.trackEvent("directory_reveal_clicked", { entry_id: entryId, kind });
    setIsRevealing(true);
    try {
      const r = await api.revealContacts(entryId);
      setContacts(r.contacts);
      setState("revealed");
      setAvailable(r.reveals_available ?? null);
      setRefreshesAt(r.refreshes_at ?? null);
    } catch (error) {
      const err = error as { status?: number; code?: string; data?: { refreshes_at?: string } };
      if (err?.code === "onboarding_required") {
        // Not a failure — they just haven't finished the questionnaire yet.
        toast.info("Finish your lab profile to reveal contacts.");
        signup.openQuestionnaire();
      } else if (err?.status === 402) {
        setState("upgrade_required");
        setAvailable(0);
        toast.error("You've used all your reveals for this window.");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not reveal contacts");
      }
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/40 bg-card/40 p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold inline-flex items-center gap-2">
          <Handshake className="h-4 w-4 text-cyan-400" /> How to reach them
        </h2>
        {state === "revealable" && typeof available === "number" && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {available} {available === 1 ? "reveal" : "reveals"} available
          </span>
        )}
      </div>

      {state === "revealed" && !contacts ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts...
        </div>
      ) : state === "revealed" && contacts ? (
        <ul className="space-y-2">
          {contacts.map((c) => {
            const Icon = ICONS[c.contact_type] ?? Globe;
            const isLink = c.contact_type === "form" || c.contact_type === "linkedin" || c.value?.startsWith("http");
            return (
              <li key={c.id} className="flex items-center gap-2.5 text-sm">
                <Icon className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                {isLink ? (
                  <a href={c.value ?? "#"} target="_blank" rel="noreferrer noopener" className="text-cyan-400 hover:text-cyan-300 truncate">
                    {c.label ?? c.value}
                  </a>
                ) : (
                  <span className="truncate">{c.value}</span>
                )}
                {c.label && !isLink && <span className="text-[11px] text-muted-foreground">({c.label})</span>}
              </li>
            );
          })}
        </ul>
      ) : state === "hidden" ? (
        <>
          <div className="space-y-2 mb-4 select-none" aria-hidden>
            {[70, 55].map((w) => (
              <div key={w} className="h-4 rounded bg-muted/40 blur-[3px]" style={{ width: `${w}%` }} />
            ))}
          </div>
          <Button size="sm" className="w-full gap-2 bg-white text-black hover:bg-gray-100" onClick={onJoin}>
            <Lock className="h-3.5 w-3.5" /> Join free to reveal contacts
          </Button>
        </>
      ) : state === "revealable" ? (
        <>
          <div className="space-y-2 mb-4 select-none" aria-hidden>
            {[70, 55].map((w) => (
              <div key={w} className="h-4 rounded bg-muted/40 blur-[3px]" style={{ width: `${w}%` }} />
            ))}
          </div>
          <Button size="sm" className="w-full gap-2" onClick={reveal} disabled={isRevealing}>
            {isRevealing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isRevealing ? "Revealing..." : "Reveal contacts"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Unlocks this organization for good — re-checking later is always free.
          </p>
        </>
      ) : state === "upgrade_required" ? (
        <div className="text-center">
          <p className="text-sm font-medium mb-1">You're out of reveals</p>
          <p className="text-xs text-muted-foreground mb-3">
            {refreshesAt
              ? `Your next reveal refreshes ${formatRefresh(refreshesAt)}.`
              : "Your reveals refresh 30 days after your first one."}{" "}
            Members get unlimited contacts and CSV export.
          </p>
          <Link to="/pricing" onClick={() => api.trackEvent("upgrade_clicked", { from_surface: "directory_contact_card" })}>
            <Button size="sm" className="w-full gap-2 bg-white text-black hover:bg-gray-100">
              See membership <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
