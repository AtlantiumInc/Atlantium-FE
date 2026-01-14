import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useXanoRealtime } from "@/contexts/XanoRealtimeContext";
import { useThreadChannel } from "@/hooks/useThreadChannel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Search,
  Pin,
  Send,
  Smile,
  Paperclip,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Thread, ThreadMessage, ThreadDetail } from "@/lib/types";

// Mock files data (no backend yet)
const MOCK_FILES = [
  { id: "1", name: "Project Brief.pdf", size: "2.4 MB" },
  { id: "2", name: "Meeting Notes.docx", size: "156 KB" },
  { id: "3", name: "Design Assets.zip", size: "8.2 MB" },
];

export function MessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadDetails, setThreadDetails] = useState<ThreadDetail | null>(null);
  const [showFiles, setShowFiles] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // Realtime state
  const { connectionState, presenceMap } = useXanoRealtime();

  // Handle incoming realtime messages
  const handleRealtimeMessage = useCallback((message: ThreadMessage) => {
    setMessages((prev) => {
      // Avoid duplicates (in case message was sent by current user)
      if (prev.some((m) => m.message_id === message.message_id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // Thread channel hook for realtime messaging
  const { typingUsers } = useThreadChannel({
    threadId: selectedThread?.thread_id ?? null,
    onNewMessage: handleRealtimeMessage,
  });

  // Filter out current user from typing indicators
  const othersTyping = typingUsers.filter((u) => u.user_id !== user?.id);

  const fetchThreads = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setIsLoadingThreads(true);
      }
      setError(null);
      const result = await api.getThreads();
      setThreads(result.threads || []);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
      setError("Failed to load messages. Please try again.");
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      const result = await api.getThreadMessages(threadId);
      setMessages(result.messages || []);
      await api.markThreadAsRead(threadId);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setError("Failed to load messages. Please try again.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      const result = await api.getThreadDetails(threadId);
      setThreadDetails(result.thread);
    } catch (error) {
      console.error("Failed to fetch thread details:", error);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      isInitialLoadRef.current = true;
      fetchMessages(selectedThread.thread_id);
      fetchThreadDetails(selectedThread.thread_id);
    }
  }, [selectedThread]);

  useEffect(() => {
    // Only scroll after loading completes and we have messages
    if (!isLoadingMessages && messages.length > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (isInitialLoadRef.current) {
        // Wait for DOM to paint, then scroll to bottom
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        });
        isInitialLoadRef.current = false;
      } else {
        // Smooth scroll for new messages
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, isLoadingMessages]);

  const handleSendMessage = async () => {
    if (!selectedThread || !messageInput.trim()) return;

    const content = messageInput;
    setMessageInput("");

    try {
      setIsSending(true);
      // Send message via REST API - backend will broadcast via realtime
      await api.sendMessage(selectedThread.thread_id, content);

      // Refresh threads to update last message preview (without showing loading spinner)
      await fetchThreads(false);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessageInput(content);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handlePinThread = async (threadId: string, pinned: boolean) => {
    try {
      await api.pinThread(threadId, !pinned);
      await fetchThreads(false);
    } catch (error) {
      console.error("Failed to pin thread:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getThreadDisplayName = (thread: Thread) => {
    if (thread.type === "group" && thread.name) {
      return thread.name;
    }
    return thread.other_user_username || "Unknown";
  };

  const filteredThreads = threads.filter((thread) => {
    const threadName = thread.name || thread.other_user_username || "";
    return threadName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pinnedThreads = filteredThreads.filter((t) => t.pinned);
  const unpinnedThreads = filteredThreads.filter((t) => !t.pinned);

  if (isLoadingThreads) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-6 -mt-6 -mb-6">
      {/* Left Sidebar - Chat List */}
      <div className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Pinned Chats */}
        {pinnedThreads.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pinned Chats
              </span>
              <Pin size={12} className="text-muted-foreground" />
            </div>
            <div className="space-y-1">
              {pinnedThreads.map((thread) => (
                <ChatListItem
                  key={thread.thread_id}
                  thread={thread}
                  isSelected={selectedThread?.thread_id === thread.thread_id}
                  onSelect={setSelectedThread}
                  onPin={() => handlePinThread(thread.thread_id, thread.pinned)}
                  getDisplayName={getThreadDisplayName}
                  getInitials={getInitials}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* All Chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              All Chats
            </span>
          </div>
          <div className="space-y-1 px-2">
            {unpinnedThreads.length === 0 && pinnedThreads.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              unpinnedThreads.map((thread) => (
                <ChatListItem
                  key={thread.thread_id}
                  thread={thread}
                  isSelected={selectedThread?.thread_id === thread.thread_id}
                  onSelect={setSelectedThread}
                  onPin={() => handlePinThread(thread.thread_id, thread.pinned)}
                  getDisplayName={getThreadDisplayName}
                  getInitials={getInitials}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedThread.other_user_avatar || undefined} />
                    <AvatarFallback className="text-lg">
                      {getInitials(getThreadDisplayName(selectedThread))}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator for direct messages */}
                  {selectedThread.type === "direct" &&
                    selectedThread.other_user_id &&
                    presenceMap.has(selectedThread.other_user_id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                </div>
                <div>
                  <h3 className="font-semibold">{getThreadDisplayName(selectedThread)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedThread.type === "group"
                      ? `${threadDetails?.participants?.length || 0} members`
                      : presenceMap.has(selectedThread.other_user_id || "")
                        ? "Online"
                        : "Offline"}
                  </p>
                </div>
              </div>
              {/* Connection status indicator */}
              {connectionState !== "connected" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connectionState === "connecting" ||
                      connectionState === "reconnecting"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-red-500"
                    }`}
                  />
                  {connectionState === "reconnecting"
                    ? "Reconnecting..."
                    : connectionState === "connecting"
                      ? "Connecting..."
                      : "Disconnected"}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isOwnMessage = user?.id === message.sender_id;
                    return (
                      <div
                        key={message.message_id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : ""}`}>
                          {message.parent_message && (
                            <div className="mb-1 pl-3 border-l-2 border-primary/50 text-xs text-muted-foreground">
                              <span className="text-primary">Reply</span>
                              <p className="truncate">{message.parent_message.content}</p>
                            </div>
                          )}
                          <div className="flex items-end gap-2">
                            {!isOwnMessage && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={message.sender_avatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(message.sender_username)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? "justify-end" : ""}`}>
                                <span
                                  className={`text-sm font-medium ${
                                    isOwnMessage ? "text-primary" : "text-orange-500"
                                  }`}
                                >
                                  {message.sender_username}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div
                                className={`p-3 rounded-lg ${
                                  isOwnMessage ? "bg-muted" : "bg-card border"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-line">{message.content}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Typing indicator */}
            {othersTyping.length > 0 && (
              <div className="px-4 py-2 text-sm text-muted-foreground border-t border-border">
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                  {othersTyping.length === 1
                    ? `${othersTyping[0].username} is typing...`
                    : `${othersTyping.length} people are typing...`}
                </span>
              </div>
            )}

            {/* Message Input */}
            <div className={`p-4 ${othersTyping.length === 0 ? "border-t border-border" : ""}`}>
              {error && (
                <p className="text-sm text-destructive mb-2">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                  <Paperclip size={18} />
                </Button>
                <Input
                  placeholder="Type a message..."
                  className="flex-1"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                />
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                  <Smile size={18} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                >
                  {isSending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No conversation selected</p>
            <p className="text-sm">Choose a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Files */}
      {selectedThread && (
        <div className="w-64 flex-shrink-0 border-l border-border overflow-y-auto bg-card">
          <div className="p-4">
            <button
              className="w-full flex items-center justify-between mb-3"
              onClick={() => setShowFiles(!showFiles)}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span className="font-medium text-sm">Files</span>
              </div>
              {showFiles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showFiles && (
              <div className="space-y-2">
                {MOCK_FILES.length > 0 ? (
                  MOCK_FILES.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="p-2 bg-muted rounded">
                        <FileText size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.size}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No files shared yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Chat List Item Component
interface ChatListItemProps {
  thread: Thread;
  isSelected: boolean;
  onSelect: (thread: Thread) => void;
  onPin: () => void;
  getDisplayName: (thread: Thread) => string;
  getInitials: (name: string) => string;
  compact?: boolean;
}

function ChatListItem({
  thread,
  isSelected,
  onSelect,
  onPin: _onPin,
  getDisplayName,
  getInitials,
  compact = false,
}: ChatListItemProps) {
  const displayName = getDisplayName(thread);

  if (compact) {
    return (
      <button
        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
          isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
        }`}
        onClick={() => onSelect(thread)}
      >
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={thread.other_user_avatar || undefined} />
            <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </div>
        <span className="text-sm flex-1 text-left truncate">{displayName}</span>
        {thread.unread_count > 0 && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              isSelected
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {thread.unread_count}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
      }`}
      onClick={() => onSelect(thread)}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={thread.other_user_avatar || undefined} />
          <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {thread.unread_count > 0 && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                isSelected
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {thread.unread_count}
            </span>
          )}
        </div>
        <p
          className={`text-xs truncate ${
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {thread.last_message_content || "No messages yet"}
        </p>
      </div>
    </button>
  );
}
