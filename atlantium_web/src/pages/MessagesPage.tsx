import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessagesSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, type Conversation, type ThreadMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Conversations. The half that was missing: accepting a request created a
 * thread nobody could read.
 *
 * Two panes on desktop, one at a time on mobile — the thread is a real route
 * (`/messages/:id`) so it's linkable from the accept flow and the back button
 * behaves.
 */
export function MessagesPage() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { conversations } = await api.getConversations();
      setConversations(conversations);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Messages</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Conversations you've opened. Talking to someone doesn't add them to your network.
      </p>

      <div className={cn(
        "grid gap-4",
        "lg:grid-cols-[minmax(0,20rem)_1fr]",
      )}>
        {/* List — hidden on mobile once a thread is open */}
        <div className={cn("rounded-xl border border-border/40 bg-card/40 overflow-hidden",
          threadId && "hidden lg:block")}>
          {isLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <MessagesSquare className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="mx-auto mt-1 max-w-[22ch] text-xs text-muted-foreground">
                They start when someone accepts a message request.
              </p>
              <Link to="/network"><Button variant="outline" size="sm" className="mt-4">Your network</Button></Link>
            </div>
          ) : conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/messages/${c.id}`)}
              className={cn(
                "w-full border-b border-border/40 px-4 py-3 text-left transition-colors",
                threadId === c.id ? "bg-primary/10" : "hover:bg-card/80",
              )}
            >
              <p className="truncate text-sm font-medium">{c.other_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c.last_message
                  ? `${c.last_message.mine ? "You: " : ""}${c.last_message.body}`
                  : "No messages yet"}
              </p>
            </button>
          ))}
        </div>

        <div className={cn(!threadId && "hidden lg:block")}>
          {threadId
            ? <Thread threadId={threadId} onSent={load} />
            : (
              <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-border/50">
                <p className="text-sm text-muted-foreground">Pick a conversation</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function Thread({ threadId, onSent }: { threadId: string; onSent: () => void }) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [header, setHeader] = useState<{ other_name: string; other_profile_id: string | null } | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [gone, setGone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.getConversation(threadId);
      setMessages(r.messages);
      setHeader(r.conversation);
    } catch {
      // 404 covers "not yours" and "blocked" alike — the UI mustn't tell them apart.
      setGone(true);
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setIsSending(true);
    try {
      const { message } = await api.sendThreadMessage(threadId, body);
      setMessages((prev) => [...prev, message]);
      setDraft("");
      onSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  if (gone) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 px-6 py-16 text-center">
        <p className="text-sm font-medium">Conversation unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">You don't have access to this conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[24rem] flex-col rounded-xl border border-border/40 bg-card/40">
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <Link to="/messages" className="lg:hidden text-muted-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        {header?.other_profile_id ? (
          <Link to={`/members/${header.other_profile_id}`} className="text-sm font-medium hover:text-primary">
            {header.other_name}
          </Link>
        ) : (
          <span className="text-sm font-medium">{header?.other_name}</span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
              m.mine
                ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                : "bg-card border border-border/50 rounded-bl-sm",
            )}>
              {m.body}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border/40 p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); }
            }}
            rows={2}
            placeholder="Write a reply…  (⌘↵ to send)"
            className="resize-none"
          />
          <Button onClick={send} disabled={isSending || !draft.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MessagesPage;
