import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  MessageCircle,
  Send,
  Search,
  Pin,
  Users,
  Plus,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Thread, ThreadMessage, ThreadDetail } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MessagesPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      setIsLoadingThreads(true);
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

  const fetchMessages = async (threadId: string, page: number = 1) => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      const result = await api.getThreadMessages(threadId, page);
      setMessages(result.messages || []);

      // Mark thread as read
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
      fetchMessages(selectedThread.thread_id);
      fetchThreadDetails(selectedThread.thread_id);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!selectedThread || !messageInput.trim()) return;

    const content = messageInput;
    setMessageInput("");

    try {
      setIsSending(true);
      await api.sendMessage(selectedThread.thread_id, content);
      await fetchMessages(selectedThread.thread_id);
      await fetchThreads();
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
      await fetchThreads();
    } catch (error) {
      console.error("Failed to pin thread:", error);
      setError("Failed to update thread. Please try again.");
    }
  };

  const handleLeaveThread = async (threadId: string) => {
    try {
      await api.leaveThread(threadId);
      setSelectedThread(null);
      await fetchThreads();
    } catch (error) {
      console.error("Failed to leave thread:", error);
      setError("Failed to leave thread. Please try again.");
    }
  };

  const getInitials = (displayName: string) => {
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredThreads = threads.filter((thread) => {
    const threadName = thread.name || thread.participants?.[0]?.username || "";
    return threadName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pinnedThreads = filteredThreads.filter((t) => t.pinned);
  const unpinnedThreads = filteredThreads.filter((t) => !t.pinned);

  const getThreadDisplayName = (thread: Thread) => {
    if (thread.type === "group" && thread.name) {
      return thread.name;
    }
    if (!thread.participants || thread.participants.length === 0) {
      return "Unknown";
    }
    const otherParticipant = thread.participants.find((p) => p.user_id !== "current-user-id");
    return otherParticipant?.username || "Unknown";
  };

  if (isLoadingThreads) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Left Sidebar - Threads */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <h2 className="font-semibold text-lg">Messages</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Pinned Threads */}
            {pinnedThreads.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                  Pinned
                </h3>
                <div className="space-y-2">
                  {pinnedThreads.map((thread) => (
                    <ThreadItemButton
                      key={thread.thread_id}
                      thread={thread}
                      isSelected={selectedThread?.thread_id === thread.thread_id}
                      onSelect={setSelectedThread}
                      onPin={() => handlePinThread(thread.thread_id, thread.pinned)}
                      getDisplayName={getThreadDisplayName}
                      getInitials={getInitials}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unpinned Threads */}
            {unpinnedThreads.length > 0 && (
              <div className="space-y-2">
                {pinnedThreads.length > 0 && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mt-4">
                    Conversations
                  </h3>
                )}
                <div className="space-y-2">
                  {unpinnedThreads.map((thread) => (
                    <ThreadItemButton
                      key={thread.thread_id}
                      thread={thread}
                      isSelected={selectedThread?.thread_id === thread.thread_id}
                      onSelect={setSelectedThread}
                      onPin={() => handlePinThread(thread.thread_id, thread.pinned)}
                      getDisplayName={getThreadDisplayName}
                      getInitials={getInitials}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredThreads.length === 0 && !isLoadingThreads && (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Center - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Messages Header */}
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {getThreadDisplayName(selectedThread)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedThread.type === "group" &&
                    `${selectedThread.participants?.length || 0} members`}
                </p>
              </div>
              <Button size="sm" variant="ghost">
                <Users className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            {error && (
              <div className="flex items-center gap-3 m-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {isLoadingMessages ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">
                          No messages yet. Start the conversation!
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.message_id} className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={message.sender_avatar} />
                            <AvatarFallback>
                              {getInitials(message.sender_username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {message.sender_username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            {message.parent_message && (
                              <div className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1 mb-1">
                                <p className="font-semibold">
                                  Reply to {message.parent_message.message_id.slice(0, 8)}
                                </p>
                                <p className="line-clamp-1">
                                  {message.parent_message.content}
                                </p>
                              </div>
                            )}
                            <p className="text-sm break-words">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
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
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || !messageInput.trim()}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation to start messaging
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Thread Details */}
      {selectedThread && threadDetails && (
        <div className="w-64 border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-4">
              {selectedThread.type === "group" ? "Group Info" : "Conversation"}
            </h3>

            {selectedThread.type === "group" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Members</h4>
                  <div className="space-y-2">
                    {threadDetails.participants?.map((participant) => (
                      <div key={participant.user_id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={participant.avatar_url} />
                          <AvatarFallback>
                            {getInitials(participant.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{participant.username}</span>
                        {participant.role === "owner" && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Owner
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleLeaveThread(selectedThread.thread_id)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </Button>
              </div>
            )}

            {selectedThread.type === "direct" && (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleLeaveThread(selectedThread.thread_id)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Close Conversation
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for thread list items
interface ThreadItemButtonProps {
  thread: Thread;
  isSelected: boolean;
  onSelect: (thread: Thread) => void;
  onPin: () => void;
  getDisplayName: (thread: Thread) => string;
  getInitials: (name: string) => string;
}

function ThreadItemButton({
  thread,
  isSelected,
  onSelect,
  onPin,
  getDisplayName,
  getInitials,
}: ThreadItemButtonProps) {
  const unreadBadge =
    thread.unread_count > 0 ? (
      <span className="flex items-center justify-center h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full ml-auto flex-shrink-0">
        {thread.unread_count > 99 ? "99+" : thread.unread_count}
      </span>
    ) : null;

  return (
    <button
      onClick={() => onSelect(thread)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback>{getInitials(getDisplayName(thread))}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{getDisplayName(thread)}</p>
        <p className="text-xs opacity-75 truncate">
          {thread.last_message_content || "No messages yet"}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {unreadBadge}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className="p-1 hover:bg-muted rounded"
        >
          <Pin
            className={`h-3 w-3 ${thread.pinned ? "fill-current" : ""}`}
          />
        </button>
      </div>
    </button>
  );
}
