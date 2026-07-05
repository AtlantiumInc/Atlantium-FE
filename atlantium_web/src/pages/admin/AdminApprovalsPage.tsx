import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Clock, Loader2, ShieldCheck, UserCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ApprovalUser = Awaited<ReturnType<typeof api.getApprovalUsers>>[number];

function tierLabel(tier: string | null) {
  if (tier === "club") return "Club";
  if (tier === "club_annual") return "Club (Annual)";
  if (tier === "free") return "Free";
  return null;
}

function UserRow({
  user,
  busy,
  onApprove,
  onRevoke,
}: {
  user: ApprovalUser;
  busy: boolean;
  onApprove: () => void;
  onRevoke: () => void;
}) {
  const tier = tierLabel(user.membership_tier);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{user.display_name || user.email}</span>
          {user.is_admin && (
            <Badge className="gap-1 bg-primary"><ShieldCheck className="h-3 w-3" />Admin</Badge>
          )}
          {tier && <Badge variant="secondary">{tier}</Badge>}
          {!user.onboarding_completed && (
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
              Form incomplete
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          {user.email}
          <span className="mx-1">·</span>
          joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {user.is_approved ? (
          <Button variant="outline" size="sm" onClick={onRevoke} disabled={busy || user.is_admin}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Revoke</>}
          </Button>
        ) : (
          <Button size="sm" onClick={onApprove} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserCheck className="mr-1.5 h-4 w-4" />Approve</>}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminApprovalsPage() {
  const [users, setUsers] = useState<ApprovalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api.getApprovalUsers());
    } catch (error) {
      console.error("Failed to load approval queue:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setApproved = async (user: ApprovalUser, approved: boolean) => {
    setBusyId(user.id);
    try {
      if (approved) await api.approveUser(user.id);
      else await api.revokeApproval(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_approved: approved } : u)));
      toast.success(approved ? `Approved ${user.display_name || user.email}` : `Revoked ${user.display_name || user.email}`);
    } catch (error) {
      console.error("Approval update failed:", error);
      toast.error("Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const pending = users.filter((u) => !u.is_approved && !u.is_admin);
  const approved = users.filter((u) => u.is_approved || u.is_admin);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Approvals</h2>
        <p className="text-muted-foreground">Review new signups before they get dashboard access.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pending review ({pending.length})
          </h3>
        </div>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No one waiting. New signups will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                busy={busyId === u.id}
                onApprove={() => setApproved(u, true)}
                onRevoke={() => setApproved(u, false)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Approved ({approved.length})
          </h3>
        </div>
        <div className="space-y-2">
          {approved.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              busy={busyId === u.id}
              onApprove={() => setApproved(u, true)}
              onRevoke={() => setApproved(u, false)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
