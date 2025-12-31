import type { Article, ArticlesListResponse, CreateArticleInput, UpdateArticleInput } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const APP_API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL;

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
  user: {
    id: string;
    email: string;
    is_email_verified: boolean;
  };
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
  created_at: string;
  avatar?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
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
    baseUrl: string = API_BASE_URL,
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
    });
  }

  async verifyOtp(email: string, code: string): Promise<VerifyResponse> {
    return this.request<VerifyResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me", {
      method: "GET",
    });
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", {
      method: "POST",
    });
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
    event_type: "virtual" | "in_person";
    start_time: string;
    end_time?: string;
    location?: string;
  }>> {
    return this.request("/events/list", {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  async rsvpEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    return this.request("/events/rsvp", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId }),
    }, APP_API_BASE_URL);
  }

  async getMyRsvps(): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    event_type: "virtual" | "in_person";
    start_time: string;
    end_time?: string;
    location?: string;
  }>> {
    return this.request("/events/my-rsvps", {
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
}

export const api = new ApiClient();
