import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Check, Clock, Loader2, Search, ShieldCheck } from "lucide-react";
import { MemberShell } from "@/components/MemberShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type DirectoryEntry } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Claim your company.
 *
 * Founder outreach requires org authority, and until this page existed there was
 * no way to get any — a founder just hit `org_claim_required` and stopped. The
 * claim doesn't grant anything on its own; a human approves it, and that review
 * is what makes "founder at X" mean something to the person on the other end.
 */
const RELATIONSHIPS = [
  { value: "founder", label: "Founder" },
  { value: "executive", label: "Executive" },
  { value: "recruiter", label: "Recruiter" },
  { value: "representative", label: "Representative" },
];

export function OrgClaimPage() {
  const [mine, setMine] = useState<Awaited<ReturnType<typeof api.getMyOrgRequests>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [picked, setPicked] = useState<DirectoryEntry | null>(null);

  const [newName, setNewName] = useState("");
  const [newSite, setNewSite] = useState("");
  const [relationship, setRelationship] = useState("founder");
  const [evidence, setEvidence] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setMine(await api.getMyOrgRequests());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load your claims");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Debounced — the directory is large and this fires per keystroke otherwise.
  useEffect(() => {
    if (picked || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { entries } = await api.getDirectory({ kind: "company", q: query.trim(), name_only: "1", limit: 8 });
        setResults(entries);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, picked]);

  // The "add it" field prefills from the search box, so an untouched field
  // still carries what they typed.
  const proposedName = (newName.trim() || query.trim());

  const submit = async () => {
    if (!picked && proposedName.length < 2) {
      toast.error("Pick your company, or type its name to add it.");
      return;
    }
    setIsSaving(true);
    try {
      await api.requestOrgClaim({
        entry_id: picked?.id,
        proposed_name: picked ? undefined : proposedName,
        proposed_website: picked ? undefined : (newSite.trim() || undefined),
        relationship,
        evidence: evidence.trim() || undefined,
      });
      toast.success("Sent for review. We'll email you when it's decided.");
      setPicked(null); setQuery(""); setNewName(""); setNewSite(""); setEvidence(""); setOpenForm(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that");
    } finally {
      setIsSaving(false);
    }
  };

  const pending = mine?.requests.filter((r) => r.status === "pending") ?? [];
  // An approved request says nothing the verified card above doesn't say
  // better, so only outcomes that still need explaining are shown.
  const declined = mine?.requests.filter((r) => r.status === "rejected") ?? [];
  const verified = mine?.memberships ?? [];
  // Already verified somewhere: the form is a second action, not the point of
  // the page — a founder with two ventures still needs it, everyone else doesn't.
  const showForm = openForm || (verified.length === 0 && pending.length === 0);

  return (
    <MemberShell title="Your company">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Claim your company</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Founders and company reps get verified before they can reach people here.
          A person reviews every claim — that's why the badge is worth anything.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            {(mine?.memberships.length ?? 0) > 0 && (
              <div className="mb-6 space-y-2">
                {mine!.memberships.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.org.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {m.relationship} · verified
                      </p>
                    </div>
                    <Link
                      to={`/directory/company/${m.org.slug}`}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      View page
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {pending.map((r) => (
              <div key={r.id} className="mb-3 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.org_name}</p>
                  <p className="text-xs text-muted-foreground">Under review — usually within a day.</p>
                </div>
              </div>
            ))}

            {declined.map((r) => (
              <div key={r.id} className="mb-3 rounded-xl border border-border/50 px-4 py-3">
                <p className="text-sm font-medium">{r.org_name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {r.status}{r.decision_note ? ` — ${r.decision_note}` : ""}
                </p>
              </div>
            ))}

            {!showForm ? (
              <button
                onClick={() => setOpenForm(true)}
                className="w-full rounded-xl border border-dashed border-border/50 py-4 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                Claim another company
              </button>
            ) : (
            <div className="rounded-xl border border-border/50 bg-card/40 p-5">
              <p className="mb-3 text-sm font-medium">Which company?</p>

              {picked ? (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-sm">{picked.name}</p>
                  <button
                    onClick={() => { setPicked(null); setQuery(""); }}
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search Atlanta companies…"
                      className="h-11 pl-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {results.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-border/50">
                      {results.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => setPicked(entry)}
                          className="flex w-full items-center gap-3 border-b border-border/40 px-3 py-2.5 text-left last:border-0 hover:bg-muted/50"
                        >
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Not in the directory isn't a dead end — the reviewer adds it. */}
                  {query.trim().length >= 2 && !isSearching && results.length === 0 && (
                    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        Not listed yet. We'll add it when we approve your claim.
                      </p>
                      <Input
                        value={newName || query}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Company name"
                      />
                      <Input
                        value={newSite}
                        onChange={(e) => setNewSite(e.target.value)}
                        placeholder="Website (optional)"
                      />
                    </div>
                  )}
                </>
              )}

              <p className="mb-2 mt-5 text-sm font-medium">Your role there</p>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRelationship(r.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      relationship === r.value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <p className="mb-2 mt-5 text-sm font-medium">How can we check?</p>
              <Textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={3}
                placeholder="A link to the team page, your work email domain, a press mention — anything that ties you to the company."
                className="resize-none"
              />

              <Button
                onClick={submit}
                disabled={isSaving || (!picked && proposedName.length < 2)}
                className="mt-4 w-full"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Send for review
              </Button>
            </div>
            )}
          </>
        )}
      </div>
    </MemberShell>
  );
}

export default OrgClaimPage;
