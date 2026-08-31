import { useRef, useState, useEffect } from "react";
import { Settings, ShieldCheck, Video, Package, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { useConnectedAccounts } from "@/features/connected-accounts/hooks/useConnectedAccounts";
import { PlatformGrid } from "@/features/connected-accounts/components/PlatformGrid";
import { ConnectAccountDialog } from "@/features/connected-accounts/components/ConnectAccountDialog";
import { ConnectedAccountsTable } from "@/features/connected-accounts/components/ConnectedAccountsTable";

type AccountPlatformFilter = "all" | "tiktok" | "facebook" | "shopee";

export function ConnectedAccountsPage() {
  const hook = useConnectedAccounts();
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<AccountPlatformFilter>("all");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const reconnected = searchParams.get("reconnected");
    const synced = searchParams.get("synced");
    const oauthError = searchParams.get("oauth_error");

    const hasConnected = connected === "tiktok" || connected === "facebook" || connected === "shopee";
    const hasReconnected = reconnected === "tiktok" || reconnected === "facebook" || reconnected === "shopee";
    const hasSynced = synced === "facebook";
    const hasError = !!oauthError;

    if (hasConnected) {
      hook.refetch();
      const timer = window.setTimeout(() => {
        if (connected === "facebook") {
          const message = hasSynced
            ? "Facebook berhasil terhubung dan semua Page telah disinkronkan."
            : "Facebook berhasil terhubung.";
          hook.showFeedback("success", message);
        } else {
          hook.showFeedback("success", "TikTok account connected.");
        }
      }, 100);
      setSearchParams((prev) => {
        prev.delete("connected");
        prev.delete("synced");
        return prev;
      }, { replace: true });
      return () => window.clearTimeout(timer);
    }

    if (hasReconnected) {
      hook.refetch();
      const timer = window.setTimeout(() => {
        if (reconnected === "facebook") {
          hook.showFeedback("success", "Facebook berhasil dihubungkan ulang dan Page telah disinkronkan.");
        } else {
          hook.showFeedback("success", "TikTok permissions updated successfully.");
        }
      }, 100);
      setSearchParams((prev) => {
        prev.delete("reconnected");
        prev.delete("synced");
        return prev;
      }, { replace: true });
      return () => window.clearTimeout(timer);
    }

    if (hasError) {
      const errorMessages: Record<string, string> = {
        invalid_state: "OAuth session expired or was invalid. Please try connecting again.",
        user_not_found: "User session not found. Please log in and try again.",
        tiktok_authorization_failed: "TikTok authorization was declined. Please try again.",
        missing_code: "Authorization code missing from TikTok response.",
        invalid_code: "Authorization code was invalid or expired.",
        token_exchange_failed: "Failed to exchange authorization code. Please try again.",
        provider_error: "TikTok service temporarily unavailable. Please try again later.",
        user_info_failed: "Failed to retrieve TikTok account information.",
        user_mismatch: "Account verification failed. Please try again.",
        persist_failed: "Failed to save account connection. Please try again.",
        video_publish_not_granted: "TikTok did not grant Direct Post permission.",
        reconnect_account_mismatch: "You authorized a different TikTok account. Reconnect using the same account.",
        access_denied: "TikTok authorization was cancelled.",
        // Facebook errors
        facebook_access_denied: "Izin Facebook dibatalkan. Silakan coba hubungkan kembali.",
        facebook_admin_account_mismatch: "Akun Facebook yang digunakan berbeda dari akun Admin yang sebelumnya terhubung.",
        facebook_invalid_state: "Sesi koneksi Facebook sudah kedaluwarsa. Silakan mulai kembali.",
        facebook_configuration_error: "Konfigurasi Facebook belum lengkap. Periksa Developer Settings.",
        facebook_oauth_failed: "Facebook gagal dihubungkan. Silakan coba kembali.",
        facebook_page_sync_failed: "Facebook terhubung, tetapi sinkronisasi Page gagal.",
        facebook_invalid_scope: "Facebook tidak memberikan izin yang diperlukan.",
        facebook_invalid_request: "Permintaan Facebook tidak valid.",
        facebook_invalid_grant: "Kode otorisasi Facebook tidak valid.",
        facebook_temporarily_unavailable: "Facebook sementara tidak tersedia. Silakan coba lagi nanti.",
        facebook_server_error: "Terjadi kesalahan pada server Facebook.",
      };

      const message = errorMessages[oauthError] ?? "Failed to connect account. Please try again.";
      hook.showFeedback("error", message);
      setSearchParams((prev) => {
        prev.delete("oauth_error");
        return prev;
      }, { replace: true });
    }
  }, []);

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow="PUBLISHING"
        title="Connected Accounts"
        description="Manage social accounts used for publishing and scheduling."
        actions={
          <Link
            to="/settings"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 text-[13px] font-medium text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        }
      />

      <div className="mx-auto max-w-[1440px] bg-transparent px-4 py-6 sm:px-6 lg:px-8">
        {hook.feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-2xl border px-4 py-3 text-[13px] backdrop-blur-2xl shadow-[0_14px_40px_rgba(2,6,23,0.14)] ring-1 ${
              hook.feedback.type === "success"
                ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-900"
                : hook.feedback.type === "error"
                  ? "border-red-400/25 bg-red-500/10 text-red-800"
                  : "border-blue-400/25 bg-blue-400/12 text-blue-900"
            }`}
          >
            {hook.feedback.message}
          </div>
        )}

        {hook.loading.fetching ? (
          <div className="space-y-5 bg-transparent">
            <div className="h-[140px] animate-pulse rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl" />
              ))}
            </div>
            <div className="h-[300px] animate-pulse rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl" />
            <div className="hidden space-y-4 lg:block">
              <div className="h-[180px] animate-pulse rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl" />
              <div className="h-[180px] animate-pulse rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl" />
              <div className="h-[150px] animate-pulse rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl" />
            </div>
          </div>
        ) : (
          <div className="bg-transparent">
            <div className="min-w-0 space-y-5 bg-transparent">
              <PlatformGrid
                selectedPlatform={selectedPlatform}
                onPlatformSelect={setSelectedPlatform}
                counts={hook.counts}
              />
              {selectedPlatform === "shopee" ? (
                <ShopeeApprovalPanel />
              ) : (
                <ConnectedAccountsTable
                  filteredAccounts={
                    selectedPlatform === "all"
                      ? hook.accounts
                      : hook.accounts.filter((a) => a.platform === selectedPlatform)
                  }
                  selectedPlatform={selectedPlatform}
                  onRefresh={hook.handleRefresh}
                  onSetDefault={hook.handleSetDefault}
                  onRemove={hook.handleRemove}
                  onReconnect={hook.handleReconnect}
                  actionLoading={{
                    reconnectingId: hook.loading.reconnectingId,
                    refreshingId: hook.loading.refreshingId,
                    settingDefaultId: hook.loading.settingDefaultId,
                    removingId: hook.loading.removingId,
                  }}
                  onConnect={hook.openConnectDialog}
                  onConnectPlatform={hook.handleConnectPlatform}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ConnectAccountDialog
        open={hook.connectDialogOpen}
        onClose={() => {
          hook.closeConnectDialog();
          window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
        }}
        onSelect={hook.handleConnect}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {hook.feedback?.message}
      </div>
    </div>
  );
}


function ShopeeApprovalPanel() {
  return (
    <section className="overflow-hidden rounded-2xl border border-orange-300/30 bg-white/12 shadow-card backdrop-blur-2xl">
      <div className="border-b border-white/15 bg-gradient-to-r from-orange-500/12 via-white/5 to-amber-400/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="text-[15px] font-semibold text-slate-950">Shopee Affiliate & Video</h2><p className="mt-1 text-[12px] text-slate-600">Workspace UI is ready. OAuth activation is waiting for Shopee Open Platform approval.</p></div>
          </div>
          <span className="w-fit rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">Approval pending</span>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        {[{icon: Video,title:"Shopee Video",text:"Prepare videos and captions."},{icon: Package,title:"Affiliate products",text:"Prepare product links for attachment."},{icon: ShieldCheck,title:"Secure authorization",text:"Tokens will remain on the Nexapa API."}].map(({icon: Icon,title,text}) => <div key={title} className="rounded-xl border border-white/20 bg-white/10 p-4"><Icon className="h-5 w-5 text-orange-600"/><h3 className="mt-3 text-[12px] font-semibold text-slate-900">{title}</h3><p className="mt-1 text-[11px] leading-4 text-slate-600">{text}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 px-5 py-4 sm:px-6">
        <p className="text-[11px] text-slate-600">Connect becomes available automatically after backend credentials and User-type API access are configured.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            title="Tersedia setelah profil developer Shopee disetujui"
            className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 text-[12px] font-semibold text-orange-800 opacity-70"
          >
            Connect Shopee
          </button>
          <Link
            to="/shopee"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            Open Shopee workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
