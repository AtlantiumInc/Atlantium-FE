import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Reply, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, type ContentComment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CommentBody({
  comment,
  canDelete,
  onDelete,
  onReply,
}: {
  comment: ContentComment;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-cyan-300 overflow-hidden">
        {comment.author?.avatar_url ? (
          <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (comment.author?.display_name ?? "?").slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {comment.deleted ? "—" : comment.author?.display_name ?? "Member"}
          </span>
          <span>{timeAgo(comment.created_at)}</span>
        </div>
        <p className={`text-sm mt-0.5 whitespace-pre-wrap break-words ${comment.deleted ? "italic text-muted-foreground" : ""}`}>
          {comment.body}
        </p>
        <div className="flex gap-3 mt-1">
          {onReply && !comment.deleted && (
            <button onClick={() => onReply(comment.id)} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
          {canDelete && !comment.deleted && (
            <button onClick={() => onDelete(comment.id)} className="text-[11px] text-muted-foreground hover:text-red-400 inline-flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContentComments({
  subjectId,
  onJoin,
  variant = "section",
}: {
  subjectId: string;
  onJoin: () => void;
  /** "sidebar" is the compact rail form: composer on top, list scrolls. */
  variant?: "section" | "sidebar";
}) {
  const { user } = useAuth();
  const isSidebar = variant === "sidebar";
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const load = useCallback(() => {
    api.getComments("document", subjectId)
      .then((r) => setComments(r.messages))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [subjectId]);

  useEffect(() => { load(); }, [load]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const topLevel = comments.filter((m) => !m.parent_message_id);
    const repliesByParent = new Map<string, ContentComment[]>();
    for (const m of comments) {
      if (m.parent_message_id) {
        const list = repliesByParent.get(m.parent_message_id) ?? [];
        list.push(m);
        repliesByParent.set(m.parent_message_id, list);
      }
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  const submit = async () => {
    if (!draft.trim()) return;
    setIsPosting(true);
    try {
      await api.postComment("document", subjectId, draft.trim(), replyTo ?? undefined);
      setDraft("");
      setReplyTo(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the comment");
    } finally {
      setIsPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteComment(id);
      load();
    } catch {
      toast.error("Could not remove the comment");
    }
  };

  const canDelete = (c: ContentComment) =>
    Boolean(user && (user.is_admin || (c.author?.display_name && c.author.display_name === user.display_name)));

  const composer = (
    <div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add to the discussion..."
        className={isSidebar ? "min-h-[64px] text-sm" : "min-h-[80px] text-sm"}
      />
      <Button size="sm" className="mt-2" onClick={submit} disabled={isPosting || !draft.trim()}>
        {isPosting ? "Posting..." : "Post comment"}
      </Button>
    </div>
  );

  const startJoin = () => {
    api.trackEvent("comment_join_cta_clicked", { subject_id: subjectId, surface: variant });
    onJoin();
  };

  // A logged-out reader who wants to reply is the warmest signup we get, so the
  // composer stays visible and clicking it opens the join flow instead.
  const joinPrompt = (
    <div>
      <button
        type="button"
        onClick={startJoin}
        className="w-full text-left rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground hover:border-cyan-500/40 hover:text-foreground transition-colors min-h-[64px]"
      >
        Add to the discussion...
      </button>
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Free to join.</span>
        <Button size="sm" onClick={startJoin}>Join to comment</Button>
      </div>
    </div>
  );

  return (
    <section className={isSidebar ? "rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4" : "mt-10 pt-8 border-t border-border/40"}>
      <h2 className={`flex items-center gap-2 font-semibold ${isSidebar ? "text-sm mb-3" : "text-lg mb-5"}`}>
        <MessageSquare className="h-4 w-4 text-cyan-400" />
        Discussion {comments.length > 0 && <span className="text-muted-foreground text-sm font-normal">({comments.filter((c) => !c.deleted).length})</span>}
      </h2>

      {/* Rail: the box to type in comes first, so it's never a scroll away. */}
      {isSidebar && (
        <div className="mb-4">
          {user ? (replyTo === null ? composer : null) : joinPrompt}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading discussion...
        </div>
      ) : topLevel.length === 0 ? (
        <p className={`text-sm text-muted-foreground ${isSidebar ? "" : "mb-6"}`}>No comments yet — start the conversation.</p>
      ) : (
        <div className={isSidebar ? "space-y-4 max-h-[46vh] overflow-y-auto pr-1" : "space-y-5 mb-8"}>
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentBody comment={c} canDelete={canDelete(c)} onDelete={remove} onReply={user ? setReplyTo : undefined} />
              {(repliesByParent.get(c.id) ?? []).map((r) => (
                <div key={r.id} className="ml-11 mt-3">
                  <CommentBody comment={r} canDelete={canDelete(r)} onDelete={remove} />
                </div>
              ))}
              {replyTo === c.id && user && (
                <div className="ml-11 mt-3">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a reply..."
                    className="min-h-[70px] text-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={submit} disabled={isPosting || !draft.trim()}>
                      {isPosting ? "Posting..." : "Reply"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setDraft(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isSidebar && (user ? (replyTo === null && composer) : joinPrompt)}
    </section>
  );
}
