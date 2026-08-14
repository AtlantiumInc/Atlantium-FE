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
  PurchaseTrainingResponse,
  ActivateTrainingResponse,
  UserSubscription,
  UserIntegrations,
  UserSettings,
  LobbyResponse,
  LobbyMessagesResponse,
  LobbyMessageResponse,
  LobbyLivekitTokenResponse,
  GroupLivekitTokenResponse,
} from "./types";
import { publicRuntimeUrl } from "./runtimeEnv";

const ATLANTIUM_API_BASE_URL = publicRuntimeUrl(
  import.meta.env.VITE_ATLANTIUM_API_BASE as string | undefined,
  "https://api.atlantium.ai/v1"
).replace(/\/+$/, "");
const AUTH_API_BASE_URL = ATLANTIUM_API_BASE_URL;
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

export interface DevOtpResponse {
  code: string | null;
}

export interface VerifyResponse {
  success: boolean;
  auth_token: string | null;
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
  is_approved?: boolean;
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

/** A live/paused campaign link for one partner, additive on Boomin's standing
 *  response (deployment = channel; the partner rides the link + the event). */
export interface CreatorDeployment {
  id: string;
  status?: string;
  observed_status?: string;
  channel?: string;
  format?: string;
  distribution?: {
    id?: string;
    name?: string;
    objective?: string;
    status?: string;
  } | null;
  link?: {
    code?: string;
    url?: string;
    status?: string;
  } | null;
  performance?: {
    events?: number;
    value_minor?: number;
  } | null;
}

export interface CreatorStandingPartner {
  partner?: {
    id: string;
    email?: string | null;
    name?: string | null;
  } | null;
  externalIdentity?: {
    externalUserId?: string;
    email?: string | null;
    name?: string | null;
  } | null;
  member: {
    id: string;
    approvalStatus?: "pending" | "approved" | "rejected";
    approval_status?: "pending" | "approved" | "rejected";
    qualificationStatus?: "pending" | "qualified" | "not_qualified" | "grace";
    qualification_status?: "pending" | "qualified" | "not_qualified" | "grace";
    referralCode?: string;
    referral_code?: string;
    connectionStatus?: string;
    connection_status?: string;
    joinedAt?: string;
    joined_at?: string;
    lastEvaluatedAt?: string | null;
    last_evaluated_at?: string | null;
  };
  status?: string;
  referralCode?: string;
  referralLink?: string;
  referral?: {
    code?: string;
    url?: string;
    active?: boolean;
  };
  metrics?: {
    linkClicks?: number;
    signups?: number;
    sales?: number;
    gmvCents?: number;
    productUsage?: number;
  };
  approvalStatus?: string;
  qualificationStatus?: string;
  missingChannels?: string[];
  channelStatus?: Record<string, unknown>;
  instagram?: {
    username?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    followerCount?: number | null;
    follower_count?: number | null;
  } | null;
  partnerConnection?: {
    status?: string;
    connectedAt?: string | null;
    connected_at?: string | null;
    lastSyncAt?: string | null;
    last_sync_at?: string | null;
  } | null;
  tier?: {
    name?: string;
    rank?: number;
  } | null;
  qualification?: {
    status?: string;
    score?: number;
    requirementsMet?: string[];
    requirementsFailed?: string[];
    requirements_met?: string[];
    requirements_failed?: string[];
    evaluatedAt?: string;
    evaluated_at?: string;
  } | null;
  rollups?: Array<{
    metricKey?: string;
    metric_key?: string;
    total?: number;
    count?: number;
  }>;
  deployments?: CreatorDeployment[];
}

export interface CreatorDashboardResponse {
  success: boolean;
  programId?: string;
  brandId?: string;
  requiredChannels?: string[];
  partners: CreatorStandingPartner[];
  totals?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    qualified: number;
    grace: number;
    notQualified: number;
    connected: number;
  };
}

export interface JobPostingContent {
  requirements_summary?: string;
  tech_stack?: string[];
  yoe?: number | null;
  commitment?: string | string[];
  company_size?: number | null;
  company_website?: string;
  security_clearance?: string;
  visa_sponsorship?: boolean;
}

export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  workplace_type?: string;
  seniority?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  apply_url: string | null;
  apply_gated?: boolean;
  status: string;
  posted_at?: string | null;
  content?: JobPostingContent;
  review?: {
    verified_at: string | null;
    status: string | null;
    degree_required: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ContentCollection {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  sort_order: number;
  published_count: number;
}

export interface ContentDocumentSummary {
  id: string;
  type: "doc" | "post";
  format: "article" | "guide" | "reference" | "document";
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  tags: string[];
  collection_slug?: string | null;
  author?: { profile_id: string; display_name: string; avatar_url?: string | null } | null;
  meta?: {
    tldr?: string[];
    read_time?: number;
    sources?: string[];
    guide?: { steps?: number; difficulty?: string; time_to_complete?: string; presentation?: string; cover_portrait?: string };
  };
  published_at?: string | null;
  updated_at: string;
}

export interface ContentDocumentDetail extends ContentDocumentSummary {
  body_md: string;
  gated: boolean;
  gate_reason: "signup_required" | null;
}

export interface ContentComment {
  id: string;
  body: string;
  deleted: boolean;
  parent_message_id?: string | null;
  author?: { profile_id: string; display_name: string; avatar_url?: string | null } | null;
  created_at: string;
}

export interface AdminContentDocument extends ContentDocumentSummary {
  status: "draft" | "published" | "archived";
  gate: "public" | "preview" | "member";
  collection_id?: string | null;
  body_md: string;
}

export interface DirectoryEntry {
  id: string;
  kind: "grant" | "resource" | "company" | "person" | "investor";
  slug: string;
  name: string;
  summary?: string | null;
  website?: string | null;
  location?: string | null;
  tags: string[];
  status: string;
  attributes?: Record<string, unknown>;
  verified_at?: string | null;
  contact_state: "none" | "hidden" | "revealable" | "revealed" | "upgrade_required";
  updated_at: string;
  grant?: {
    funder?: string | null;
    amount_min?: number | null;
    amount_max?: number | null;
    deadline_date?: string | null;
    deadline_at?: string | null;
    closes_at?: string | null;
    days_until_close?: number | null;
    recurring: boolean;
    eligibility: string[];
    application_url?: string | null;
  };
  resource?: {
    category: string;
    eligibility: string[];
    application_url?: string | null;
  };
}

export type ContactState = "none" | "hidden" | "revealable" | "revealed" | "upgrade_required";

export interface DirectoryContact {
  id: string;
  contact_type: string;
  value: string | null;
  label?: string | null;
  verified_at?: string | null;
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

export type MemberRole = {
  id: string;
  role: "professional" | "founder" | "investor" | "advisor";
  title: string | null;
  is_primary: boolean;
  source: "self_declared" | "inferred" | "admin_assigned";
  /** False for a persona Atlantium guessed — grants nothing until affirmed. */
  confirmed: boolean;
  org: { id: string; name: string; slug: string; kind: string } | null;
  professional: {
    seeking: "not_seeking" | "open" | "actively_looking";
    visibility: "private" | "matched_only" | "verified_employers" | "all_members";
    seeking_updated_at: string | null;
    target_titles: string[];
    seniority: string | null;
    stack: string[];
    min_salary: number | null;
    remote_pref: string | null;
  } | null;
};

export type OutreachStatus = {
  mayInitiate: boolean;
  unlimited: boolean;
  penalised: boolean;
  pendingUsed: number;
  monthlyUsed: number;
  pendingLimit: number | null;
  monthlyLimit: number | null;
};

export type MemberConnection = {
  id: string;
  status: "pending" | "accepted" | "declined" | "removed";
  source: "direct" | "atlantium_intro" | "member_intro";
  direction: "incoming" | "outgoing";
  other_profile_id: string;
  message: string | null;
  created_at: string;
  accepted_at: string | null;
};

export type DmRequestSummary = {
  id: string;
  purpose: string;
  body: string;
  created_at: string;
};

export type MemberCard = {
  profile_id: string;
  display_name: string;
  slug: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  links: { website: string | null; linkedin: string | null; github: string | null };
  roles: Array<{
    id: string;
    role: "professional" | "founder" | "investor" | "advisor";
    title: string | null;
    is_primary: boolean;
    org: { id: string; name: string; slug: string } | null;
  }>;
  employers: Array<{ id: string; name: string; slug: string; relationship: string }>;
  verifications: string[];
  connection: { id: string; status: string; direction: "incoming" | "outgoing" } | null;
  is_self: boolean;
};

export type MemberSearchResult = {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  roles: Array<{ role: string; title: string | null; org: string | null }>;
};

export type Introduction = {
  id: string;
  direction: "incoming" | "outgoing";
  status: "pending_review" | "rejected" | "awaiting_target" | "accepted" | "declined" | "withdrawn" | "expired";
  reason: string;
  other_name: string;
  other_profile_id: string;
  created_at: string;
};

export type IntroductionReview = {
  id: string;
  reason: string;
  requester: { profile_id: string; name: string };
  target: { profile_id: string; name: string };
  created_at: string;
};

export type DmAccepts = "members" | "verified" | "introductions_only" | "nobody";

export type ThreadMessage = {
  id: string;
  body: string;
  mine: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  other_profile_id: string | null;
  other_name: string;
  last_message: { body: string; created_at: string; mine: boolean } | null;
  updated_at: string;
};

export type BillingStatus = {
  tier: "free" | "club" | "club_annual";
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_billing_account: boolean;
  entitlements: string[];
};

class ApiClient {
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token && token !== "cookie" ? token : null;
    localStorage.removeItem("auth_token");
  }

  getAuthToken() {
    return this.authToken;
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

    const usesCookieAuth = baseUrl === ATLANTIUM_API_BASE_URL;
    const token = useAdminToken ? this.authToken : usesCookieAuth ? null : this.authToken;
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: usesCookieAuth ? "include" : options.credentials,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(data.message || "An error occurred") as Error & {
        status?: number;
        code?: string;
      };
      error.status = response.status;
      error.code = data?.code ?? data?.error ?? undefined;
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

  async getDevOtpCode(email: string): Promise<DevOtpResponse> {
    return this.request<DevOtpResponse>(`/auth/dev-code?email=${encodeURIComponent(email)}`, {
      method: "GET",
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

  async getCreatorDashboard(): Promise<CreatorDashboardResponse> {
    return this.request<CreatorDashboardResponse>("/admin/partnerships/creators", {
      method: "GET",
    }, AUTH_API_BASE_URL);
  }

  /** Member-scoped partner standing: only the caller's own enrollment row,
   *  including their evergreen referral link and live campaign deployments. */
  async getMyPartnerStanding(): Promise<CreatorDashboardResponse> {
    return this.request<CreatorDashboardResponse>("/dashboard/creators", {
      method: "GET",
    }, AUTH_API_BASE_URL);
  }

  async recordCreatorDashboardTestClick(): Promise<CreatorDashboardResponse> {
    return this.request<CreatorDashboardResponse>("/admin/partnerships/creators/test-click", {
      method: "POST",
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
    return this.requestOtp(email);
  }

  async adminVerifyOtp(email: string, code: string): Promise<AdminLoginResponse> {
    const response = await this.verifyOtp(email, code);
    if (!response.user.is_admin) {
      throw new Error("Admin access required.");
    }
    return {
      success: response.success,
      auth_token: response.auth_token ?? "cookie",
      user: {
        id: response.user.id,
        email: response.user.email,
      },
    };
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
    full_name?: string;
    is_admin: boolean;
    is_email_verified: boolean;
    has_access: boolean;
    onboarding_completed: boolean;
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

  async sendUserEmail(userId: string, subject: string, htmlBody: string): Promise<{ success: boolean }> {
    return this.request("/users/send-email", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, subject, html_body: htmlBody }),
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

  // ── Worker-backed approval queue (api.atlantium.ai, cookie-authed) ──
  // ── P1: network loop ──────────────────────────────────────────────────────

  async getOutreachStatus(): Promise<OutreachStatus> {
    return this.request("/me/outreach", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getMember(profileId: string): Promise<{ member: MemberCard }> {
    return this.request(`/members/${profileId}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  /** Lab connections (P1). Distinct from the legacy getConnections() above. */
  async getMyConnections(): Promise<{ connections: MemberConnection[] }> {
    return this.request("/me/connections", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async requestConnection(body: { profile_id: string; message?: string; acting_role_id?: string; purpose?: string }) {
    return this.request<{ connection: MemberConnection; mutual: boolean }>(
      "/connections/requests", { method: "POST", body: JSON.stringify(body) }, ATLANTIUM_API_BASE_URL);
  }

  async decideConnection(id: string, accept: boolean) {
    return this.request<{ connection: MemberConnection }>(
      `/connections/requests/${id}/decide`, { method: "POST", body: JSON.stringify({ accept }) }, ATLANTIUM_API_BASE_URL);
  }

  async removeConnection(id: string) {
    return this.request<{ success: boolean }>(`/connections/${id}`, { method: "DELETE" }, ATLANTIUM_API_BASE_URL);
  }

  async blockMember(profileId: string, reason?: string) {
    return this.request<{ success: boolean }>("/blocks",
      { method: "POST", body: JSON.stringify({ profile_id: profileId, reason }) }, ATLANTIUM_API_BASE_URL);
  }

  async getDmRequests(): Promise<{ requests: DmRequestSummary[] }> {
    return this.request("/dm/requests", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async sendDmRequest(body: { profile_id: string; body: string; purpose: string; acting_role_id?: string }) {
    return this.request<{ direct: boolean; request_id?: string; thread_id?: string }>(
      "/dm/requests", { method: "POST", body: JSON.stringify(body) }, ATLANTIUM_API_BASE_URL);
  }

  async decideDmRequest(id: string, accept: boolean) {
    return this.request<{ accepted: boolean; thread_id?: string }>(
      `/dm/requests/${id}/decide`, { method: "POST", body: JSON.stringify({ accept }) }, ATLANTIUM_API_BASE_URL);
  }

  // ── P1: conversations ─────────────────────────────────────────────────────

  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request("/threads", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getConversation(id: string): Promise<{
    conversation: { id: string; other_profile_id: string | null; other_name: string };
    messages: ThreadMessage[];
  }> {
    return this.request(`/threads/${id}/messages`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  /** Lab DM reply. Distinct from the legacy Xano-era sendMessage(). */
  async sendThreadMessage(id: string, body: string): Promise<{ message: ThreadMessage }> {
    return this.request(`/threads/${id}/messages`,
      { method: "POST", body: JSON.stringify({ body }) }, ATLANTIUM_API_BASE_URL);
  }

  async getDmPolicy(): Promise<{ accepts: DmAccepts }> {
    return this.request("/me/dm-policy", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async setDmPolicy(accepts: DmAccepts): Promise<{ accepts: DmAccepts }> {
    return this.request("/me/dm-policy",
      { method: "PATCH", body: JSON.stringify({ accepts }) }, ATLANTIUM_API_BASE_URL);
  }

  // ── P1 S5/S6: introductions + discovery ───────────────────────────────────

  async searchMembers(params: { q?: string; role?: string; limit?: number } = {}): Promise<{ members: MemberSearchResult[] }> {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.role) qs.set("role", params.role);
    if (params.limit) qs.set("limit", String(params.limit));
    return this.request(`/members/search?${qs}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async requestIntroduction(profileId: string, reason: string): Promise<{ introduction: Introduction }> {
    return this.request("/introductions/requests",
      { method: "POST", body: JSON.stringify({ profile_id: profileId, reason }) }, ATLANTIUM_API_BASE_URL);
  }

  async getIntroductions(): Promise<{ introductions: Introduction[] }> {
    return this.request("/me/introductions", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async respondToIntroduction(id: string, accept: boolean): Promise<{ accepted: boolean; connection_id: string | null }> {
    return this.request(`/introductions/${id}/respond`,
      { method: "POST", body: JSON.stringify({ accept }) }, ATLANTIUM_API_BASE_URL);
  }

  async getIntroductionQueue(): Promise<{ introductions: IntroductionReview[] }> {
    return this.request("/admin/introductions", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async decideIntroduction(id: string, approve: boolean, note?: string) {
    return this.request<{ status: string }>(`/admin/introductions/${id}/decide`,
      { method: "POST", body: JSON.stringify({ approve, note }) }, ATLANTIUM_API_BASE_URL);
  }

  async setIntroductionOutcome(id: string, outcome: string, note?: string) {
    return this.request<{ outcome: string }>(`/admin/introductions/${id}/outcome`,
      { method: "POST", body: JSON.stringify({ outcome, note }) }, ATLANTIUM_API_BASE_URL);
  }

  async getIntroductionFunnel(): Promise<{
    requested: number;
    by_status: Record<string, number>;
    connections_from_intros: number;
    outcomes: Record<string, number>;
  }> {
    return this.request("/admin/introductions/funnel", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  // ── Org claims ────────────────────────────────────────────────────────────

  async getMyOrgRequests(): Promise<{
    requests: Array<{
      id: string; kind: "claim" | "create"; status: string; relationship: string;
      org_name: string; decision_note: string | null; created_at: string;
    }>;
    memberships: Array<{
      id: string; org: { id: string; name: string; slug: string };
      relationship: string; authority: string;
    }>;
  }> {
    return this.request("/me/org-requests", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async requestOrgClaim(input: {
    entry_id?: string; proposed_name?: string; proposed_website?: string;
    relationship?: string; evidence?: string;
  }): Promise<{ request: { id: string; status: string; kind: string } }> {
    return this.request("/org-requests", { method: "POST", body: JSON.stringify(input) }, ATLANTIUM_API_BASE_URL);
  }

  async getOrgRequestQueue(): Promise<{
    requests: Array<{
      id: string; kind: "claim" | "create"; relationship: string; evidence: string | null;
      member: { profile_id: string; name: string };
      org: { id: string; name: string; slug: string } | null;
      proposed: { name?: string; website?: string };
      created_at: string;
    }>;
  }> {
    return this.request("/admin/org-requests", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async decideOrgRequest(id: string, approve: boolean, authority = "admin", note?: string) {
    return this.request<{ status: string }>(`/admin/org-requests/${id}/decide`,
      { method: "POST", body: JSON.stringify({ approve, authority, note }) }, ATLANTIUM_API_BASE_URL);
  }

  // ── P1b: billing ──────────────────────────────────────────────────────────

  async getBillingConfig(): Promise<{
    publishable_key: string | null;
    monthly_price: number;
    annual_price: number;
    currency: string;
  }> {
    return this.request("/billing/config", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  /** Lab billing. Distinct from the legacy Xano-era createSetupIntent(). */
  async createBillingSetupIntent(): Promise<{ client_secret: string }> {
    return this.request("/billing/setup-intent", { method: "POST" }, ATLANTIUM_API_BASE_URL);
  }

  async subscribeWithPaymentMethod(plan: "club" | "club_annual", paymentMethodId: string): Promise<{
    subscription_id: string;
    status: string;
    active: boolean;
  }> {
    return this.request("/billing/subscribe",
      { method: "POST", body: JSON.stringify({ plan, payment_method_id: paymentMethodId }) },
      ATLANTIUM_API_BASE_URL);
  }

  async getBillingStatus(): Promise<BillingStatus> {
    return this.request("/billing/status", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async startCheckout(plan: "club" | "club_annual"): Promise<{ checkout_url: string }> {
    return this.request("/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) }, ATLANTIUM_API_BASE_URL);
  }

  async openBillingPortal(): Promise<{ portal_url: string }> {
    return this.request("/billing/portal", { method: "POST" }, ATLANTIUM_API_BASE_URL);
  }

  async getMemberRoles(): Promise<{ roles: MemberRole[] }> {
    return this.request("/me/roles", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async createMemberRole(body: {
    role: "professional" | "founder" | "investor" | "advisor";
    entry_id?: string | null;
    title?: string | null;
    is_primary?: boolean;
  }): Promise<{ roles: MemberRole[] }> {
    return this.request("/me/roles", { method: "POST", body: JSON.stringify(body) }, ATLANTIUM_API_BASE_URL);
  }

  /**
   * The founder / investor / advisor / recruiter branch answers. The server
   * rejects fields that don't belong to the role rather than storing them.
   */
  async updateRoleDetails(roleId: string, body: {
    venture_stage?: string;
    needs?: string[];
    check_min?: number;
    check_max?: number;
    focus_stages?: string[];
    intro_appetite?: "none" | "some" | "all";
    domains?: string[];
    engagement?: string[];
    availability?: "open" | "intro_only" | "closed";
    hiring_roles?: string[];
    hiring_contact?: string;
  }): Promise<{ roles: MemberRole[] }> {
    return this.request(`/me/roles/${roleId}/details`, { method: "PATCH", body: JSON.stringify(body) }, ATLANTIUM_API_BASE_URL);
  }

  async updateSeeking(roleId: string, body: {
    seeking?: "not_seeking" | "open" | "actively_looking";
    visibility?: "private" | "matched_only" | "verified_employers" | "all_members";
    stack?: string[];
    seniority?: string | null;
  }): Promise<{ roles: MemberRole[] }> {
    return this.request(`/me/roles/${roleId}/seeking`, { method: "PATCH", body: JSON.stringify(body) }, ATLANTIUM_API_BASE_URL);
  }

  async resetUserOnboarding(userId: string): Promise<{ success: boolean; profiles_reset: number }> {
    return this.request(`/admin/users/${userId}/reset-onboarding`, { method: "POST" }, AUTH_API_BASE_URL);
  }

  async deleteUserAccount(userId: string): Promise<{ success: boolean; deleted_email: string }> {
    return this.request(`/admin/users/${userId}/delete`, { method: "POST" }, AUTH_API_BASE_URL);
  }

  async getApprovalUsers(): Promise<Array<{
    id: string;
    email: string;
    display_name: string;
    is_admin: boolean;
    is_approved: boolean;
    is_email_verified: boolean;
    onboarding_completed: boolean;
    membership_tier: string | null;
    headline: string | null;
    roles: Array<{
      role: string;
      title: string | null;
      is_primary: boolean;
      org: { name: string; slug: string } | null;
      seeking: { status: string; visibility: string } | null;
      details: {
        venture_stage: string | null;
        needs: string[];
        check_min: number | null;
        check_max: number | null;
        focus_stages: string[];
        intro_appetite: string;
        domains: string[];
        engagement: string[];
        availability: string;
        hiring_roles: string[];
        hiring_contact: string | null;
      } | null;
    }>;
    pending_claims: Array<{ kind: string; relationship: string; org: string | null }>;
    registration_details: Record<string, unknown>;
    created_at: string;
  }>> {
    return this.request("/admin/users", { method: "GET" }, AUTH_API_BASE_URL);
  }

  async approveUser(userId: string): Promise<{ success: boolean; is_approved: boolean }> {
    return this.request(`/admin/users/${userId}/approve`, { method: "POST" }, AUTH_API_BASE_URL);
  }

  async revokeApproval(userId: string): Promise<{ success: boolean; is_approved: boolean }> {
    return this.request(`/admin/users/${userId}/revoke`, { method: "POST" }, AUTH_API_BASE_URL);
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
    }, AUTH_API_BASE_URL);
  }

  async updateProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Wrap data in profile object as expected by the API
    return this.request<Record<string, unknown>>("/profile/edit", {
      method: "POST",
      body: JSON.stringify({ profile: data }),
    }, AUTH_API_BASE_URL);
  }

  async uploadImage(file: File): Promise<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    // Upload to Atlantium's own R2 bucket via the worker (cookie-authed).
    const response = await fetch(`${ATLANTIUM_API_BASE_URL}/upload`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
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

  // Member directory methods
  async getMemberDirectory(query?: string): Promise<{ success: boolean; members: Array<{ user_id: string; username: string; display_name: string; avatar_url: string; bio: string; location: string }>; tier: string }> {
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    return this.request(`/members/directory${params}`, {
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
    }, AUTH_API_BASE_URL);
  }

  async getLobbyRoomMessages(roomId: string, limit: number = 50): Promise<LobbyMessagesResponse> {
    return this.request<LobbyMessagesResponse>(
      `/lobby/rooms/${encodeURIComponent(roomId)}/messages?limit=${limit}`,
      { method: "GET" },
      AUTH_API_BASE_URL
    );
  }

  async sendLobbyMessage(roomId: string, content: string): Promise<LobbyMessageResponse> {
    return this.request<LobbyMessageResponse>(
      `/lobby/rooms/${encodeURIComponent(roomId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
      AUTH_API_BASE_URL
    );
  }

  async getLobbyEventLivekitToken(eventId: string): Promise<LobbyLivekitTokenResponse> {
    return this.request<LobbyLivekitTokenResponse>(
      `/lobby/events/${encodeURIComponent(eventId)}/livekit-token`,
      { method: "POST" },
      AUTH_API_BASE_URL
    );
  }

  async getLobbyRoomLivekitToken(roomId: string): Promise<LobbyLivekitTokenResponse> {
    return this.request<LobbyLivekitTokenResponse>(
      `/lobby/rooms/${encodeURIComponent(roomId)}/livekit-token`,
      { method: "POST" },
      AUTH_API_BASE_URL
    );
  }

  async getGroupLivekitToken(groupId: string): Promise<GroupLivekitTokenResponse> {
    return this.request<GroupLivekitTokenResponse>(`/groups/${groupId}/livekit-token`, {
      method: "POST",
    }, APP_API_BASE_URL);
  }

  async lobbyModeratorAction(
    eventId: string,
    action: "mute-all" | "mute-user" | "remove-user" | "spotlight",
    payload: Record<string, unknown> = {}
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/lobby/events/${encodeURIComponent(eventId)}/mod/${action}`,
      {
        method: "POST",
        body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
      },
      AUTH_API_BASE_URL
    );
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
    }, AUTH_API_BASE_URL);
  }

  async getSubscription(): Promise<SubscriptionResponse> {
    return this.request<SubscriptionResponse>("/subscription", {
      method: "GET",
    }, AUTH_API_BASE_URL);
  }

  async createSetupIntent(): Promise<SetupIntentResponse> {
    return this.request<SetupIntentResponse>("/stripe/setup-intent", {
      method: "POST",
    }, STRIPE_API_BASE_URL);
  }

  /**
   * Legacy signature, live implementation: PaymentForm still calls this, but
   * the Xano endpoint behind it is gone. Routed to the worker so those surfaces
   * stop failing with "Unauthorized — Authentication Required".
   */
  async subscribe(paymentMethodId: string, tier: "club" | "club_annual" = "club"): Promise<SubscribeResponse> {
    const result = await this.subscribeWithPaymentMethod(tier, paymentMethodId);
    return {
      success: true,
      subscription: { id: result.subscription_id, status: result.status, current_period_end: "" },
      // The worker attaches the card before subscribing, so there is no
      // separate 3DS step to hand back here.
      requires_action: false,
      client_secret: null,
    };
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

  async purchaseTraining(paymentMethodId: string): Promise<PurchaseTrainingResponse> {
    return this.request<PurchaseTrainingResponse>("/stripe/purchase-training", {
      method: "POST",
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    }, STRIPE_API_BASE_URL);
  }

  async activateTraining(paymentIntentId: string): Promise<ActivateTrainingResponse> {
    return this.request<ActivateTrainingResponse>("/stripe/activate-training", {
      method: "POST",
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    }, STRIPE_API_BASE_URL);
  }

  async dollarTest(paymentMethodId: string): Promise<{ success: boolean; requires_action: boolean; client_secret: string | null }> {
    return this.request<{ success: boolean; requires_action: boolean; client_secret: string | null }>("/stripe/dollar-test", {
      method: "POST",
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    }, STRIPE_API_BASE_URL);
  }

  // Google OAuth methods
  async getGoogleAuthUrl(redirectUri?: string): Promise<{ url: string }> {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : "";
    return this.request<{ url: string }>(`/auth/google/url${params}`, {
      method: "GET",
    }, APP_API_BASE_URL);
  }

  /**
   * Start the better-auth Google OAuth flow. Returns the Google consent URL;
   * the caller redirects there. After consent, better-auth sets the session
   * cookie and redirects back to callbackURL.
   */
  async googleSignInStart(callbackURL: string): Promise<{ url: string }> {
    const authOrigin = ATLANTIUM_API_BASE_URL.replace(/\/v1\/?$/, "");
    const response = await fetch(`${authOrigin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        provider: "google",
        callbackURL,
        errorCallbackURL: callbackURL,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? "Google sign-in is unavailable right now.");
    }
    return response.json();
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

  // Job posting methods
  async getJobPostings(filters?: { status?: string; workplace_type?: string; seniority?: string }): Promise<JobPosting[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.workplace_type) params.set("workplace_type", filters.workplace_type);
    if (filters?.seniority) params.set("seniority", filters.seniority);
    const qs = params.toString();
    return this.request<JobPosting[]>(`/job_postings${qs ? `?${qs}` : ""}`, {
      method: "GET",
    }, ATLANTIUM_API_BASE_URL);
  }

  async getJobPostingsPaged(params?: {
    status?: string;
    workplace_type?: string;
    seniority?: string;
    q?: string;
    no_degree?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    jobs: JobPosting[];
    total: number;
    counts: { remote: number; hybrid: number; new_this_week: number; new_48h?: number; no_degree: number };
    limit: number;
    offset: number;
  }> {
    const search = new URLSearchParams({ format: "paged" });
    if (params?.status) search.set("status", params.status);
    if (params?.workplace_type) search.set("workplace_type", params.workplace_type);
    if (params?.seniority) search.set("seniority", params.seniority);
    if (params?.q) search.set("q", params.q);
    if (params?.no_degree) search.set("no_degree", "1");
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset) search.set("offset", String(params.offset));
    return this.request(`/job_postings?${search}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async runReviewCycle(): Promise<Record<string, unknown>> {
    return this.request("/admin/review/run", { method: "POST" }, ATLANTIUM_API_BASE_URL);
  }

  // ── Content platform ──────────────────────────────────────────────

  async getContentCollections(): Promise<{ collections: ContentCollection[] }> {
    return this.request("/content/collections", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getContentDocuments(params?: {
    type?: "doc" | "post";
    format?: string;
    collection?: string;
    tag?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ documents: ContentDocumentSummary[]; total: number; limit: number; offset: number }> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
    }
    return this.request(`/content/documents?${search}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getContentDocument(type: "doc" | "post", slug: string): Promise<{
    document: ContentDocumentDetail;
    json_ld: Record<string, unknown>;
  }> {
    return this.request(`/content/documents/${type}/${slug}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getComments(subjectType: string, subjectId: string): Promise<{ messages: ContentComment[]; total: number }> {
    return this.request(`/threads/${subjectType}/${subjectId}/messages`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async postComment(subjectType: string, subjectId: string, body: string, parentMessageId?: string): Promise<{ message: ContentComment }> {
    return this.request(`/threads/${subjectType}/${subjectId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body, parent_message_id: parentMessageId }),
    }, ATLANTIUM_API_BASE_URL);
  }

  async deleteComment(messageId: string): Promise<{ success: boolean }> {
    return this.request(`/thread_messages/${messageId}`, { method: "DELETE" }, ATLANTIUM_API_BASE_URL);
  }

  async trackEvent(event: string, props?: Record<string, unknown>): Promise<void> {
    try {
      let anonId = localStorage.getItem("atl_anon_id");
      if (!anonId) {
        anonId = crypto.randomUUID();
        localStorage.setItem("atl_anon_id", anonId);
      }
      await this.request("/events", {
        method: "POST",
        body: JSON.stringify({ event, anon_id: anonId, props: props ?? {} }),
      }, ATLANTIUM_API_BASE_URL);
    } catch {
      // analytics must never break the product
    }
  }

  async adminListContentDocuments(): Promise<{ documents: AdminContentDocument[] }> {
    return this.request("/admin/content/documents", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async adminCreateContentDocument(input: Record<string, unknown>): Promise<{ document: unknown }> {
    return this.request("/admin/content/documents", { method: "POST", body: JSON.stringify(input) }, ATLANTIUM_API_BASE_URL);
  }

  async adminUpdateContentDocument(id: string, input: Record<string, unknown>): Promise<{ document: unknown }> {
    return this.request(`/admin/content/documents/${id}`, { method: "PATCH", body: JSON.stringify(input) }, ATLANTIUM_API_BASE_URL);
  }

  async adminDeleteContentDocument(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/content/documents/${id}`, { method: "DELETE" }, ATLANTIUM_API_BASE_URL);
  }

  async getDirectory(params?: {
    kind?: string;
    /** Match the name only — for pickers, where a summary hit is noise. */
    name_only?: "1";
    category?: string;
    tag?: string;
    q?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    entries: DirectoryEntry[];
    total: number;
    limit: number;
    offset: number;
    counts: Record<string, number>;
  }> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
    }
    return this.request(`/directory?${search}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getDirectoryEntry(kind: string, slug: string): Promise<{
    entry: DirectoryEntry;
    provenance: Array<{ source: string; source_url?: string | null; last_seen_at: string }>;
  }> {
    return this.request(`/directory/${kind}/${slug}`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getJobApplyUrl(slug: string): Promise<{ apply_url: string }> {
    return this.request(`/job_postings/${slug}/apply`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getContactState(kind: string, slug: string): Promise<{
    contact_state: ContactState;
    reveals_available: number | null;
    refreshes_at: string | null;
  }> {
    return this.request(`/directory/${kind}/${slug}/state`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async revealContacts(entryId: string): Promise<{
    contacts: DirectoryContact[];
    contact_state: ContactState;
    reveals_available: number | null;
    refreshes_at?: string | null;
  }> {
    return this.request(`/directory/entries/${entryId}/reveal`, { method: "POST" }, ATLANTIUM_API_BASE_URL);
  }

  async getEntryContacts(entryId: string): Promise<{ contacts: DirectoryContact[] }> {
    return this.request(`/directory/entries/${entryId}/contacts`, { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async adminSyncCompanies(): Promise<Record<string, number>> {
    return this.request("/admin/directory/sync-companies", { method: "POST" }, ATLANTIUM_API_BASE_URL);
  }

  async adminSyncDirectory(): Promise<Record<string, number>> {
    return this.request("/admin/directory/sync", { method: "POST" }, ATLANTIUM_API_BASE_URL);
  }

  async adminGetDirectorySources(): Promise<{
    sources: Array<{ id: string; display_name: string; base_url?: string | null; enabled: boolean; last_sync_at?: string | null }>;
  }> {
    return this.request("/admin/directory/sources", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async adminSetDirectorySourceEnabled(id: string, enabled: boolean): Promise<{ id: string; enabled: boolean }> {
    return this.request(`/admin/directory/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }, ATLANTIUM_API_BASE_URL);
  }

  async adminGenerateCover(id: string, subject?: string): Promise<{ cover_image_url: string }> {
    return this.request(`/admin/content/documents/${id}/cover`, {
      method: "POST",
      body: JSON.stringify({ subject }),
    }, ATLANTIUM_API_BASE_URL);
  }

  async adminCreateContentCollection(input: Record<string, unknown>): Promise<{ collection: unknown }> {
    return this.request("/admin/content/collections", { method: "POST", body: JSON.stringify(input) }, ATLANTIUM_API_BASE_URL);
  }

  async getReviewStatus(): Promise<{
    inflight_batches: Array<{ batch_id: string; job_count: number; submitted_at: string }>;
    last_24h: {
      reviewed: number;
      auto_expired: number;
      flagged_active: number;
      batches: number;
      tokens: { input: number; output: number };
      est_cost_usd: number;
    };
    active_no_degree: number;
  }> {
    return this.request("/admin/review/status", { method: "GET" }, ATLANTIUM_API_BASE_URL);
  }

  async getJobPosting(slug: string): Promise<JobPosting> {
    return this.request<JobPosting>(`/job_postings/${encodeURIComponent(slug)}`, {
      method: "GET",
    }, ATLANTIUM_API_BASE_URL);
  }

  async createJobPosting(data: {
    title: string;
    company: string;
    location: string;
    workplace_type?: string;
    seniority?: string;
    salary_min?: number | null;
    salary_max?: number | null;
    apply_url: string;
    status?: string;
    posted_at?: string | null;
    content?: JobPostingContent;
  }): Promise<JobPosting> {
    return this.request<JobPosting>("/job_postings/create", {
      method: "POST",
      body: JSON.stringify(data),
    }, ATLANTIUM_API_BASE_URL);
  }

  async updateJobPosting(jobId: string, data: Partial<{
    title: string;
    company: string;
    location: string;
    workplace_type: string;
    seniority: string;
    salary_min: number | null;
    salary_max: number | null;
    apply_url: string;
    status: string;
    posted_at: string | null;
    content: JobPostingContent;
  }>): Promise<{ success: boolean; job: JobPosting }> {
    return this.request<{ success: boolean; job: JobPosting }>(`/job_postings/${jobId}/update`, {
      method: "POST",
      body: JSON.stringify(data),
    }, ATLANTIUM_API_BASE_URL);
  }

  async rescrapeJobPostings(): Promise<{
    success: boolean;
    buildId: string;
    scraped: number;
    kept: number;
    created: number;
    reactivated: number;
    expired: number;
  }> {
    return this.request("/admin/jobs/rescrape", {
      method: "POST",
    }, ATLANTIUM_API_BASE_URL);
  }

  async sendDigest(opts?: { test?: boolean; force?: boolean }): Promise<{
    success: boolean;
    periodKey: string;
    skipped?: string;
    sections: Record<string, number>;
    recipients: number;
    sent: number;
    failed: number;
    test: boolean;
  }> {
    return this.request("/admin/digest/send", {
      method: "POST",
      body: JSON.stringify(opts ?? {}),
    }, ATLANTIUM_API_BASE_URL);
  }

  async deleteJobPosting(jobId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/job_postings/${jobId}/delete`, {
      method: "POST",
    }, ATLANTIUM_API_BASE_URL);
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
