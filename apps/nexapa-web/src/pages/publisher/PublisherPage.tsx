import { useCallback, useState, useEffect, useRef } from "react";
import { Library, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { FacebookPublisherComposer } from "@/features/publisher/components/FacebookPublisherComposer";
import { PlatformSelector } from "@/features/publisher/components/PlatformSelector";
import { PublisherComingSoon } from "@/features/publisher/components/PublisherComingSoon";
import { SaveDraftDialog } from "@/features/publisher/components/SaveDraftDialog";
import { TikTokPublisherComposer } from "@/features/publisher/components/TikTokPublisherComposer";
import { ShopeePublisherComposer } from "@/features/publisher/components/ShopeePublisherComposer";
import { usePublisherWorkspaceWithBackend } from "@/features/publisher/hooks/usePublisherWorkspaceWithBackend";
import { readMediaLibrarySelection, clearMediaLibrarySelectionIfMatches, type MediaLibraryTransferState } from "@/lib/media-library-transfer";
import type { PublisherPlatform } from "@/features/publisher/publisher.types";

const platformNames: Record<PublisherPlatform, string> = { facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", shopee: "Shopee" };

export function PublisherPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPlatform = new URLSearchParams(location.search).get("platform");
  const initialPlatform: PublisherPlatform =
    requestedPlatform === "shopee" ||
    requestedPlatform === "tiktok" ||
    requestedPlatform === "youtube" ||
    requestedPlatform === "facebook"
      ? requestedPlatform
      : "facebook";
  const [activePlatform, setActivePlatform] =
    useState<PublisherPlatform>(initialPlatform);
  const [pendingPlatform, setPendingPlatform] = useState<PublisherPlatform | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [pendingMediaLibraryTransfer, setPendingMediaLibraryTransfer] = useState<MediaLibraryTransferState | null>(null);
  const ws = usePublisherWorkspaceWithBackend(activePlatform);
  const platformName = platformNames[activePlatform];
  const transferProcessedRef = useRef(false);

  useEffect(() => {
    if (transferProcessedRef.current) return;

    const state = readMediaLibrarySelection();
    if (!state) return;

    if (state.platform === "facebook") {
      setActivePlatform("facebook");
      setPendingMediaLibraryTransfer(state);
    }
  }, [location.state]);

  const handleMediaLibraryTransferHydrated = useCallback((transfer: MediaLibraryTransferState) => {
    if (
      pendingMediaLibraryTransfer &&
      transfer.source === pendingMediaLibraryTransfer.source &&
      transfer.action === pendingMediaLibraryTransfer.action &&
      transfer.platform === pendingMediaLibraryTransfer.platform &&
      transfer.timestamp === pendingMediaLibraryTransfer.timestamp &&
      transfer.mediaAssetIds.length === pendingMediaLibraryTransfer.mediaAssetIds.length &&
      transfer.mediaAssetIds.every((id, i) => id === pendingMediaLibraryTransfer.mediaAssetIds[i])
    ) {
      const cleared = clearMediaLibrarySelectionIfMatches(pendingMediaLibraryTransfer);
      if (cleared) {
        setPendingMediaLibraryTransfer(null);
        transferProcessedRef.current = true;
      }
    }
  }, [pendingMediaLibraryTransfer]);

  const settingsModified = ws.platformSettings.facebook.postType !== "text"
    || ws.platformSettings.tiktok.privacy !== "only_me"
    || ws.platformSettings.tiktok.rightsConfirmed
    || !ws.platformSettings.tiktok.interaction.allowComments
    || ws.platformSettings.tiktok.interaction.allowDuet
    || ws.platformSettings.tiktok.interaction.allowStitch
    || ws.platformSettings.tiktok.disclosure.brandedContent
    || ws.platformSettings.tiktok.disclosure.promotionalContent
    || ws.platformSettings.tiktok.captionOverrideEnabled;
  const hasSwitchSensitiveContent = Boolean(ws.media || ws.caption.trim() || ws.selectedIds.size || settingsModified);

  const switchPlatform = useCallback((platform: PublisherPlatform) => {
    ws.resetForPlatform();
    setActivePlatform(platform);
    if (platform !== "shopee") ws.setActiveSettingsTab(platform as "facebook" | "tiktok" | "youtube");
    setPendingPlatform(null);
  }, [ws]);

  const requestPlatformChange = useCallback((platform: PublisherPlatform) => {
    if (platform === "shopee") {
      navigate("/shopee/videos/new");
      return;
    }
    if (platform === activePlatform) return;
    if (hasSwitchSensitiveContent) setPendingPlatform(platform);
    else switchPlatform(platform);
  }, [activePlatform, hasSwitchSensitiveContent, switchPlatform]);

  const resetComposer = useCallback(() => {
    ws.resetComposer(false);
    setShowResetDialog(false);
  }, [ws]);

  const loadDraft = useCallback((id: string) => {
    const draft = ws.drafts.find((item) => item.id === id);
    if (!draft) return;
    if (draft.platform && ["facebook", "tiktok", "youtube", "shopee"].includes(draft.platform)) setActivePlatform(draft.platform);
    ws.loadDraft(id);
  }, [ws]);

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow={`Publisher / ${platformName}`}
        title={`Create ${platformName} Post`}
        description={`Compose and review a post specifically for ${platformName}.`}
        actions={<><PlatformSelector activePlatform={activePlatform} onPlatformChange={requestPlatformChange} /><div id="publisher-mode-selector" className="contents" /><button type="button" onClick={() => hasSwitchSensitiveContent ? setShowResetDialog(true) : resetComposer()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white/20"><Plus className="h-4 w-4" /> New Post</button><button type="button" onClick={() => navigate("/library")} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white/20"><Library className="h-4 w-4" /> Media Library</button></>}
      />

      {ws.drafts.length > 0 && (
        <div className="mx-auto max-w-[1440px] px-4 pt-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {ws.drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-[12px] backdrop-blur-xl"
              >
                <span className="max-w-44 truncate font-medium">
                  {draft.name}
                </span>

                <button
                  type="button"
                  onClick={() => loadDraft(draft.id)}
                  className="rounded-full border border-blue-400/25 bg-blue-500/12 px-2 py-0.5 text-[10px] font-medium text-blue-800"
                >
                  Load
                </button>

                <button
                  type="button"
                  onClick={() => ws.deleteDraft(draft.id)}
                  className="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePlatform === "facebook" && <FacebookPublisherComposer workspace={ws} onOpenLibrary={() => navigate("/library")} onOpenAccounts={() => navigate("/accounts")} onSaveDraft={() => setShowSaveDialog(true)} pendingMediaLibraryTransfer={pendingMediaLibraryTransfer} onMediaLibraryTransferHydrated={handleMediaLibraryTransferHydrated} />}
      {activePlatform === "tiktok" && <TikTokPublisherComposer workspace={ws} onOpenLibrary={() => navigate("/library")} onOpenAccounts={() => navigate("/accounts")} onSaveDraft={() => setShowSaveDialog(true)} />}
      {activePlatform === "youtube" && <PublisherComingSoon platform="youtube" />}
      {activePlatform === "shopee" && <ShopeePublisherComposer />}

      <SaveDraftDialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} onSave={(name) => { ws.saveLocalDraft(name); setShowSaveDialog(false); }} initialName="" />

      {pendingPlatform && <ConfirmDialog title="Ganti platform posting?" description="Media, destination, dan pengaturan khusus platform saat ini akan dibersihkan. Teks akan dipertahankan jika masih kompatibel." confirmLabel="Switch Platform" onCancel={() => setPendingPlatform(null)} onConfirm={() => switchPlatform(pendingPlatform)} />}
      {showResetDialog && <ConfirmDialog title="Reset composer?" description="Media, teks, destination, dan pengaturan platform saat ini akan dibersihkan." confirmLabel="Reset" destructive onCancel={() => setShowResetDialog(false)} onConfirm={resetComposer} />}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{ws.feedback}</div>
    </div>
  );
}

function ConfirmDialog({ title, description, confirmLabel, destructive = false, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; destructive?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true"><button type="button" aria-label="Close dialog" onClick={onCancel} className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" /><div className="relative mx-4 w-full max-w-[420px] rounded-2xl border border-white/10 bg-slate-950/78 p-6 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl"><h2 className="text-[15px] font-semibold text-white">{title}</h2><p className="mt-2 text-[13px] leading-5 text-white/70">{description}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-xl hover:bg-white/15">Cancel</button><button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2 text-[13px] font-medium text-white shadow-sm ${destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>{confirmLabel}</button></div></div></div>;
}
