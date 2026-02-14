import type {
  Article,
  ArticlesListResponse,
  CreateArticleInput,
  UpdateArticleInput,
  Connection,
  ConnectionStatus,
  ThreadDetail,
  ThreadsListResponse,
  MessagesResponse,
  SubscriptionResponse,
  SetupIntentResponse,
  SubscribeResponse,
  PortalSessionResponse,
  UserSubscription,
  UserIntegrations,
  UserSettings,
  LobbyResponse,
  LobbyJoinResponse,
  LobbyLivekitTokenResponse,
  GroupLivekitTokenResponse,
} from "./types";

const AUTH_API_BASE_URL = "https://cloud.atlantium.ai/api:_c66cUCc";
const APP_API_BASE_URL = "https://cloud.atlantium.ai/api:_c66cUCc";
const STRIPE_API_BASE_URL = "https://cloud.atlantium.ai/api:-ulnKZsX";
const ADMIN_API_BASE_URL = "https://cloud.atlantium.ai/api:ud37c7Xg";

export interface ApiError {
  message: string;
  code?: string;
}

export interface OtpResponse {
  success: boolean;
  user_id: string;
}

export interface VerifyResponse {
  success: boolean;
  auth_token: string;
  user: User;
}

export interface AdminLoginResponse {
  success: boolean;
  auth_token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  is_email_verified: boolean;
  created_at?: string;
  is_admin?: boolean;
  has_access?: boolean;
  avatar?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  ref_code?: string;
  referred_by?: string;
  _subscription?: UserSubscription;
  _integrations?: UserIntegrations;
  _settings?: UserSettings;
}

export interface FrontierArticle {
  id: string;
  thread_id: string;
  sender_id: string;
  message_type: string;
  created_at: number;
  updated_at: number;
  is_edited: boolean;
  is_reply: boolean;
  parent_message_id: string | null;
  status: string;
  content: {
    title: string;
    body: string;
    tags: string[];
    tldr: string[];
    author: {
      name: string;
      avatar_url: string;
    };
    publisher: {
      name: string;
      logo_url: string;
      published_at: string;
    };
    featured_image: {
      url: string;
      alt: string;
      caption: string;
    };
  };
}

class ApiClient {
  private authToken: string | null = null;

  constructor() {
    this.authToken = localStorage.getItem("auth_token");
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  getAuthToken() {
    return this.authToken;
  }

  getAdminToken() {
    return localStorage.getItem("admin_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    baseUrl: string = APP_API_BASE_URL,
    useAdminToken: boolean = false
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = useAdminToken ? this.getAdminToken() : this.authToken;
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "An error occurred") as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return data;
  }

  // Auth methods
  async requestOtp(email: string): Promise<OtpResponse> {
    return this.request<OtpResponse>("/auth/otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, AUTH_API_BASE_URL);
  }

  async verifyOtp(email: string, code: string, refCode?: string): Promise<VerifyResponse> {
    return this.request<VerifyResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code, referral_code: refCode }),
    }, AUTH_API_BASE_URL);
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me", {
      method: "GET",
    }, AUTH_API_BASE_URL);
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", {
      method: "POST",
    }, AUTH_API_BASE_URL);
    this.setAuthToken(null);
  }

  // Admin auth methods
  async adminRequestOtp(email: string): Promise<OtpResponse> {
    return this.request<OtpResponse>("/admin/otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, ADMIN_API_BASE_URL);
  }

  async adminVerifyOtp(email: string, code: string): Promise<AdminLoginResponse> {
    return this.request<AdminLoginResponse>("/admin/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }, ADMIN_API_BASE_URL);
  }

  // Admin event methods
  async getEvents(): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    event_type: "virtual" | "in_person";
    start_time: string;
    end_time?: string;
    location?: string;
    price?: string;
    created_at: string;
  }>> {
    return this.request("/events/list", {
      method: "GET",
    }, ADMIN_API_BASE_URL, true);
  }

  async createEvent(data: {
    title: string;
    description?: string;
    event_type?: "virtual" | "in_person";
    start_time: string;
    end_time?: string;
    location?: string;
    price?: string;
  }): Promise<{ id: string; title: string; start_time: string }> {
    return this.request("/events/create", {
      method: "POST",
      body: JSON.stringify(data),
    }, ADMIN_API_BASE_URL, true);
  }

  async editEvent(data: {
    event_id: string;
    title?: string;
    description?: string;
    event_type?: "virtual" | "in_person";
    start_time?: string;
    end_time?: string;
    location?: string;
    price?: string;
  }): Promise<{ id: string; title: string; start_time: string }> {
    return this.request("/events/edit", {
      method: "POST",
      body: JSON.stringify(data),
    }, ADMIN_API_BASE_URL, true);
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    return this.request("/events/delete", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId }),
    }, ADMIN_API_BASE_URL, true);
  }

  // Admin user methods
  async getAllUsers(): Promise<Array<{
    id: string;
    email: string;
    display_name?: string;
    is_admin: boolean;
    is_email_verified: boolean;
    has_access: boolean;
    created_at: string;
    last_login?: string;
  }>> {
    return this.request("/users/list", {
      method: "GET",
    }, ADMIN_API_BASE_URL, true);
  }

  async updateUserAccess(userId: string, hasAccess: boolean): Promise<{ success: boolean; message: string }> {
    return this.request("/users/update-access", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, has_access: hasAccess }),
    }, ADMIN_API_BASE_URL, true);
  }

  async updateUserAdmin(userId: string, isAdmin: boolean): Promise<{ success: boolean; message: string }> {
    return this.request("/users/update-admin", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, is_admin: isAdmin }),
    }, ADMIN_API_BASE_URL, true);
  }

  async getAdminUserProfile(userId: string): Promise<{
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    bio?: string;
    avatar_url?: string;
    location?: string;
    website_url?: string;
    linkedin_url?: string;
    registration_details?: {
      timezone?: string;
      interests?: string[];
      is_completed?: boolean;
      phone_number?: string;
      primary_goal?: string;
      community_hopes?: string[];
      membership_tier?: string;
      technical_level?: string;
      time_commitment?: string;
      pending_approval?: boolean;
      success_definition?: string;
      working_on_project?: string;
      is_georgia_resident?: boolean;
      project_description?: string;
      onboarding_completed_at?: string;
    };
    created_at: string;
    updated_at: string;
  }> {
    return this.request(`/users/${userId}/profile`, {
      method: "GET",
    }, ADMIN_API_BASE_URL, true);
  }

  // Admin article methods
  async getAdminArticles(): Promise<FrontierArticle[]> {
    return this.request<FrontierArticle[]>("/articles/list", {
      method: "GET",
    }, ADMIN_API_BASE_URL, true);
  }

  async createAdminArticle(data: { content: FrontierArticle["content"]; status?: string }): Promise<FrontierArticle> {
    return this.request<FrontierArticle>("/articles/create", {
      method: "POST",
      body: JSON.stringify(data),
    }, ADMIN_API_BASE_URL, true);
  }

  async updateAdminArticle(data: { article_id: string; content: FrontierArticle["content"]; status?: string }): Promise<FrontierArticle> {
    return this.request<FrontierArticle>("/articles/update", {
      method: "POST",
      body: JSON.stringify(data),
    }, ADMIN_API_BASE_URL, true);
  }

  async deleteAdminArticle(articleId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/articles/delete", {
      method: "POST",
      body: JSON.stringify({ article_id: articleId }),
    }, ADMIN_API_BASE_URL, true);
  }

  // Profile methods
  async getProfile(): Promise<{
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    bio?: string;
    avatar_url?: string;
    location?: string;
    website_url?: string;
    created_at?: string;
    updated_at?: string;
  }> {
    return this.request("/profile/me", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async updateProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Wrap data in profile object as expected by the API
    return this.request<Record<string, unknown>>("/profile/edit", {
      method: "POST",
      body: JSON.stringify({ profile: data }),
    }, APP_API_BASE_URL);
  }

  async uploadImage(file: File): Promise<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append("image", file);

    const headers: HeadersInit = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${APP_API_BASE_URL}/image/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "Upload failed") as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/account/delete", {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  // Public events
  async getPublicEvents(): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    event_type: "virtual" | "in_person" | "hybrid";
    start_time: string;
    end_time?: string;
    location?: string;
    user_rsvp?: {
      rsvp_status: "going" | "not_going" | "maybe" | "waitlist";
      checked_in: boolean;
      rsvp_at: number;
      checked_in_at: number;
    };
    going_count?: number;
    featured_image?: string;
    address?: string;
  }>> {
    return this.request("/events", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async rsvpEvent(eventId: string, rsvpStatus: "going" | "not_going" | "maybe" | "waitlist" = "going"): Promise<{ success: boolean; rsvp: Record<string, unknown> }> {
    return this.request("/events/rsvp", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId, rsvp_status: rsvpStatus }),
    }, APP_API_BASE_URL);
  }

  async getMyRsvps(): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    event_type: "virtual" | "in_person" | "hybrid";
    start_time: string;
    end_time?: string;
    location?: string;
    user_rsvp?: {
      rsvp_status: "going" | "not_going" | "maybe" | "waitlist";
      checked_in: boolean;
      rsvp_at: number;
      checked_in_at: number;
    };
  }>> {
    return this.request("/events/my_rsvps", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async cancelRsvp(eventId: string): Promise<{ success: boolean; message: string }> {
    return this.request("/events/rsvp", {
      method: "DELETE",
      body: JSON.stringify({ event_id: eventId }),
    }, APP_API_BASE_URL);
  }

  // Article methods
  async getLatestArticles(limit: number = 3): Promise<Article[]> {
    return this.request<Article[]>(`/articles/latest?limit=${limit}`, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async getArticles(page: number = 1, perPage: number = 10, tag?: string): Promise<ArticlesListResponse> {
    let url = `/articles/list?page=${page}&per_page=${perPage}`;
    if (tag) {
      url += `&tag=${encodeURIComponent(tag)}`;
    }
    return this.request<ArticlesListResponse>(url, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async getArticle(articleId: string): Promise<Article> {
    return this.request<Article>(`/articles/${articleId}`, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async createArticle(data: CreateArticleInput): Promise<Article> {
    return this.request<Article>("/articles/create", {
      method: "POST",
      body: JSON.stringify(data),
    }, APP_API_BASE_URL);
  }

  async updateArticle(data: UpdateArticleInput): Promise<Article> {
    return this.request<Article>("/articles/update", {
      method: "POST",
      body: JSON.stringify(data),
    }, APP_API_BASE_URL);
  }

  async deleteArticle(articleId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/articles/delete", {
      method: "POST",
      body: JSON.stringify({ article_id: articleId }),
    }, APP_API_BASE_URL);
  }

  async bookmarkArticle(articleId: string, isBookmarked: boolean): Promise<{ success: boolean; article_id: string; is_bookmarked: boolean }> {
    return this.request<{ success: boolean; article_id: string; is_bookmarked: boolean }>("/articles/bookmark", {
      method: "POST",
      body: JSON.stringify({ article_id: articleId, is_bookmarked: isBookmarked }),
    }, APP_API_BASE_URL);
  }

  // GitHub integration methods
  async getGitHubAuthUrl(): Promise<{ url: string }> {
    return this.request<{ url: string }>("/auth/github/url", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async connectGitHub(code: string): Promise<{ success: boolean; github_username: string; message: string }> {
    return this.request<{ success: boolean; github_username: string; message: string }>("/auth/github/connect", {
      method: "POST",
      body: JSON.stringify({ code }),
    }, APP_API_BASE_URL);
  }

  async getGitHubStatus(): Promise<{ connected: boolean; github_username: string | null; connected_at: string | null }> {
    return this.request<{ connected: boolean; github_username: string | null; connected_at: string | null }>("/auth/github/status", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async disconnectGitHub(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/auth/github/disconnect", {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  // Connection methods
  async getConnections(): Promise<{ success: boolean; connections: Connection[] }> {
    return this.request<{ success: boolean; connections: Connection[] }>("/connections/list", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async getConnectionInvitations(): Promise<{ success: boolean; received: any[]; sent: any[] }> {
    return this.request<{ success: boolean; received: any[]; sent: any[] }>("/connections/invitations", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async sendConnectionInvitation(toUserId: string): Promise<{ success: boolean; message: string; invitation_id: string }> {
    return this.request<{ success: boolean; message: string; invitation_id: string }>("/connections/invite", {
      method: "POST",
      body: JSON.stringify({ to_user_id: toUserId }),
    }, APP_API_BASE_URL);
  }

  async acceptConnectionInvitation(invitationId: string): Promise<{ success: boolean; message: string; connection_id: string }> {
    return this.request<{ success: boolean; message: string; connection_id: string }>("/connections/accept", {
      method: "POST",
      body: JSON.stringify({ invitation_id: invitationId }),
    }, APP_API_BASE_URL);
  }

  async declineConnectionInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/connections/decline", {
      method: "POST",
      body: JSON.stringify({ invitation_id: invitationId }),
    }, APP_API_BASE_URL);
  }

  async blockUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/connections/block", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }, APP_API_BASE_URL);
  }

  async unblockUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/connections/unblock", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }, APP_API_BASE_URL);
  }

  async getConnectionStatus(userId: string): Promise<{ success: boolean; status: ConnectionStatus }> {
    return this.request<{ success: boolean; status: ConnectionStatus }>(`/connections/status?user_id=${userId}`, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  // Thread and messaging methods
  async getThreads(): Promise<ThreadsListResponse> {
    return this.request<ThreadsListResponse>("/threads/list", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async getThreadDetails(threadId: string): Promise<{ success: boolean; thread: ThreadDetail }> {
    return this.request<{ success: boolean; thread: ThreadDetail }>(`/threads/${threadId}`, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async getThreadMessages(
    threadId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<MessagesResponse> {
    return this.request<MessagesResponse>(
      `/threads/${threadId}/messages?page=${page}&per_page=${perPage}`,
      {
        method: "GET",
      },
      APP_API_BASE_URL
    );
  }

  async createDirectThread(recipientUserId: string): Promise<{ success: boolean; thread_id: string; message: string }> {
    return this.request<{ success: boolean; thread_id: string; message: string }>("/threads/create-direct", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id: recipientUserId }),
    }, APP_API_BASE_URL);
  }

  async createGroupThread(
    name: string,
    participantUserIds: string[]
  ): Promise<{ success: boolean; thread_id: string; message: string }> {
    return this.request<{ success: boolean; thread_id: string; message: string }>("/threads/create-group", {
      method: "POST",
      body: JSON.stringify({ name, participant_user_ids: participantUserIds }),
    }, APP_API_BASE_URL);
  }

  async sendMessage(
    threadId: string,
    content: string,
    isReply: boolean = false,
    parentMessageId?: string
  ): Promise<{ success: boolean; message_id: string; thread_id: string; created_at: string }> {
    return this.request<{ success: boolean; message_id: string; thread_id: string; created_at: string }>(
      "/messages/send",
      {
        method: "POST",
        body: JSON.stringify({
          thread_id: threadId,
          content,
          is_reply: isReply,
          parent_message_id: parentMessageId,
        }),
      },
      APP_API_BASE_URL
    );
  }

  async markThreadAsRead(threadId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/threads/${threadId}/read`, {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  async pinThread(threadId: string, pinned: boolean): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/threads/${threadId}/pin`, {
      method: "POST",
      body: JSON.stringify({ pinned }),
    }, APP_API_BASE_URL);
  }

  async addThreadParticipant(threadId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/threads/${threadId}/add-participant`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }, APP_API_BASE_URL);
  }

  async removeThreadParticipant(threadId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/threads/${threadId}/remove-participant`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }, APP_API_BASE_URL);
  }

  async leaveThread(threadId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/threads/${threadId}/leave`, {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  // Lobby methods
  async getLobby(): Promise<LobbyResponse> {
    return this.request<LobbyResponse>("/lobby", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async joinLobby(): Promise<LobbyJoinResponse> {
    return this.request<LobbyJoinResponse>("/lobby/join", {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  async leaveLobby(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/lobby/leave", {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  async moveLobby(col: number, row: number): Promise<{ success: boolean; position: { col: number; row: number } }> {
    return this.request<{ success: boolean; position: { col: number; row: number } }>("/lobby/move", {
      method: "POST",
      body: JSON.stringify({ col, row }),
    }, APP_API_BASE_URL);
  }

  async getLobbyLivekitToken(): Promise<LobbyLivekitTokenResponse> {
    return this.request<LobbyLivekitTokenResponse>("/lobby/livekit-token", {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  async getGroupLivekitToken(groupId: string): Promise<GroupLivekitTokenResponse> {
    return this.request<GroupLivekitTokenResponse>(`/groups/${groupId}/livekit-token`, {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  async lobbyAdminAction(action: "mute" | "kick", targetUserId: string, trackType?: "audio" | "video"): Promise<{ success: boolean }> {
    const payload: Record<string, string> = {
      action,
      target_user_id: targetUserId,
    };
    if (trackType) {
      payload.track_type = trackType;
    }
    return this.request<{ success: boolean }>("/lobby/admin-action", {
      method: "POST",
      body: JSON.stringify(payload),
    }, APP_API_BASE_URL);
  }

  // Stripe subscription methods
  async getStripeConfig(): Promise<{ publishable_key: string }> {
    return this.request<{ publishable_key: string }>("/stripe/config", {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  async getRealtimeConfig(): Promise<{ realtime_hash: string }> {
    return this.request<{ realtime_hash: string }>("/realtime/config", {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  async getSubscription(): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>("/stripe/subscription", {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  async createSetupIntent(): Promise<SetupIntentResponse> {
    return this.request<SetupIntentResponse>("/stripe/setup-intent", {
      method: "POST",
    }, STRIPE_API_BASE_URL);
  }

  async subscribe(paymentMethodId: string, tier: "club" | "club_annual" = "club"): Promise<SubscribeResponse> {
    return this.request<SubscribeResponse>("/stripe/subscribe", {
      method: "POST",
      body: JSON.stringify({ payment_method_id: paymentMethodId, tier }),
    }, STRIPE_API_BASE_URL);
  }

  async cancelSubscription(immediate: boolean = false): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/stripe/cancel", {
      method: "POST",
      body: JSON.stringify({ immediate }),
    }, STRIPE_API_BASE_URL);
  }

  async getPortalSession(): Promise<PortalSessionResponse> {
    return this.request<PortalSessionResponse>("/stripe/portal-session", {
      method: "POST",
    }, STRIPE_API_BASE_URL);
  }

  // Google OAuth methods
  async getGoogleAuthUrl(redirectUri?: string): Promise<{ url: string }> {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : "";
    return this.request<{ url: string }>(`/auth/google/url${params}`, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async googleAuth(code: string, redirectUri?: string): Promise<VerifyResponse> {
    let url = `/auth/google?code=${encodeURIComponent(code)}`;
    if (redirectUri) {
      url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
    return this.request<VerifyResponse>(url, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async getFrontierArticles(): Promise<FrontierArticle[]> {
    return this.request<FrontierArticle[]>("/frontier/public", {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  // Public article by slug (no auth required)
  async getPublicArticle(slug: string): Promise<{
    article: FrontierArticle & { slug: string };
    og: {
      title: string;
      description: string;
      image: string;
      url: string;
      type: string;
      site_name: string;
      author: string;
      published_time: number;
      tags: string[];
    };
  }> {
    return this.request(`/article?slug=${encodeURIComponent(slug)}`, {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  // Public group (no auth required)
  async getPublicGroup(slug: string): Promise<{
    group: {
      id: string;
      name: string;
      slug: string;
      type: "group" | "focus_group";
      avatar?: string;
      properties?: Record<string, unknown>;
      participant_count: number;
      created_by_profile?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
      };
      created_at?: string;
    };
    og: {
      title: string;
      description: string;
      image: string;
      url: string;
      type: string;
      site_name: string;
    };
  }> {
    return this.request(`/group?slug=${encodeURIComponent(slug)}`, {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  // Public profile (no auth required)
  async getPublicProfile(username: string): Promise<{
    profile: {
      id: string;
      username: string;
      display_name: string;
      first_name?: string;
      last_name?: string;
      bio?: string;
      avatar_url?: string;
      location?: string;
      website_url?: string;
      linkedin_url?: string;
      created_at?: string;
    };
    og: {
      title: string;
      description: string;
      image: string;
      url: string;
      type: string;
      site_name: string;
    };
  }> {
    return this.request(`/profile?username=${encodeURIComponent(username)}`, {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  // Invitation methods

  // Resolve invite by token (public)
  async getInvite(token: string): Promise<{
    invite: {
      id: string;
      type: "group_join" | "event_rsvp" | "user_connect" | "platform";
      token: string;
      expires_at?: string;
      created_at: string;
    };
    inviter: {
      id: string;
      display_name: string;
      avatar_url?: string;
      username: string;
    } | null;
    target: {
      id: string;
      name?: string;
      title?: string;
      display_name?: string;
      username?: string;
      avatar?: string;
      avatar_url?: string;
      participant_count?: number;
      going_count?: number;
      start_time?: string;
      end_time?: string;
      location?: string;
      featured_image?: string;
      description?: string;
      bio?: string;
      properties?: Record<string, unknown>;
      type?: string;
    } | null;
  }> {
    return this.request(`/invite?token=${encodeURIComponent(token)}`, {
      method: "GET",
    }, STRIPE_API_BASE_URL);
  }

  // Create an invite link (auth required)
  async createInvite(
    type: "group_join" | "event_rsvp" | "user_connect" | "platform",
    referenceId?: string,
    expiresInDays: number = 7
  ): Promise<{
    invite: {
      id: string;
      token: string;
      type: string;
      expires_at: string;
    };
    link: string;
  }> {
    return this.request("/invites/create", {
      method: "POST",
      body: JSON.stringify({
        type,
        reference_id: referenceId || "",
        expires_in_days: expiresInDays,
      }),
    }, APP_API_BASE_URL);
  }

  // Claim an invite (auth required)
  async claimInvite(token: string): Promise<{
    success: boolean;
    type: "group_join" | "event_rsvp" | "user_connect" | "platform";
    redirect_to: string;
  }> {
    return this.request("/invites/claim", {
      method: "POST",
      body: JSON.stringify({ token }),
    }, APP_API_BASE_URL);
  }

  // Join a public group by slug (auth required)
  async joinPublicGroup(slug: string): Promise<{
    success: boolean;
    thread_id: string;
  }> {
    return this.request(`/groups/${encodeURIComponent(slug)}/join`, {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  // RSVP to a public event by ID (auth required)
  async rsvpPublicEvent(eventId: string): Promise<{
    success: boolean;
    event_id: string;
    rsvp_id: string;
  }> {
    return this.request(`/events/${encodeURIComponent(eventId)}/public-rsvp`, {
      method: "POST",
    }, APP_API_BASE_URL);
  }
}

export const api = new ApiClient();
