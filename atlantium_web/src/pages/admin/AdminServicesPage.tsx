import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, DollarSign, Loader2, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ServiceRequest = Awaited<ReturnType<typeof api.getServiceRequests>>["requests"][number];

/**
 * The call sheet. Built to be used mid-phone-call: the number is a tap, the
 * answers are on screen, the offer is three preset buttons, and "payment link"
 * copies a checkout URL at exactly that number so it can be texted before the
 * call ends. The webhook flips the row to paid on its own.
 */
const STATUS_STYLE: Record<ServiceRequest["status"], string> = {
  new: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  called: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  offered: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  fulfilled: "border-border/60 text-muted-foreground",
  passed: "border-border/60 text-muted-foreground",
};

const OFFER_PRESETS = [
  { cents: 200000, label: "$2,000", hint: "Full tuition" },
  { cents: 100000, label: "$1,000", hint: "Builder grant" },
  { cents: 50000, label: "$500", hint: "Deep grant" },
];

function Row({ r, onChanged }: { r: ServiceRequest; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [customOffer, setCustomOffer] = useState("");

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  };

  const setOffer = (cents: number) =>
    act(`offer-${cents}`, () => api.updateServiceRequest(r.id, { offer_cents: cents }));

  const makeLink = () =>
    act("link", async () => {
      const { url } = await api.createServiceRequestPaymentLink(r.id);
      await navigator.clipboard.writeText(url);
      toast.success("Payment link copied — text it to them now.");
    });

  const copyLink = async () => {
    if (!r.payment_link_url) return;
    await navigator.clipboard.writeText(r.payment_link_url);
    toast.success("Link copied.");
  };

  const done = r.status === "paid" || r.status === "fulfilled" || r.status === "passed";

  return (
    <div className={cn("rounded-xl border bg-card/40 p-5", r.status === "new" ? "border-cyan-500/30" : "border-border/50")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{r.name}</p>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", STATUS_STYLE[r.status])}>
              {r.status}
            </span>
            {r.offer_cents != null && (
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                offer ${(r.offer_cents / 100).toLocaleString()}
              </span>
            )}
            {r.member && (
              <Link to={`/members/${r.member.profile_id}`} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                member profile
              </Link>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {r.phone ? (
              <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary">
                <Phone className="h-3.5 w-3.5" /> {r.phone}
              </a>
            ) : (
              "no phone"
            )}
            {" · "}
            <a href={`mailto:${r.email}`} className="hover:text-foreground">{r.email}</a>
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      {Object.keys(r.answers).length > 0 && (
        <dl className="mt-3 space-y-1 rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm">
          {Object.entries(r.answers).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2">
              <dt className="truncate text-xs uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</dt>
              <dd className="min-w-0 break-words leading-relaxed">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {!done && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {OFFER_PRESETS.map((o) => (
              <button
                key={o.cents}
                title={o.hint}
                onClick={() => setOffer(o.cents)}
                disabled={busy !== null}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  r.offer_cents === o.cents
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={customOffer}
                onChange={(e) => setCustomOffer(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Custom $"
                className="h-7 w-24 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={!customOffer || busy !== null}
                onClick={() => setOffer(Number(customOffer) * 100)}
              >
                <DollarSign className="h-3 w-3" /> Set
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {r.status === "new" && (
              <Button size="sm" variant="outline" disabled={busy !== null}
                onClick={() => act("called", () => api.updateServiceRequest(r.id, { status: "called" }))}>
                {busy === "called" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Phone className="mr-1.5 h-3.5 w-3.5" />}
                Mark called
              </Button>
            )}
            <Button size="sm" disabled={!r.offer_cents || busy !== null} onClick={makeLink}
              title={r.offer_cents ? `Checkout at $${(r.offer_cents / 100).toLocaleString()}` : "Set the offer first"}>
              {busy === "link" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              Payment link
            </Button>
            {r.payment_link_url && (
              <Button size="sm" variant="ghost" onClick={copyLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Re-copy
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy !== null}
              onClick={() => act("passed", () => api.updateServiceRequest(r.id, { status: "passed" }))}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Pass
            </Button>
          </div>
        </>
      )}

      {r.status === "paid" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
          <Check className="h-4 w-4" />
          Paid{r.paid_at ? ` ${new Date(r.paid_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""} —
          <button
            className="underline underline-offset-4 hover:text-emerald-200"
            onClick={() => act("fulfilled", () => api.updateServiceRequest(r.id, { status: "fulfilled" }))}
          >
            mark enrolled
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminServicesPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [show, setShow] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    try {
      const { requests } = await api.getServiceRequests();
      setRequests(requests);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load requests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // The whole point is calling leads while they're hot — keep the sheet live.
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const open = requests.filter((r) => r.status === "new" || r.status === "called" || r.status === "offered");
  const visible = show === "open" ? open : requests;
  const paidCount = requests.filter((r) => r.status === "paid" || r.status === "fulfilled").length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service requests</h1>
          <p className="text-sm text-muted-foreground">
            Training applications land here. Call, set the offer, send the link — all before they cool off.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{open.length} open · {paidCount} paid</span>
          <div className="flex gap-1">
            {(["open", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setShow(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                  show === s ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center">
          <p className="text-sm font-medium">Nothing waiting</p>
          <p className="mt-1 text-xs text-muted-foreground">New applications appear here and hit team@atlantium.ai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => <Row key={r.id} r={r} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}

export default AdminServicesPage;
