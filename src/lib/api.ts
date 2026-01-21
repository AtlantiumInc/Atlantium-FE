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
} from "./types";

const AUTH_API_BASE_URL = "https://cloud.atlantium.ai/api:o01duYuZ";
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
  avatar?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  _subscription?: UserSubscription;
  _integrations?: UserIntegrations;
  _settings?: UserSettings;
}

export interface FrontierArticle {
  id: string;
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
  created_at: number;
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

  async verifyOtp(email: string, code: string): Promise<VerifyResponse> {
    return this.request<VerifyResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
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
    return this.request<Record<string, unknown>>("/profile/edit", {
      method: "POST",
      body: JSON.stringify(data),
    }, APP_API_BASE_URL);
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

  // Stripe subscription methods
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

  async subscribe(paymentMethodId: string): Promise<SubscribeResponse> {
    return this.request<SubscribeResponse>("/stripe/subscribe", {
      method: "POST",
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
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

  async getFrontierArticles(): Promise<FrontierArticle[]> {
    return this.request<FrontierArticle[]>("/thread/frontier", {
      method: "GET",
    }, APP_API_BASE_URL);
  }
}

export const api = new ApiClient();
