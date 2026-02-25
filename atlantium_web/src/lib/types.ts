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
export type ThreadType = "direct" | "group" | "focus_group" | "lobby";
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
  participants?: ThreadParticipant[];
  participant_count?: number;
  other_user_id?: string;
  other_user_username?: string;
  other_user_avatar?: string;
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

// Subscription types
export type MembershipTier = "free" | "club";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | null;
export type ChatConfig = "connection_required" | "anyone" | "off";

// User subscription info (embedded in auth/me response)
export interface UserSubscription {
  membership_tier: MembershipTier;
  subscription_status: SubscriptionStatus;
  has_club_access: boolean;
}

// User integrations info (embedded in auth/me response)
export interface UserIntegrations {
  github: {
    connected: boolean;
    username: string | null;
  };
}

// User settings info (embedded in auth/me response)
export interface UserSettings {
  connections_enabled: boolean;
  chat_config: ChatConfig;
}

export interface PaymentMethod {
  brand: string;
  last4: string;
}

export interface Subscription {
  membership_tier: MembershipTier;
  subscription_status: SubscriptionStatus;
  has_club_access: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  grace_period_end: string | null;
  payment_method: PaymentMethod | null;
}

export interface SubscriptionResponse {
  success: boolean;
  subscription: Subscription;
}

export interface SetupIntentResponse {
  success: boolean;
  client_secret: string;
}

export interface SubscribeResponse {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    current_period_end: string;
  };
  requires_action: boolean;
  client_secret: string | null;
}

export interface PortalSessionResponse {
  success: boolean;
  portal_url: string;
}

export interface PurchaseTrainingResponse {
  success: boolean;
  requires_action: boolean;
  client_secret: string | null;
  payment_intent_id: string | null;
  subscription: {
    id: string;
    status: string;
  } | null;
}

export interface ActivateTrainingResponse {
  success: boolean;
  subscription: {
    id: string;
    status: string;
  };
}

// Content / Production types
export type Platform =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "twitter"
  | "linkedin"
  | "facebook"
  | "threads";

export type ContentType = "image" | "story" | "carousel" | "short-video" | "long-video";
export type ContentStage = "draft" | "review" | "ready" | "published" | "archived";
export type StageFilter = ContentStage | "all";
export type ProductionType = "live" | "featured" | "series";

export interface ChannelInfo {
  id: string;
  name: string;
  platform: Platform;
  username: string;
  profile_picture_url: string | null;
}

export interface UnitData {
  platform: Platform;
  channel_id: string;
  channel_info: ChannelInfo;
  publishing_date: string;
  share_to_feed: boolean;
  cover_photo: string | null;
  alt_caption: string | null;
  alt_cap_off: boolean;
  user_tags: string[];
  collaborators: string[];
  audio_name: string;
  location: string | null;
  automation_id: string;
  production_id: string | null;
}

export interface MediaFile {
  order: number;
  cdn_url: string;
  isImage: boolean;
}

export interface UnitDetails {
  unit_id: string;
  post_type: ContentType;
  stage: ContentStage;
  main_caption: string;
  publishing_date: string;
  media_files: MediaFile[];
  workflows: string[];
}

export interface Unit {
  unit_data: UnitData[];
  unit_details: UnitDetails;
}

export interface Production {
  id: string;
  name: string;
  type: ProductionType;
  units: Unit[];
}

// Lobby types
export interface LobbyPosition {
  col: number;
  row: number;
}

export interface LobbyMember {
  user_id: string;
  position: LobbyPosition | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface LobbyResponse {
  success: boolean;
  thread_id: string;
  name: string;
  members: LobbyMember[];
}

export interface LobbyJoinResponse {
  success: boolean;
  thread_id: string;
  position: LobbyPosition;
}

export interface LobbyLivekitTokenResponse {
  success: boolean;
  token: string;
  url: string;
}

export interface GroupLivekitTokenResponse {
  success: boolean;
  token: string;
  url: string;
  room_name: string;
}
