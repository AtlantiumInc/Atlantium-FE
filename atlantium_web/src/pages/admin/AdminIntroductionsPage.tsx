import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Handshake, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type IntroductionReview } from "@/lib/api";
import { toast } from "sonner";

/**
 * The curation queue — the actual product on the investor side.
 *
 * Approving passes the request to the target; rejecting means they never see it
 * at all. That asymmetry is what makes a comped investor's inbox worth having,
 * so the copy says so plainly rather than making this feel like moderation.
 */
export function AdminIntroductionsPage() {
  const [queue, setQueue] = useState<IntroductionReview[]>([]);
  const [funnel, setFunnel] = useState<Awaited<ReturnType<typeof api.getIntroductionFunnel>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [q, f] = await Promise.all([
        api.getIntroductionQueue(),
        api.getIntroductionFunnel().catch(() => null),
      ]);
      setQueue(q.introductions);
      setFunnel(f);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load the queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await api.decideIntroduction(id, approve, notes[id] || undefined);
      toast.success(approve ? "Passed on to them." : "Declined — they'll never see it.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Introductions</h1>
        <p className="text-sm text-muted-foreground">
          You decide what reaches an investor's inbox. That judgment is the product.
        </p>
      </div>

      {funnel && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Requested", value: funnel.requested },
            { label: "Awaiting reply", value: funnel.by_status?.awaiting_target ?? 0 },
            { label: "Accepted", value: funnel.by_status?.accepted ?? 0 },
            { label: "Connections", value: funnel.connections_from_intros },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/40 bg-card/40 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
          {Object.keys(funnel.outcomes ?? {}).length > 0 && (
            <div className="col-span-2 rounded-xl border border-border/40 bg-card/40 p-3 sm:col-span-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Outcomes</p>
              <p className="text-sm">
                {Object.entries(funnel.outcomes).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(" · ")}
              </p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : queue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center">
          <Handshake className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm font-medium">Nothing waiting</p>
          <p className="mt-1 text-xs text-muted-foreground">New introduction requests land here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((i) => (
            <div key={i.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
              <p className="text-sm">
                <Link to={`/members/${i.requester.profile_id}`} className="font-medium hover:text-primary">
                  {i.requester.name}
                </Link>
                <span className="text-muted-foreground"> wants an introduction to </span>
                <Link to={`/members/${i.target.profile_id}`} className="font-medium hover:text-primary">
                  {i.target.name}
                </Link>
              </p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border/40 bg-background/40 p-3 text-sm">
                {i.reason}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  value={notes[i.id] ?? ""}
                  onChange={(e) => setNotes((p) => ({ ...p, [i.id]: e.target.value }))}
                  placeholder="Note (optional, for your own records)"
                  className="h-8 max-w-xs text-xs"
                />
                <Button size="sm" className="gap-1.5" disabled={busyId === i.id}
                  onClick={() => decide(i.id, true)}>
                  {busyId === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Pass it on
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-red-400"
                  disabled={busyId === i.id} onClick={() => decide(i.id, false)}>
                  <X className="h-3.5 w-3.5" /> Decline
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Declining is invisible to {i.target.name.split(" ")[0]}.
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminIntroductionsPage;
