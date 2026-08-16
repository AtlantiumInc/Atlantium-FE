import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Queue = Awaited<ReturnType<typeof api.getOrgRequestQueue>>["requests"];

/**
 * Org claim review.
 *
 * Approving does two things at once: it says this person really is at that
 * company, and it decides what they may DO there. Employment is not authority —
 * a recruiter who should post jobs is not an admin who can edit the page — so
 * the authority level is picked here rather than defaulted silently.
 */
const AUTHORITIES = [
  { value: "admin", label: "Full", hint: "Edit the page, post jobs, reach people as the company" },
  { value: "hiring", label: "Hiring", hint: "Post and manage jobs only" },
  { value: "page_editor", label: "Page", hint: "Edit the company page only" },
  { value: "none", label: "Listed only", hint: "Confirms employment, grants nothing" },
];

export function AdminOrgClaimsPage() {
  const [queue, setQueue] = useState<Queue>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [authority, setAuthority] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const { requests } = await api.getOrgRequestQueue();
      setQueue(requests);
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
      await api.decideOrgRequest(id, approve, authority[id] ?? "admin", notes[id] || undefined);
      toast.success(approve ? "Approved — they're verified now." : "Declined.");
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
        <h1 className="text-2xl font-bold tracking-tight">Company claims</h1>
        <p className="text-sm text-muted-foreground">
          Founders and reps waiting to be verified. Nothing is granted until you decide.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : queue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center">
          <p className="text-sm font-medium">Nothing waiting</p>
          <p className="mt-1 text-xs text-muted-foreground">New claims land here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((r) => {
            const level = authority[r.id] ?? "admin";
            return (
              <div key={r.id} className="rounded-xl border border-border/50 bg-card/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {r.kind === "create"
                        ? <Plus className="h-4 w-4 shrink-0 text-amber-400" />
                        : <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <p className="truncate text-base font-semibold">
                        {r.org?.name ?? r.proposed.name ?? "—"}
                      </p>
                      {r.kind === "create" && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                          New company
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Link to={`/members/${r.member.profile_id}`} className="hover:text-foreground">
                        {r.member.name}
                      </Link>
                      {" · "}
                      <span className="capitalize">{r.relationship}</span>
                    </p>
                    {r.proposed.website && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.proposed.website}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>

                {r.evidence && (
                  <p className="mt-3 rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm leading-relaxed">
                    {r.evidence}
                  </p>
                )}

                <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Grant
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AUTHORITIES.map((a) => (
                    <button
                      key={a.value}
                      title={a.hint}
                      onClick={() => setAuthority((prev) => ({ ...prev, [r.id]: a.value }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        level === a.value
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {AUTHORITIES.find((a) => a.value === level)?.hint}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Input
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Note (they'll see this)"
                    className="h-9 min-w-[12rem] flex-1"
                  />
                  <Button size="sm" onClick={() => decide(r.id, true)} disabled={busyId === r.id}>
                    {busyId === r.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, false)} disabled={busyId === r.id}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminOrgClaimsPage;
