import { useCallback, useState, useRef, useEffect } from "react";
import { CheckCircle2, FileText, Image as ImageIcon, Settings, Video } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { DestinationSelector } from "./DestinationSelector";
import { FacebookPostPreview } from "./FacebookPostPreview";
import { PublisherActionBar } from "./PublisherActionBar";
import { ScheduleModeSelectorPortal } from "./ScheduleModeSelector";
import { ScheduleDateTimePicker } from "./ScheduleDateTimePicker";
import { AutoBulkVideoComposer } from "./AutoBulkVideoComposer";
import type { PublisherMode } from "./ScheduleModeSelector";
import type { FacebookPostType } from "../publisher.types";
import type { usePublisherWorkspaceWithBackend } from "../hooks/usePublisherWorkspaceWithBackend";
import { cn } from "@/lib/cn";
import { getMediaAsset } from "@/lib/api/media-assets";
import type { MediaLibraryTransferState } from "@/lib/media-library-transfer";

type Workspace = ReturnType<typeof usePublisherWorkspaceWithBackend>;
type Props = {
  workspace: Workspace;
  onOpenLibrary: () => void;
  onOpenAccounts: () => void;
  onSaveDraft: () => void;
  pendingMediaLibraryTransfer?: MediaLibraryTransferState | null;
  onMediaLibraryTransferHydrated?: (transfer: MediaLibraryTransferState) => void;
};

const postTypes: Array<{ value: FacebookPostType; label: string; icon: typeof FileText }> = [
  { value: "text", label: "Text", icon: FileText },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
];

export function FacebookPublisherComposer({ workspace: ws, onOpenLibrary, onOpenAccounts, onSaveDraft, pendingMediaLibraryTransfer, onMediaLibraryTransferHydrated }: Props) {
  const postType = ws.platformSettings.facebook.postType;
  const selectedPage = ws.selectedDestinations[0] ?? null;
  const uploadDone = ws.uploadState === "stored" && Boolean(ws.serverMedia?.id);
  const mediaMatches = postType === "text" ? !ws.media : ws.media?.kind === postType && uploadDone;
  const isValid = Boolean(selectedPage && selectedPage.platform === "facebook" && selectedPage.accountType === "facebook_page" && mediaMatches && (postType !== "text" || ws.caption.trim()));
  const isPublishing = ["submitting", "queued", "uploading", "processing"].includes(ws.publishingState);
  const destinationError = ws.publishFieldErrors.connected_account_id?.[0];
  const messageError = ws.publishFieldErrors.caption?.[0];
  const mediaError = ws.publishFieldErrors.media_asset_id?.[0];

  const hydrateAttemptedRef = useRef(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const [publishMode, setPublishMode] = useState<PublisherMode>("publish_now");
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>("10:00");
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Asia/Jakarta";
    }
  });

  function changePostType(next: FacebookPostType) {
    if (next !== postType) ws.clearMedia();
    ws.setPlatformSettings({ ...ws.platformSettings, facebook: { ...ws.platformSettings.facebook, postType: next } });
  }

  async function handleFacebookMedia(files: FileList | File[]) {
    if (postType === "text") return { added: false, reason: "Facebook Text does not accept media." };
    return ws.handleMediaFiles(files, postType);
  }

  const handleSchedulePublish = useCallback(() => {
    if (!isValid) return;
    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    void ws.submitPublish("schedule", scheduledAt, "direct_post");
  }, [isValid, scheduledDate, scheduledTime, ws]);

  const requirements = [
    { label: "One connected Facebook Page", ready: Boolean(selectedPage) },
    { label: postType === "text" ? "Post message provided" : `One ${postType} uploaded`, ready: postType === "text" ? Boolean(ws.caption.trim()) : mediaMatches },
    { label: "No upload in progress", ready: ws.uploadState !== "uploading" },
  ];

  useEffect(() => {
    if (!pendingMediaLibraryTransfer || hydrateAttemptedRef.current) return;
    if (pendingMediaLibraryTransfer.action !== "publish_now") return;
    if (pendingMediaLibraryTransfer.mediaAssetIds.length !== 1) return;

    hydrateAttemptedRef.current = true;

    const mediaAssetId = pendingMediaLibraryTransfer.mediaAssetIds[0];
    let cancelled = false;

    (async () => {
      try {
        const mediaAsset = await getMediaAsset(mediaAssetId);

        if (cancelled) return;

        if (!mediaAsset || !["available", "archived"].includes(mediaAsset.status) || mediaAsset.media_type !== "video") {
          setHydrateError(
            mediaAsset
              ? `Media "${mediaAsset.display_name}" is not a valid video or is not available.`
              : "Media asset not found."
          );
          return;
        }

        ws.hydrateExistingMediaAsset(mediaAsset);

        if (onMediaLibraryTransferHydrated) {
          onMediaLibraryTransferHydrated(pendingMediaLibraryTransfer);
        }
      } catch (err) {
        if (cancelled) return;
        setHydrateError(err instanceof Error ? err.message : "Failed to load media from Media Library.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingMediaLibraryTransfer, onMediaLibraryTransferHydrated, ws]);

  if (publishMode === "auto_bulk") {
    return <><ScheduleModeSelectorPortal mode={publishMode} onModeChange={setPublishMode} disabled={isPublishing} /><AutoBulkVideoComposer platform="facebook" accounts={ws.destinations} pendingMediaLibraryTransfer={pendingMediaLibraryTransfer} onMediaLibraryTransferHydrated={onMediaLibraryTransferHydrated} /></>;
  }

  return (
    <div className="mx-auto max-w-[1440px] bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 bg-transparent lg:grid-cols-[1fr_0.6fr] xl:grid-cols-[1.1fr_0.55fr]">
        <div className="space-y-5 bg-transparent">
          <section className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-0 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
            <fieldset className="bg-transparent p-5">
              <legend className="text-[13px] font-semibold text-slate-900">Post Type</legend>
              <div className="mt-3 grid grid-cols-3 gap-2 bg-transparent">
                {postTypes.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => changePostType(value)} className={cn("inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[12px] font-medium backdrop-blur-xl transition-all", postType === value ? "border-blue-400/45 bg-blue-500/15 text-blue-800 ring-1 ring-blue-400/20" : "border-white/15 bg-white/8 text-slate-700 hover:bg-white/14 hover:border-white/20")}><Icon className="h-4 w-4" />{label}</button>)}
              </div>
            </fieldset>
            {postType !== "text" && <><div className="mx-5 border-t border-white/10" /><div className="p-5 bg-white/5"><MediaPicker media={ws.media} uploadedAsset={ws.serverMedia} onFiles={handleFacebookMedia} onClear={ws.clearMedia} onOpenLibrary={onOpenLibrary} uploadState={ws.uploadState} uploadError={hydrateError || ws.uploadError} onRetry={() => { setHydrateError(null); void ws.retryUpload(); }} expectedMediaKind={postType} />{mediaError && <p className="mt-2 text-[11px] text-red-700">{mediaError}</p>}</div></>}
            <div className="mx-5 border-t border-white/10" />
            <div className="p-5 bg-white/5">
              <label htmlFor="facebook-message" className="text-[13px] font-semibold text-slate-900">{postType === "text" ? "Post message" : postType === "image" ? "Photo caption" : "Video description"}</label>
              <textarea id="facebook-message" value={ws.caption} onChange={(event) => ws.setCaption(event.target.value)} rows={6} required={postType === "text"} placeholder={postType === "text" ? "Write your Facebook post message..." : "Add an optional caption..."} className="mt-3 min-h-32 w-full resize-y rounded-xl border border-white/20 bg-white/12 p-3 text-[13px] leading-6 text-slate-950 backdrop-blur-xl placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
              {messageError && <p className="mt-2 text-[11px] text-red-700">{messageError}</p>}
              <p className="mt-2 text-[10px] text-slate-500">{postType === "text" ? "Message is required for a text post." : "Caption is optional for this post type."}</p>
            </div>
          </section>
          <section className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
            <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-slate-500" /><h3 className="text-[13px] font-semibold text-slate-900">Facebook Post Settings</h3></div>
            <dl className="mt-4 grid gap-3 text-[12px] sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/5 p-2"><dt className="text-slate-500 text-[11px]">Post type</dt><dd className="mt-1 font-medium capitalize text-slate-900">{postType}</dd></div><div className="rounded-xl border border-white/10 bg-white/5 p-2"><dt className="text-slate-500 text-[11px]">Selected Page</dt><dd className="mt-1 truncate font-medium text-slate-900">{selectedPage?.label || "None"}</dd></div><div className="rounded-xl border border-white/10 bg-white/5 p-2"><dt className="text-slate-500 text-[11px]">Publishing mode</dt><dd className="mt-1 font-medium text-slate-900">{publishMode === "publish_now" ? "Publish now" : `Scheduled for ${scheduledDate} ${scheduledTime}`}</dd></div></dl>
            {publishMode === "schedule" && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <ScheduleDateTimePicker scheduledDate={scheduledDate} scheduledTime={scheduledTime} timezone={timezone} onDateChange={setScheduledDate} onTimeChange={setScheduledTime} onTimezoneChange={setTimezone} disabled={isPublishing} />
              </div>
            )}
          </section>
        </div>
        <div className="space-y-5 bg-transparent">
          <div className="bg-transparent"><DestinationSelector accounts={ws.destinations} selectedIds={ws.selectedIds} search={ws.searchDestinations} activePlatform="facebook" onSearch={ws.setSearchDestinations} onToggle={ws.toggleDestination} onOpenConnectedAccounts={onOpenAccounts} onRefresh={ws.refetchDestinations} refreshLoading={ws.loading.fetching} />{destinationError && <p className="mt-2 text-[11px] text-red-700">{destinationError}</p>}</div>
          <FacebookPostPreview page={selectedPage} postType={postType} message={ws.caption} media={ws.media} />
          <section className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10"><h3 className="text-[13px] font-semibold text-slate-900">Review Requirements</h3><div className="mt-3 space-y-2">{requirements.map((item) => <div key={item.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] backdrop-blur-xl"><CheckCircle2 className={cn("h-4 w-4", item.ready ? "text-emerald-500" : "text-white/40")} /><span className={item.ready ? "text-slate-700" : "text-slate-400"}>{item.label}</span></div>)}</div></section>
          <div className="flex flex-wrap items-center justify-end gap-2 bg-transparent">
            <ScheduleModeSelectorPortal mode={publishMode} onModeChange={setPublishMode} disabled={isPublishing} />
            <PublisherActionBar activePlatform="facebook" facebookPostType={postType} isValid={isValid} isPublishing={isPublishing} onPublish={publishMode === "publish_now" ? () => void ws.submitPublish("publish_now", undefined, "direct_post") : handleSchedulePublish} onSaveDraft={onSaveDraft} />
          </div>
        </div>
      </div>
    </div>
  );
}
