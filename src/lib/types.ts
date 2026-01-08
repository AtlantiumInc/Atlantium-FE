// Article types
export interface ArticleSource {
  name: string;
  icon: string;
}

export interface ArticleAuthor {
  name: string;
  title: string;
}

export interface Article {
  id: string;
  thread_id: string;
  title: string;
  summary: string;
  content?: string;
  source: ArticleSource;
  author?: ArticleAuthor;
  tags: string[];
  key_takeaways?: string[];
  read_time_minutes: number;
  external_url?: string;
  is_bookmarked: boolean;
  sender_profile?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
}

export interface ArticlesListResponse {
  articles: Article[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface CreateArticleInput {
  thread_id: string;
  title: string;
  summary: string;
  content: string;
  source: ArticleSource;
  author?: ArticleAuthor;
  tags?: string[];
  key_takeaways?: string[];
  read_time_minutes?: number;
  external_url?: string;
}

export interface UpdateArticleInput {
  article_id: string;
  title?: string;
  summary?: string;
  content?: string;
  source?: ArticleSource;
  author?: ArticleAuthor;
  tags?: string[];
  key_takeaways?: string[];
  read_time_minutes?: number;
  external_url?: string;
}

// Connection types
export type ConnectionStatus = "connected" | "blocked_by_me" | "blocked_by_them" | "invitation_sent" | "invitation_received" | "none";

export interface Connection {
  connection_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  chat_enabled: boolean;
  created_at: string;
}

export interface ConnectionInvitation {
  invitation_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export interface ConnectionInvitations {
  received: ConnectionInvitation[];
  sent: ConnectionInvitation[];
}

// Thread and messaging types
export type ThreadType = "direct" | "group";
export type ParticipantRole = "owner" | "admin" | "member";

export interface ThreadParticipant {
  user_id: string;
  username: string;
  avatar_url?: string;
  role?: ParticipantRole;
}

export interface ThreadMessage {
  message_id: string;
  thread_id: string;
  sender_id: string;
  sender_username: string;
  sender_avatar?: string;
  content: string;
  is_reply: boolean;
  parent_message?: {
    message_id: string;
    sender_id: string;
    content: string;
    created_at: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface Thread {
  thread_id: string;
  type: ThreadType;
  name?: string;
  last_message_content?: string;
  last_message_sender_id?: string;
  last_message_at?: string;
  unread_count: number;
  pinned: boolean;
  participants: ThreadParticipant[];
  created_at: string;
  updated_at: string;
}

export interface ThreadDetail {
  thread_id: string;
  type: ThreadType;
  name?: string;
  participants: ThreadParticipant[];
  created_at: string;
  updated_at: string;
}

export interface ThreadsListResponse {
  threads: Thread[];
}

export interface MessagesResponse {
  messages: ThreadMessage[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
