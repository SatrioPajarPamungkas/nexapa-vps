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
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { DownloaderPage } from "@/pages/downloader/DownloaderPage";
import { MediaLibraryPage } from "@/pages/library/MediaLibraryPage";
import { ConnectedAccountsPage } from "@/pages/accounts/ConnectedAccountsPage";
import { PublisherPage } from "@/pages/publisher/PublisherPage";
import { SchedulerPage } from "@/pages/scheduler/SchedulerPage";
import { AffiliatePage } from "@/pages/affiliate/AffiliatePage";
import { HistoryPage } from "@/pages/history/HistoryPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { AppearancePage } from "@/pages/settings/AppearancePage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { DeveloperSettingsPage } from "@/pages/developer-settings/DeveloperSettingsPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";

export function AppRouter() {
  return (
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
        <Route path="/publisher" element={<PublisherPage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
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
  );
}
