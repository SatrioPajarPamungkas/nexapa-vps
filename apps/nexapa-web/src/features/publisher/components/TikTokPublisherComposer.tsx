import { useCallback, useState } from "react";
import { CaptionEditor } from "./CaptionEditor";
import { DestinationSelector } from "./DestinationSelector";
import { HashtagHelper } from "./HashtagHelper";
import { MediaPicker } from "./MediaPicker";
import { PlatformSettingsPanel } from "./PlatformSettingsPanel";
import { PublishPreview } from "./PublishPreview";
import { PublishValidationPanel } from "./PublishValidationPanel";
import { PublisherActionBar } from "./PublisherActionBar";
import { ScheduleModeSelectorPortal } from "./ScheduleModeSelector";
import { ScheduleDateTimePicker } from "./ScheduleDateTimePicker";
import { AutoBulkVideoComposer } from "./AutoBulkVideoComposer";
import type { PublisherMode } from "./ScheduleModeSelector";
import type { PublishPlatform } from "../publisher.types";
import type { usePublisherWorkspaceWithBackend } from "../hooks/usePublisherWorkspaceWithBackend";

type Workspace = ReturnType<typeof usePublisherWorkspaceWithBackend>;
type Props = { workspace: Workspace; onOpenLibrary: () => void; onOpenAccounts: () => void; onSaveDraft: () => void };

export function TikTokPublisherComposer({ workspace: ws, onOpenLibrary, onOpenAccounts, onSaveDraft }: Props) {
  const selected = ws.selectedDestinations[0];
  const isValid = ws.canPublish && selected?.platform === "tiktok";
  const isPublishing = ["submitting", "queued", "uploading", "processing"].includes(ws.publishingState);
  const accountLabels = { tiktok: selected?.label || "", facebook: "", instagram: "", youtube: "" } as Record<PublishPlatform, string>;
  const effectiveCaptions = { tiktok: ws.platformSettings.tiktok.captionOverrideEnabled ? ws.platformSettings.tiktok.captionOverride : ws.caption, facebook: "", instagram: "", youtube: "" } as Record<PublishPlatform, string>;
  const injectHashtag = (tag: string) => { if (!ws.caption.includes(tag)) ws.setCaption((previous) => previous ? `${previous} ${tag}` : tag); };
  const handleTikTokMedia = (files: FileList | File[]) => {
    return ws.handleMediaFiles(files, "video");
  };

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

  const handleSchedulePublish = useCallback(() => {
    if (!isValid) return;
    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    void ws.submitPublish("schedule", scheduledAt, "direct_post");
  }, [isValid, scheduledDate, scheduledTime, ws]);

  if (publishMode === "auto_bulk") {
    return <><ScheduleModeSelectorPortal mode={publishMode} onModeChange={setPublishMode} disabled={isPublishing} /><AutoBulkVideoComposer platform="tiktok" accounts={ws.destinations} /></>;
  }

  return (
    <div className="mx-auto max-w-[1440px] bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 bg-transparent lg:grid-cols-[1fr_0.6fr] xl:grid-cols-[1.1fr_0.55fr]">
        <div className="space-y-5 bg-transparent">
          <section className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10"><div className="p-5 bg-white/5"><MediaPicker media={ws.media} uploadedAsset={ws.serverMedia} onFiles={handleTikTokMedia} onClear={ws.clearMedia} onOpenLibrary={onOpenLibrary} uploadState={ws.uploadState} uploadError={ws.uploadError} onRetry={() => void ws.retryUpload()} expectedMediaKind="video" /></div><div className="mx-5 border-t border-white/10" /><div className="p-5 bg-white/5"><CaptionEditor caption={ws.caption} selectedPlatforms={["tiktok"]} onChange={ws.setCaption} onClear={() => ws.setCaption("")} onAddHashtag={injectHashtag} /></div><div className="mx-5 border-t border-white/10" /><div className="p-5 bg-white/5"><HashtagHelper hashtags={ws.hashtags} onChangeHashtags={ws.setHashtags} onInjectToCaption={injectHashtag} /></div></section>
          <PlatformSettingsPanel selectedPlatforms={["tiktok"]} settings={ws.platformSettings} media={ws.media} caption={ws.caption} activeTab="tiktok" onTabChange={ws.setActiveSettingsTab} onSettingsChange={ws.setPlatformSettings} validationItems={ws.validationItems} />
          {publishMode === "schedule" && (
            <section className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
              <h3 className="text-[13px] font-semibold text-slate-900">Schedule Publishing</h3>
              <div className="mt-4"><ScheduleDateTimePicker scheduledDate={scheduledDate} scheduledTime={scheduledTime} timezone={timezone} onDateChange={setScheduledDate} onTimeChange={setScheduledTime} onTimezoneChange={setTimezone} disabled={isPublishing} /></div>
            </section>
          )}
        </div>
        <div className="space-y-5 bg-transparent">
          <DestinationSelector accounts={ws.destinations} selectedIds={ws.selectedIds} search={ws.searchDestinations} activePlatform="tiktok" onSearch={ws.setSearchDestinations} onToggle={ws.toggleDestination} onOpenConnectedAccounts={onOpenAccounts} />
          <PublishPreview selectedPlatforms={["tiktok"]} media={ws.media} caption={ws.caption} effectiveCaptions={effectiveCaptions} previewPlatform="tiktok" onPreviewPlatformChange={ws.setPreviewPlatform} accountLabels={accountLabels} platformSettings={{ tiktok: { privacy: ws.platformSettings.tiktok.privacy }, instagram: { mode: "" }, facebook: { destination: "" }, youtube: { title: "", visibility: "", description: "" } }} />
          <PublishValidationPanel items={ws.validationItems.filter((item) => item.platform === "global" || item.platform === "tiktok")} />
          <div className="flex flex-wrap items-center justify-end gap-2 bg-transparent">
            <ScheduleModeSelectorPortal mode={publishMode} onModeChange={setPublishMode} disabled={isPublishing} />
            <PublisherActionBar activePlatform="tiktok" isValid={isValid} isPublishing={isPublishing} onPublish={publishMode === "publish_now" ? () => void ws.submitPublish("publish_now", undefined, "direct_post") : handleSchedulePublish} onTikTokDraft={() => void ws.submitPublish("publish_now", undefined, "upload_as_draft")} onSaveDraft={onSaveDraft} />
          </div>
        </div>
      </div>
    </div>
  );
}
