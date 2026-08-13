import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Loader2,
  Radio,
  Send,
  Sparkles,
  Users,
  Users2,
  MessagesSquare,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SidebarProps {
  onNavigate?: (page: string) => void;
  activePage?: string;
  aiOpen: boolean;
  onAIToggle: () => void;
}

export function Sidebar({
  onNavigate,
  activePage = "hq",
  aiOpen,
  onAIToggle,
}: SidebarProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // `href` entries are real routes; the rest switch the dashboard's own panes.
  const navItems = [
    { id: "lobby",       icon: <Radio size={20} />,         label: "Lobby" },
    { id: "network",     icon: <Users2 size={20} />,        label: "Network", href: "/network" },
    { id: "messages",    icon: <MessagesSquare size={20} />, label: "Messages", href: "/messages" },
    { id: "partners",    icon: <Users size={20} />,         label: "Partners" },
    { id: "playground",  icon: <FlaskConical size={20} />,  label: "Playground" },
  ];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (aiOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [aiOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm your Atlantium AI assistant. This feature is coming soon — I'll be able to help you with learning paths, project ideas, and navigating the platform.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      className={cn(
        "h-full z-10 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl flex flex-col shrink-0 shadow-lg transition-all duration-300 ease-out",
        aiOpen ? "w-[26rem] overflow-hidden" : "w-14"
      )}
    >
      {/* ─── Icon bar (top section, always visible) ─── */}
      <div className="flex items-center h-14 shrink-0">
        {/* Logo — always visible */}
        <button
          onClick={() => { if (aiOpen) onAIToggle(); onNavigate?.("hq"); }}
          className={cn(
            "h-14 w-14 shrink-0 flex items-center justify-center transition-colors",
            !aiOpen && activePage === "hq" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <img
            src="/logo.png"
            alt="Atlantium"
            className={cn("h-7 w-7 transition-opacity", (!aiOpen && activePage === "hq") ? "opacity-100" : "opacity-60")}
          />
        </button>

        {/* AI header — slides in when open */}
        <div
          className={cn(
            "flex items-center flex-1 pr-3 transition-all duration-300",
            aiOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">AI Assistant</h2>
              <p className="text-[10px] text-muted-foreground">Powered by Atlantium</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Nav items (visible when collapsed) ─── */}
      <nav
        className={cn(
          "flex-1 w-full flex flex-col items-center gap-1 px-1.5 py-2 transition-all duration-300",
          aiOpen ? "opacity-0 scale-90 pointer-events-none absolute" : "opacity-100 scale-100"
        )}
      >
        {navItems.map((item, i) => (
          <button
            key={item.id}
            onClick={() => (item.href ? navigate(item.href) : onNavigate?.(item.id))}
            style={{ transitionDelay: aiOpen ? "0ms" : `${i * 30}ms` }}
            className={cn(
              "group relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200",
              activePage === item.id
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 shadow-xl">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* ─── Chat body (visible when expanded) ─── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 transition-all duration-300",
          aiOpen ? "opacity-100" : "opacity-0 pointer-events-none absolute"
        )}
      >
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Atlantium AI</h3>
              <p className="text-xs text-muted-foreground max-w-[14rem] leading-relaxed">
                Ask me anything about your learning path, projects, or the platform.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-white/5 border border-border/50 rounded-bl-md"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/50 p-3 shrink-0">
          <div className="flex items-end gap-2 bg-white/5 border border-border/40 rounded-xl px-3 py-2 focus-within:border-cyan-500/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground min-h-[1.5rem] max-h-24"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shrink-0 disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI responses are generated and may not always be accurate.
          </p>
        </div>

        {/* Close button — flush to bottom edge */}
        <div className="shrink-0 flex justify-center">
          <button
            onClick={onAIToggle}
            className="flex items-center justify-center px-4 py-1.5 rounded-t-[1.25rem] bg-white/5 border border-b-0 border-border/40 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ─── AI toggle (bottom, visible when collapsed) ─── */}
      <div
        className={cn(
          "w-full px-1.5 pb-3 shrink-0 transition-all duration-300",
          aiOpen ? "opacity-0 pointer-events-none h-0 pb-0" : "opacity-100"
        )}
      >
        <button
          onClick={onAIToggle}
          className="group relative h-10 w-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-150 text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <Sparkles size={20} />
          <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 shadow-xl">
            AI Assistant
          </span>
        </button>
      </div>
    </aside>
  );
}
