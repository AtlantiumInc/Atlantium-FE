import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { XanoRealtimeProvider } from "@/contexts/XanoRealtimeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { HomePage } from "@/pages/HomePage";
import { LandingPage } from "@/pages/LandingPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { StyleGuidePage } from "@/pages/StyleGuidePage";
import { ComponentsPage } from "@/pages/ComponentsPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminEventsPage } from "@/pages/admin/AdminEventsPage";
import { AdminArticlesPage } from "@/pages/admin/AdminArticlesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { GitHubCallbackPage } from "@/pages/GitHubCallbackPage";
import { GoogleCallbackPage } from "@/pages/GoogleCallbackPage";
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
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/policies" element={<TermsPage />} />
      <Route path="/services" element={<ServicesPage />} />
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
            <HomePage />
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
        <Route path="users" element={<AdminUsersPage />} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <XanoRealtimeProvider>
              <SubscriptionProvider>
                <AppRoutes />
                <Toaster richColors position="top-right" />
              </SubscriptionProvider>
            </XanoRealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
