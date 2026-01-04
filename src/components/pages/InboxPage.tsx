import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Pin,
  Send,
  Smile,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  pinned?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  time: string;
  date: string;
  replyTo?: {
    name: string;
    content: string;
  };
}

interface MediaFile {
  id: string;
  name: string;
  type: "video" | "image" | "file";
  thumbnail?: string;
  size?: string;
}

const PINNED_CHATS: Chat[] = [
  { id: "1", name: "Sarah Mitchell", lastMessage: "Let's sync up tomorrow", time: "1h", unread: 4, online: true, pinned: true },
  { id: "2", name: "David Chen", lastMessage: "The PR looks good", time: "3h", unread: 2, online: false, pinned: true },
  { id: "3", name: "Emma Wilson", lastMessage: "Thanks for the update!", time: "5h", unread: 0, online: true, pinned: true },
];

const ALL_CHATS: Chat[] = [
  { id: "4", name: "Robert Dillan", lastMessage: "Try to do that some other...", time: "2m", unread: 0, online: true },
  { id: "5", name: "James Finch", lastMessage: "Amazing stuff dude! Like it!", time: "15m", unread: 2, online: true },
  { id: "6", name: "Alania Goodwin", lastMessage: "Someday you'll see the out...", time: "1h", unread: 0, online: false },
  { id: "7", name: "Sammy Jones", lastMessage: "See ya next week then!", time: "2h", unread: 0, online: false },
  { id: "8", name: "Rick Mortinson", lastMessage: "Call James and discuss tha...", time: "3h", unread: 0, online: false },
];

const MESSAGES: Message[] = [
  {
    id: "1",
    senderId: "other",
    senderName: "Bethany Mellonee",
    content: "We exchanged a few messages on Dribbble about a call tomorrow Tuesday, would you be available Wednesday instead at 3:30pm? It was a holiday today (I had forgotten about it) and I'll be in a rush tomorrow Tuesday. Let me know if Wednesday 3:30 Kiev time works for you.",
    time: "5:34 PM",
    date: "July 23rd, 2024",
  },
  {
    id: "2",
    senderId: "me",
    senderName: "Frank Anderson",
    content: "Sure, no problem, let's have a call\n\nWhen do you think is better?\n\nPing me when you are ready",
    time: "5:39 PM",
    date: "July 23rd, 2024",
  },
  {
    id: "3",
    senderId: "other",
    senderName: "Bethany Mellonee",
    content: "Can you see the problem?\n\nI think we can resolve that if we do some correct steps",
    time: "5:52 PM",
    date: "July 23rd, 2024",
  },
  {
    id: "4",
    senderId: "other",
    senderName: "Bethany Mellonee",
    content: "Hmm, okay",
    time: "6:42 PM",
    date: "July 23rd, 2024",
  },
  {
    id: "5",
    senderId: "me",
    senderName: "Frank Anderson",
    content: "Need to check this out. ASAP",
    time: "6:44 PM",
    date: "July 23rd, 2024",
  },
  {
    id: "6",
    senderId: "other",
    senderName: "Reply Thread",
    content: "Need to check this out. ASAP",
    time: "7:12 PM",
    date: "July 23rd, 2024",
    replyTo: { name: "Bethany", content: "Need to check this out. ASAP" },
  },
  {
    id: "7",
    senderId: "me",
    senderName: "Frank Anderson",
    content: "Yeah, that's something new. We are review issue and I will assign @david on this",
    time: "7:14 PM",
    date: "July 23rd, 2024",
    replyTo: { name: "Frank", content: "Need to check this out. ASAP" },
  },
  {
    id: "8",
    senderId: "me",
    senderName: "Frank Anderson",
    content: "Please keep me updated on this\n\nLet's schedule a meeting if needed",
    time: "8:34 PM",
    date: "July 23rd, 2024",
  },
];

const MEDIA_FILES: MediaFile[] = [
  { id: "1", name: "Presentation Fluid Design.mp4", type: "video", size: "2.4 MB" },
  { id: "2", name: "Digital Course On Fluid.mp4", type: "video", size: "2.4 MB" },
  { id: "3", name: "Affecting the process.mp4", type: "video", size: "1.8 MB" },
  { id: "4", name: "Marketing Documentation.pdf", type: "file", size: "11.7 MB" },
  { id: "5", name: "How It Affects The Product.pdf", type: "file", size: "23.4 MB" },
  { id: "6", name: "Team Review 2025.pdf", type: "file", size: "60.8 MB" },
];

export function InboxPage() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(ALL_CHATS[0]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showVideos, setShowVideos] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 -mx-6 -mt-6 px-0">
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
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pinned Chats
            </span>
            <Pin size={12} className="text-muted-foreground" />
          </div>
          <div className="space-y-1">
            {PINNED_CHATS.map((chat) => (
              <button
                key={chat.id}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedChat?.id === chat.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {chat.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  {chat.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-card rounded-full" />
                  )}
                </div>
                <span className="text-sm flex-1 text-left truncate">{chat.name}</span>
                {chat.unread > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    selectedChat?.id === chat.id
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}>
                    {chat.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* All Chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              All Chats
            </span>
          </div>
          <div className="space-y-1 px-2">
            {ALL_CHATS.map((chat) => (
              <button
                key={chat.id}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedChat?.id === chat.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {chat.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-card rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{chat.name}</span>
                    {chat.unread > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        selectedChat?.id === chat.id
                          ? "bg-primary-foreground text-primary"
                          : "bg-primary text-primary-foreground"
                      }`}>
                        {chat.unread}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${
                    selectedChat?.id === chat.id ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {selectedChat?.name.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedChat?.name || "Select a chat"}</h3>
              <p className="text-sm text-muted-foreground">Head Of Design</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              From July 23rd, 2024
            </span>
          </div>

          {MESSAGES.map((message) => (
            <div key={message.id} className={`flex ${message.senderId === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${message.senderId === "me" ? "order-2" : ""}`}>
                {message.replyTo && (
                  <div className="mb-1 pl-3 border-l-2 border-primary/50 text-xs text-muted-foreground">
                    <span className="text-primary">Reply from {message.replyTo.name}</span>
                    <p className="truncate">{message.replyTo.content}</p>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {message.senderId !== "me" && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">{message.senderName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${message.senderId === "me" ? "text-primary" : "text-orange-500"}`}>
                        {message.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">{message.time}</span>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.senderId === "me"
                        ? "bg-muted"
                        : "bg-card border"
                    }`}>
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Paperclip size={18} />
            </Button>
            <Input
              placeholder="I'll try to make that..."
              className="flex-1"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Smile size={18} />
            </Button>
            <Button size="icon" className="flex-shrink-0">
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Media */}
      <div className="w-64 flex-shrink-0 border-l border-border overflow-y-auto bg-card">
        {/* Videos */}
        <div className="p-4 border-b border-border">
          <button
            className="w-full flex items-center justify-between mb-3"
            onClick={() => setShowVideos(!showVideos)}
          >
            <div className="flex items-center gap-2">
              <Play size={16} />
              <span className="font-medium text-sm">Videos</span>
            </div>
            {showVideos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showVideos && (
            <div className="grid grid-cols-2 gap-2">
              {MEDIA_FILES.filter((f) => f.type === "video").map((file) => (
                <div key={file.id} className="aspect-video bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80">
                  <Play size={20} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images */}
        <div className="p-4 border-b border-border">
          <button
            className="w-full flex items-center justify-between mb-3"
            onClick={() => setShowImages(!showImages)}
          >
            <div className="flex items-center gap-2">
              <ImageIcon size={16} />
              <span className="font-medium text-sm">Images</span>
            </div>
            {showImages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showImages && (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg cursor-pointer hover:opacity-80" />
              ))}
            </div>
          )}
        </div>

        {/* Files */}
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
              {MEDIA_FILES.filter((f) => f.type === "file").map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="p-2 bg-muted rounded">
                    <FileText size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
