import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Github, Globe, Linkedin, Loader2, MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberBadges } from "@/components/network/MemberBadges";
import { OutreachDialog } from "@/components/network/OutreachDialog";
import { api, type MemberCard, type OutreachStatus } from "@/lib/api";
import { toast } from "sonner";

export function MemberProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const [member, setMember] = useState<MemberCard | null>(null);
  const [outreach, setOutreach] = useState<OutreachStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<null | "connect" | "message">(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) return;
    try {
      const [{ member: m }, o] = await Promise.all([
        api.getMember(profileId),
        api.getOutreachStatus().catch(() => null),
      ]);
      setMember(m);
      setOutreach(o);
    } catch {
      // 404 covers both "no such member" and "one of you blocked the other" —
      // the UI must not distinguish them either.
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => { void load(); }, [load]);

  if (isLoading) {
    return <div className="flex justify-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  if (notFound || !member) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-lg font-semibold">Member not found</p>
        <p className="mt-1 text-sm text-muted-foreground">This profile isn't available to you.</p>
        <Link to="/network"><Button variant="outline" className="mt-6 gap-2"><ArrowLeft className="h-4 w-4" /> Your network</Button></Link>
      </div>
    );
  }

  const connection = member.connection;
  const initials = member.display_name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <Link to="/network" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Your network
      </Link>

      <div className="rounded-2xl border border-border/40 bg-card/40 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-card ring-1 ring-border/60 flex items-center justify-center">
            {member.avatar_url
              ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
              : <span className="text-lg font-semibold text-muted-foreground">{initials}</span>}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">{member.display_name}</h1>
            {member.location && <p className="text-sm text-muted-foreground">{member.location}</p>}
            <div className="mt-3"><MemberBadges member={member} /></div>
            {member.bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>}

            {(member.links.github || member.links.linkedin || member.links.website) && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {member.links.github && (
                  <a href={member.links.github} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                )}
                {member.links.linkedin && (
                  <a href={member.links.linkedin} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {member.links.website && (
                  <a href={member.links.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {!member.is_self && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/40 pt-5">
            {connection?.status === "accepted" ? (
              <span className="text-xs text-emerald-400">Connected</span>
            ) : connection?.status === "pending" ? (
              <span className="text-xs text-muted-foreground">
                {connection.direction === "outgoing" ? "Request sent" : "They asked to connect — see your network"}
              </span>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={() => setDialog("connect")}>
                <UserPlus className="h-3.5 w-3.5" /> Connect
              </Button>
            )}

            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog("message")}>
              <MessageSquare className="h-3.5 w-3.5" />
              {connection?.status === "accepted" ? "Message" : "Request a conversation"}
            </Button>

            <Button
              size="sm" variant="ghost"
              className="ml-auto gap-1.5 text-muted-foreground hover:text-red-400"
              onClick={async () => {
                if (!confirm(`Block ${member.display_name}? They won't be able to reach you, and won't be told.`)) return;
                try {
                  await api.blockMember(member.profile_id);
                  toast.success("Blocked.");
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "That didn't work");
                }
              }}
            >
              <Ban className="h-3.5 w-3.5" /> Block
            </Button>
          </div>
        )}
      </div>

      {dialog && (
        <OutreachDialog
          member={member}
          mode={dialog}
          open={Boolean(dialog)}
          onOpenChange={(open) => !open && setDialog(null)}
          outreach={outreach}
          onDone={load}
        />
      )}
    </div>
  );
}

export default MemberProfilePage;
