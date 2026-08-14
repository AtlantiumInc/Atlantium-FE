import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check, Handshake, Inbox, Loader2, MessageSquare, Send, UserMinus, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type DmRequestSummary, type Introduction, type MemberConnection, type OutreachStatus } from "@/lib/api";
import { DmPolicyControl } from "@/components/network/DmPolicyControl";
import { UpgradeCta } from "@/components/billing/UpgradeCta";
import { toast } from "sonner";

/**
 * The member's own network: who they know, who's asking, and who's written.
 *
 * Deliberately NOT a people directory — discovery of other members is a
 * separate, entitlement-gated surface (plan §13). This page only ever shows
 * relationships the member is already part of.
 */
export function NetworkPage() {
  const [connections, setConnections] = useState<MemberConnection[]>([]);
  const [dmRequests, setDmRequests] = useState<DmRequestSummary[]>([]);
  const [intros, setIntros] = useState<Introduction[]>([]);
  const [outreach, setOutreach] = useState<OutreachStatus | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [c, d, o, i] = await Promise.all([
        api.getMyConnections(),
        api.getDmRequests(),
        api.getOutreachStatus().catch(() => null),
        api.getIntroductions().catch(() => ({ introductions: [] })),
      ]);
      setConnections(c.connections);
      setDmRequests(d.requests);
      setOutreach(o);
      setIntros(i.introductions);

      // Names aren't embedded in the edge — resolve them, tolerating the ones
      // that 404 because the other side blocked us.
      const ids = [...new Set(c.connections.map((x) => x.other_profile_id))];
      const resolved = await Promise.all(ids.map(async (id) => {
        try {
          const { member } = await api.getMember(id);
          return [id, member.display_name] as const;
        } catch {
          return [id, "A member"] as const;
        }
      }));
      setNames(Object.fromEntries(resolved));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load your network");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const accepted = useMemo(() => connections.filter((c) => c.status === "accepted"), [connections]);
  const incoming = useMemo(
    () => connections.filter((c) => c.status === "pending" && c.direction === "incoming"), [connections]);
  const outgoing = useMemo(
    () => connections.filter((c) => c.status === "pending" && c.direction === "outgoing"), [connections]);

  const act = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setBusyId(id);
    try { await fn(); toast.success(msg); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work"); }
    finally { setBusyId(null); }
  };

  const nameOf = (id: string) => names[id] ?? "…";
  const pendingIntros = intros.filter((i) => i.direction === "incoming" && i.status === "awaiting_target").length;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your network</h1>
          <p className="text-sm text-muted-foreground">
            People you know in the lab, and who's trying to reach you.
          </p>
        </div>
        {outreach && (
          <OutreachMeter outreach={outreach} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="connections">
          <TabsList>
            <TabsTrigger value="connections" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Connections
              {accepted.length > 0 && <span className="text-muted-foreground">({accepted.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" /> Requests
              {(incoming.length + dmRequests.length) > 0 && (
                <span className="rounded-full bg-primary/20 px-1.5 text-[11px] text-primary">
                  {incoming.length + dmRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="intros" className="gap-1.5">
              <Handshake className="h-3.5 w-3.5" /> Intros
              {pendingIntros > 0 && (
                <span className="rounded-full bg-primary/20 px-1.5 text-[11px] text-primary">{pendingIntros}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Sent
              {outgoing.length > 0 && <span className="text-muted-foreground">({outgoing.length})</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-4 space-y-4">
            <DmPolicyControl />
            {accepted.length === 0 ? (
              <Empty
                title="No connections yet"
                body="A connection is a relationship you both acknowledge — separate from having messaged."
              />
            ) : accepted.map((c) => (
              <Row key={c.id} name={nameOf(c.other_profile_id)} profileId={c.other_profile_id}
                meta={c.source === "atlantium_intro" ? "Introduced by Atlantium" : "Connected"}
                right={
                  <Button size="sm" variant="ghost" disabled={busyId === c.id}
                    className="gap-1.5 text-muted-foreground hover:text-red-400"
                    onClick={() => act(c.id, () => api.removeConnection(c.id), "Connection removed")}>
                    <UserMinus className="h-3.5 w-3.5" /> Remove
                  </Button>
                } />
            ))}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-2">
            {incoming.length === 0 && dmRequests.length === 0 ? (
              <Empty title="Nothing waiting" body="Connection and message requests land here." />
            ) : (
              <>
                {incoming.map((c) => (
                  <Row key={c.id} name={nameOf(c.other_profile_id)} profileId={c.other_profile_id}
                    meta={c.message ? `“${c.message}”` : "Wants to connect"}
                    right={
                      <div className="flex gap-1.5">
                        <Button size="sm" disabled={busyId === c.id} className="gap-1.5"
                          onClick={() => act(c.id, () => api.decideConnection(c.id, true), "Connected")}>
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === c.id}
                          onClick={() => act(c.id, () => api.decideConnection(c.id, false), "Declined")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    } />
                ))}
                {dmRequests.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                          <MessageSquare className="mr-1 inline h-3 w-3" />
                          Message request · {r.purpose}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                      </div>
                      <div className="flex flex-shrink-0 gap-1.5">
                        <Button size="sm" disabled={busyId === r.id}
                          onClick={() => act(r.id, async () => {
                            const res = await api.decideDmRequest(r.id, true);
                            // Land in the conversation — accepting used to end here.
                            if (res.thread_id) navigate(`/messages/${res.thread_id}`);
                          }, "Conversation opened")}>
                          Reply
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === r.id}
                          onClick={() => act(r.id, () => api.decideDmRequest(r.id, false), "Declined")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Accepting a conversation is not a connection (§8A.4). */}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Replying opens a conversation. It doesn't add them to your network.
                    </p>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="intros" className="mt-4 space-y-2">
            {intros.length === 0 ? (
              <Empty
                title="No introductions yet"
                body="Some members — investors especially — are reachable only through an Atlantium introduction."
              />
            ) : intros.map((i) => (
              <div key={i.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                      {i.direction === "incoming" ? "Introduction to you" : `Introduction to ${i.other_name}`}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{i.reason}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{introStatusCopy(i)}</p>
                  </div>
                  {i.direction === "incoming" && i.status === "awaiting_target" && (
                    <div className="flex flex-shrink-0 gap-1.5">
                      <Button size="sm" disabled={busyId === i.id}
                        onClick={() => act(i.id, () => api.respondToIntroduction(i.id, true), "Introduced — you're connected")}>
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === i.id}
                        onClick={() => act(i.id, () => api.respondToIntroduction(i.id, false), "Declined")}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-2">
            {outgoing.length === 0 ? (
              <Empty title="Nothing pending" body="Requests you've sent appear here until they're answered." />
            ) : outgoing.map((c) => (
              <Row key={c.id} name={nameOf(c.other_profile_id)} profileId={c.other_profile_id}
                meta="Waiting for a reply"
                right={
                  <Button size="sm" variant="ghost" disabled={busyId === c.id}
                    className="text-muted-foreground"
                    onClick={() => act(c.id, () => api.removeConnection(c.id), "Request withdrawn")}>
                    Withdraw
                  </Button>
                } />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/** Status in the member's language, not the enum's. */
function introStatusCopy(i: Introduction) {
  if (i.direction === "outgoing") {
    const outgoing: Partial<Record<Introduction["status"], string>> = {
      pending_review: "With Atlantium for review",
      awaiting_target: `Passed on — waiting on ${i.other_name}`,
      accepted: "Accepted — you're connected",
      declined: "Declined",
      rejected: "We didn't pass this one on",
      withdrawn: "Withdrawn",
      expired: "Expired",
    };
    return outgoing[i.status] ?? i.status;
  }
  const incoming: Partial<Record<Introduction["status"], string>> = {
    awaiting_target: "Atlantium thinks this is worth your time",
    accepted: "You accepted — you're connected",
    declined: "You declined",
  };
  return incoming[i.status] ?? i.status;
}

function OutreachMeter({ outreach }: { outreach: OutreachStatus }) {
  if (!outreach.mayInitiate) {
    // One component for every upgrade moment on the platform.
    return <UpgradeCta reason="Starting conversations is part of membership" label="Upgrade to start conversations" />;
  }
  if (outreach.unlimited) {
    return <span className="text-xs text-muted-foreground">Unlimited outreach</span>;
  }
  const used = outreach.monthlyUsed;
  const limit = outreach.monthlyLimit ?? 0;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="text-right">
      <p className="text-xs text-muted-foreground tabular-nums">
        {Math.max(0, limit - used)} outreach left this month
      </p>
      <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-border/40">
        <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
      </div>
      {outreach.penalised && (
        <p className="mt-1 text-[11px] text-amber-400">Paused — too many unanswered</p>
      )}
    </div>
  );
}

function Row({ name, profileId, meta, right }: {
  name: string; profileId: string; meta: string; right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/40 px-4 py-3">
      <div className="min-w-0">
        <Link to={`/members/${profileId}`} className="text-sm font-medium hover:text-primary transition-colors">
          {name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

export default NetworkPage;
