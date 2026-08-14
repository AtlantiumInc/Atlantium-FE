import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

type AdminUser = Awaited<ReturnType<typeof api.getApprovalUsers>>[number];

type Filter = "all" | "pending" | "incomplete" | "admins";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Not approved" },
  { key: "incomplete", label: "Questionnaire incomplete" },
  { key: "admins", label: "Admins" },
];

function tierLabel(tier: string | null) {
  if (tier === "club") return "Club";
  if (tier === "club_annual") return "Club (Annual)";
  if (tier === "free") return "Open Lab";
  return null;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Bookkeeping and plumbing that live in the same blob as the answers but are
 * not answers. `onboarding_completed_at` is the one that actually misled:
 * resetting a questionnaire clears the completion column and deliberately keeps
 * the previous answers, so a stale timestamp sat directly under an
 * "incomplete" badge. Ids and display caches are noise for the same reason.
 */
const NOT_AN_ANSWER = new Set([
  "is_completed",
  "onboarding_completed_at",
  "org_entry_id",
  "org_name",
  "org_none",
  "org_proposed_name",
]);

/** Registration answers, rendered readable rather than as a JSON dump. */
function AnswerList({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details).filter(
    ([key, value]) =>
      !NOT_AN_ANSWER.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No answers recorded yet.</p>;
  }
  return (
    <dl className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 text-xs">
          <dt className="text-muted-foreground truncate">{key.replace(/_/g, " ")}</dt>
          <dd className="min-w-0 break-words">
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const money = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);

/**
 * Where this member actually stands in the network.
 *
 * The questionnaire blob below is a record of what they typed; this is the part
 * that does something — the persona they hold, the company they claim, whether
 * they're listed as looking, and whether the curation queue may send founders
 * their way. None of it is a registration answer, so none of it appeared here
 * before.
 */
function NetworkStanding({ user }: { user: AdminUser }) {
  const roles = user.roles ?? [];
  const claims = user.pending_claims ?? [];
  if (roles.length === 0 && claims.length === 0 && !user.headline) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Standing in the network
      </h3>

      {user.headline && <p className="mb-3 text-sm">{user.headline}</p>}

      <div className="space-y-2">
        {roles.map((r, i) => {
          const d = r.details;
          const facts: string[] = [];
          if (r.seeking) facts.push(`seeking: ${r.seeking.status} (${r.seeking.visibility})`);
          if (d?.venture_stage) facts.push(`stage: ${d.venture_stage}`);
          if (d?.needs?.length) facts.push(`needs: ${d.needs.join(", ")}`);
          if (d?.check_min != null || d?.check_max != null) {
            facts.push(`checks: ${d.check_min != null ? money(d.check_min) : "?"}–${d.check_max != null ? money(d.check_max) : "up"}`);
          }
          if (d?.focus_stages?.length) facts.push(`invests at: ${d.focus_stages.join(", ")}`);
          if (d?.domains?.length) facts.push(`advises on: ${d.domains.join(", ")}`);
          if (d?.engagement?.length) facts.push(`engages: ${d.engagement.join(", ")}`);
          if (d?.hiring_roles?.length) facts.push(`hiring: ${d.hiring_roles.join(", ")}`);

          return (
            <div key={i} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium capitalize">{r.role}</span>
                {r.title && <span className="text-muted-foreground">· {r.title}</span>}
                {r.org && <span className="text-muted-foreground">· {r.org.name}</span>}
                {r.is_primary && (
                  <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    primary
                  </span>
                )}
                {/* The two answers that gate something, called out rather than
                    buried in the list — they decide who may reach this person. */}
                {d && d.intro_appetite !== "none" && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                    wants intros: {d.intro_appetite}
                  </span>
                )}
                {d?.availability && r.role === "advisor" && (
                  <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {d.availability.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {facts.length > 0 && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{facts.join(" · ")}</p>
              )}
            </div>
          );
        })}

        {claims.map((cl, i) => (
          <div key={`claim-${i}`} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
            <span className="text-amber-300">Claim awaiting review</span>
            <span className="text-muted-foreground">
              {" — "}{cl.relationship} at {cl.org ?? "an unnamed company"}
              {cl.kind === "create" && " (new to the catalog)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getApprovalUsers();
      setUsers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "pending" && u.is_approved) return false;
      if (filter === "incomplete" && u.onboarding_completed) return false;
      if (filter === "admins" && !u.is_admin) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q)
      );
    });
  }, [users, query, filter]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const pendingCount = users.filter((u) => !u.is_approved).length;

  const act = async (
    userId: string,
    fn: () => Promise<unknown>,
    successMessage: string,
    { removes = false }: { removes?: boolean } = {},
  ) => {
    setBusyId(userId);
    try {
      await fn();
      toast.success(successMessage);
      if (removes) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setSelectedId(null);
      } else {
        await load();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Accounts, questionnaire status, and access — approvals included.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          {users.length} total
          {pendingCount > 0 && (
            <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-400">
              {pendingCount} not approved
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
        {/* List */}
        <div className="rounded-xl border bg-card/40 overflow-hidden flex flex-col max-h-[75vh]">
          <div className="p-3 border-b border-border/50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email..."
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                    filter === f.key
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No users match.</p>
            ) : (
              visible.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors ${
                    selectedId === u.id ? "bg-primary/10" : "hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-medium">
                      {u.display_name || u.email}
                    </span>
                    {u.is_admin && <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    {!u.is_approved && (
                      <span className="ml-auto text-[10px] text-amber-400 flex-shrink-0">
                        not approved
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                    {u.email} · {u.onboarding_completed ? "questionnaire done" : "questionnaire incomplete"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="rounded-xl border bg-card/40 p-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
              <UsersIcon className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">Select a user to manage their account</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {selected.display_name || selected.email}
                  </h2>
                  {selected.is_admin && (
                    <Badge className="gap-1 bg-primary">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                  {tierLabel(selected.membership_tier) && (
                    <Badge variant="secondary">{tierLabel(selected.membership_tier)}</Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      selected.onboarding_completed
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-amber-500/40 text-amber-400"
                    }
                  >
                    {selected.onboarding_completed ? "Questionnaire done" : "Questionnaire incomplete"}
                  </Badge>
                  {!selected.is_approved && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                      Not approved
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {selected.email}
                  <span className="mx-1">·</span>
                  joined {fmtDate(selected.created_at)}
                  {!selected.is_email_verified && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="text-amber-400">email unverified</span>
                    </>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busyId === selected.id}
                  onClick={() =>
                    act(
                      selected.id,
                      () => api.resetUserOnboarding(selected.id),
                      "Questionnaire reset — they'll run it again on next visit",
                    )
                  }
                >
                  {busyId === selected.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Reset questionnaire
                </Button>

                {selected.is_approved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={busyId === selected.id || selected.is_admin}
                    onClick={() =>
                      act(selected.id, () => api.revokeApproval(selected.id), "Access revoked")
                    }
                  >
                    <UserX className="h-3.5 w-3.5" />
                    Revoke access
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={busyId === selected.id}
                    onClick={() =>
                      act(selected.id, () => api.approveUser(selected.id), "User approved")
                    }
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                )}

                {confirmDelete === selected.id ? (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-1.5">
                    <span className="text-xs text-red-300">
                      Delete permanently? This removes their profile, comments and reveals.
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === selected.id}
                      onClick={() =>
                        act(
                          selected.id,
                          () => api.deleteUserAccount(selected.id),
                          "Account deleted",
                          { removes: true },
                        )
                      }
                    >
                      {busyId === selected.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Yes, delete"
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    disabled={selected.is_admin}
                    onClick={() => setConfirmDelete(selected.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete account
                  </Button>
                )}
              </div>

              <NetworkStanding user={selected} />

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Questionnaire answers
                </h3>
                <AnswerList details={selected.registration_details || {}} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;
