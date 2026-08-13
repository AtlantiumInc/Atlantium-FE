import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api, type DmAccepts } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const OPTIONS: Array<{ value: DmAccepts; label: string; hint: string }> = [
  { value: "members", label: "Any member", hint: "Anyone in the lab can send you a request" },
  { value: "verified", label: "Verified only", hint: "Only members the lab has verified" },
  { value: "introductions_only", label: "Introductions only", hint: "Reachable through an Atlantium intro" },
  { value: "nobody", label: "Nobody", hint: "No new requests at all" },
];

/**
 * Who may ask to reach you. Verified investors land on `introductions_only`
 * automatically — this control is how they (or anyone) change their mind, not
 * how they get protected in the first place.
 */
export function DmPolicyControl() {
  const [accepts, setAccepts] = useState<DmAccepts | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getDmPolicy().then((r) => setAccepts(r.accepts)).catch(() => setAccepts("members"));
  }, []);

  const change = async (value: DmAccepts) => {
    const previous = accepts;
    setAccepts(value);
    setIsSaving(true);
    try {
      await api.setDmPolicy(value);
    } catch (error) {
      setAccepts(previous);
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      setIsSaving(false);
    }
  };

  if (!accepts) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Who can reach you</h2>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => change(o.value)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              accepts === o.value ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40",
            )}
          >
            <span className="block text-sm font-medium">{o.label}</span>
            <span className="block text-[11px] text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        This never affects people you're already connected to.
      </p>
    </div>
  );
}
