import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { captureReferralCode } from "@/lib/referral";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { XanoRealtimeProvider } from "@/contexts/XanoRealtimeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MemberShell } from "@/components/MemberShell";
import { LobbyRoutePage } from "@/pages/LobbyRoutePage";
import { PartnersRoutePage } from "@/pages/PartnersRoutePage";
import { PlaygroundRoutePage } from "@/pages/PlaygroundRoutePage";
import { BillingProvider } from "@/components/billing/UpgradeCta";
import { NetworkPage } from "@/pages/NetworkPage";
import { MemberProfilePage } from "@/pages/MemberProfilePage";
import { MessagesPage } from "@/pages/MessagesPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { AdminIntroductionsPage } from "@/pages/admin/AdminIntroductionsPage";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MemberDashboardPage } from "@/pages/MemberDashboardPage";
import { LandingPage } from "@/pages/LandingPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { MissionPage } from "@/pages/MissionPage";
import { CommunityPage } from "@/pages/CommunityPage";
import { StyleGuidePage } from "@/pages/StyleGuidePage";
import { ComponentsPage } from "@/pages/ComponentsPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminEventsPage } from "@/pages/admin/AdminEventsPage";
import { AdminArticlesPage } from "@/pages/admin/AdminArticlesPage";
import { AdminJobsPage } from "@/pages/admin/AdminJobsPage";
import { AdminContentPage } from "@/pages/admin/AdminContentPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminGTMPage } from "@/pages/admin/AdminGTMPage";
import { GitHubCallbackPage } from "@/pages/GitHubCallbackPage";
import { GoogleCallbackPage } from "@/pages/GoogleCallbackPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PublicProfilePage } from "@/pages/PublicProfilePage";
import { PublicGroupPage } from "@/pages/PublicGroupPage";
import { ArticleDetailPage } from "@/pages/ArticleDetailPage";
import { InvitePage } from "@/pages/InvitePage";
import { IndexPage } from "@/pages/IndexPage";
import { JobsPage } from "@/pages/JobsPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { BlogPage } from "@/pages/BlogPage";
import { DocsPage } from "@/pages/DocsPage";
import { ContentDocumentPage } from "@/pages/ContentDocumentPage";
import { GrantsPage } from "@/pages/GrantsPage";
import { DirectoryEntryPage } from "@/pages/DirectoryEntryPage";
import { TrainingPage } from "@/pages/TrainingPage";
import { PricingPage as PublicPricingPage } from "@/pages/PricingPage";
import { AIEngineerPage } from "@/pages/AIEngineerPage";
import { DollarTestPage } from "@/pages/DollarTestPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { HomeschoolPage } from "@/pages/HomeschoolPage";
import { PathsPage } from "@/pages/PathsPage";
import { CreatorProgramPage } from "@/pages/CreatorProgramPage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/u/:username" element={<PublicProfilePage />} />
      <Route path="/groups/:slug" element={<PublicGroupPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/index" element={<IndexPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/jobs/:slug" element={<JobDetailPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<ContentDocumentPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/:slug" element={<ContentDocumentPage />} />
      <Route path="/grants" element={<GrantsPage />} />
      <Route path="/directory" element={<GrantsPage />} />
      <Route path="/directory/:kind/:slug" element={<DirectoryEntryPage />} />
      <Route path="/training" element={<TrainingPage />} />
      <Route path="/pricing" element={<PublicPricingPage />} />
      <Route path="/index/:slug" element={<ArticleDetailPage />} />
      <Route path="/ai-engineer" element={<AIEngineerPage />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/homeschool" element={<HomeschoolPage />} />
      <Route path="/paths" element={<PathsPage />} />
      <Route path="/creator-program" element={<CreatorProgramPage />} />
      <Route path="/dollar-test" element={<DollarTestPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/policies" element={<TermsPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/mission" element={<MissionPage />} />
      <Route path="/focus-groups" element={<CommunityPage />} />
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthRedirect>
            <SignupPage />
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MemberDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <LobbyRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partners"
        element={
          <ProtectedRoute>
            <PartnersRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/playground"
        element={
          <ProtectedRoute>
            <PlaygroundRoutePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/network"
        element={
          <ProtectedRoute>
            <MemberShell>
              <NetworkPage />
            </MemberShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <MemberShell>
              <DiscoverPage />
            </MemberShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MemberShell>
              <MessagesPage />
            </MemberShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages/:threadId"
        element={
          <ProtectedRoute>
            <MemberShell>
              <MessagesPage />
            </MemberShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:profileId"
        element={
          <ProtectedRoute>
            <MemberShell>
              <MemberProfilePage />
            </MemberShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute skipOnboardingCheck>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="articles" element={<AdminArticlesPage />} />
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="content" element={<AdminContentPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="approvals" element={<Navigate to="/admin/users" replace />} />
        <Route path="introductions" element={<AdminIntroductionsPage />} />
        <Route path="partnerships" element={<DashboardPage embedded />} />
        <Route path="gtm" element={<AdminGTMPage />} />
      </Route>
      {/* Google OAuth callback */}
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      {/* Other Routes */}
      <Route path="/style-guide" element={<StyleGuidePage />} />
      <Route path="/components" element={<ComponentsPage />} />
      <Route
        path="/integration/github"
        element={
          <ProtectedRoute>
            <GitHubCallbackPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    captureReferralCode();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <XanoRealtimeProvider>
              <SubscriptionProvider>
                {/* Billing status fetched once for every upgrade CTA on the platform. */}
                <BillingProvider>
                  <AppRoutes />
                  <Toaster richColors position="top-right" />
                </BillingProvider>
              </SubscriptionProvider>
            </XanoRealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
