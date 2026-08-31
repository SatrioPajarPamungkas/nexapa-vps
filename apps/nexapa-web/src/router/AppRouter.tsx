import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { PublicGuard } from "@/features/auth/PublicGuard";
import { AdminGuard } from "@/features/auth/AdminGuard";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { GoogleCallbackPage } from "@/pages/auth/GoogleCallbackPage";
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then(
    (module) => ({ default: module.DashboardPage }),
  ),
);

const DownloaderPage = lazy(() =>
  import("@/pages/downloader/DownloaderPage").then(
    (module) => ({ default: module.DownloaderPage }),
  ),
);

const MediaLibraryPage = lazy(() =>
  import("@/pages/library/MediaLibraryPage").then(
    (module) => ({ default: module.MediaLibraryPage }),
  ),
);

const ConnectedAccountsPage = lazy(() =>
  import("@/pages/accounts/ConnectedAccountsPage").then(
    (module) => ({
      default: module.ConnectedAccountsPage,
    }),
  ),
);

const FacebookPagesPage = lazy(() =>
  import("@/pages/accounts/FacebookPagesPage").then(
    (module) => ({ default: module.FacebookPagesPage }),
  ),
);

const FacebookPageInsightsPage = lazy(() =>
  import("@/pages/accounts/FacebookPageInsightsPage").then(
    (module) => ({
      default: module.FacebookPageInsightsPage,
    }),
  ),
);

const PublisherPage = lazy(() =>
  import("@/pages/publisher/PublisherPage").then(
    (module) => ({ default: module.PublisherPage }),
  ),
);

const SchedulerPage = lazy(() =>
  import("@/pages/scheduler/SchedulerPage").then(
    (module) => ({ default: module.SchedulerPage }),
  ),
);

const ShopeeWorkspacePage = lazy(() =>
  import("@/pages/shopee/ShopeeWorkspacePage").then(
    (module) => ({ default: module.ShopeeWorkspacePage }),
  ),
);

const AffiliatePage = lazy(() =>
  import("@/pages/affiliate/AffiliatePage").then(
    (module) => ({ default: module.AffiliatePage }),
  ),
);

const HistoryPage = lazy(() =>
  import("@/pages/history/HistoryPage").then(
    (module) => ({ default: module.HistoryPage }),
  ),
);

const SettingsPage = lazy(() =>
  import("@/pages/settings/SettingsPage").then(
    (module) => ({ default: module.SettingsPage }),
  ),
);

const AppearancePage = lazy(() =>
  import("@/pages/settings/AppearancePage").then(
    (module) => ({ default: module.AppearancePage }),
  ),
);

const ProfilePage = lazy(() =>
  import("@/pages/profile/ProfilePage").then(
    (module) => ({ default: module.ProfilePage }),
  ),
);

const NotificationsPage = lazy(() =>
  import("@/pages/notifications/NotificationsPage").then(
    (module) => ({ default: module.NotificationsPage }),
  ),
);

const DeveloperSettingsPage = lazy(() =>
  import(
    "@/pages/developer-settings/DeveloperSettingsPage"
  ).then((module) => ({
    default: module.DeveloperSettingsPage,
  })),
);

const NotFoundPage = lazy(() =>
  import("@/pages/not-found/NotFoundPage").then(
    (module) => ({ default: module.NotFoundPage }),
  ),
);

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            Menyiapkan ruang kerja...
          </div>
        </div>
      }
    >
      <Routes>
      <Route element={<PublicGuard><AuthLayout /></PublicGuard>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      </Route>

      <Route element={<AuthGuard><AuthLayout /></AuthGuard>}>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/downloader" element={<DownloaderPage />} />
        <Route path="/library" element={<MediaLibraryPage />} />
        <Route path="/accounts" element={<ConnectedAccountsPage />} />
        <Route
          path="/accounts/facebook/:accountId/pages"
          element={<FacebookPagesPage />}
        />
        <Route
          path="/accounts/facebook/:accountId/pages/:pageId/insights"
          element={<FacebookPageInsightsPage />}
        />
        <Route path="/publisher" element={<PublisherPage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/shopee" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/videos" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/videos/new" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/products" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/drafts" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/scheduled" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/analytics" element={<ShopeeWorkspacePage />} />
        <Route path="/shopee/settings" element={<ShopeeWorkspacePage />} />
        <Route path="/affiliate" element={<AffiliatePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/appearance" element={<AppearancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/inbox" element={<NotificationsPage />} />
      </Route>

      <Route element={<AdminGuard><AppLayout /></AdminGuard>}>
        <Route path="/developer-settings" element={<DeveloperSettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
