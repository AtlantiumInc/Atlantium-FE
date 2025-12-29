import type { Article, ArticlesListResponse, CreateArticleInput, UpdateArticleInput } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const APP_API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    baseUrl: string = API_BASE_URL
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.authToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "An error occurred");
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
  async adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
    return this.request<AdminLoginResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, APP_API_BASE_URL);
  }

  // Profile methods
  async updateProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/profile/edit", {
      method: "POST",
      body: JSON.stringify(data),
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
}

export const api = new ApiClient();
