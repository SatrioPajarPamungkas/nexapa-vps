import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ConnectedAccount, MediaAsset } from "@/features/scheduler/scheduler.types";
import { createSchedulePost } from "@/lib/api/scheduler";

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: ConnectedAccount[];
  onSuccess: () => void;
};

type Step = "compose" | "preview";

export function TikTokScheduleComposer({ open, onClose, accounts, onSuccess }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaAsset, setMediaAsset] = useState<MediaAsset | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, setTimezone] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
  );
  const [step, setStep] = useState<Step>("compose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // TikTok settings
  const [privacyLevel, setPrivacyLevel] = useState<"PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY">("PUBLIC_TO_EVERYONE");
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [brandContentToggle, setBrandContentToggle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const tiktokAccounts = useMemo(
    () => accounts.filter((a) => a.platform === "tiktok" && a.status === "connected"),
    [accounts]
  );

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setScheduledTime("10:00");

      if (tiktokAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(tiktokAccounts[0].id);
      }
    }
  }, [open, tiktokAccounts, selectedAccountId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = useCallback(() => {
    setSelectedAccountId("");
    setCaption("");
    setMediaFile(null);
    setMediaAsset(null);
    setStep("compose");
    setIsSubmitting(false);
    setError(null);
    setUploadProgress(null);
    onClose();
    setTimeout(() => prevFocusRef.current?.focus(), 0);
  }, [onClose]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["video/mp4", "video/mov", "video/webm"].includes(file.type)) {
      setError("Please select a valid video file (MP4, MOV, WebM)");
      return;
    }

    setMediaFile(file);
    setError(null);

    const mockMediaAsset: MediaAsset = {
      id: `temp-${Date.now()}`,
      media_type: "video",
      storage_path: file.name,
      status: "ready",
    };
    setMediaAsset(mockMediaAsset);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!mediaFile) return;

    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", mediaFile);
    formData.append("kind", "video");

    try {
      const response = await fetch(`${import.meta.env.VITE_NEXAPA_API_BASE_URL || "/api/v1"}/media-assets/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      setMediaAsset(result.data);
      setUploadProgress(100);
    } catch (err) {
      setError("Media upload failed. Please try again.");
      setUploadProgress(null);
    }
  }, [mediaFile]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAccountId) {
      setError("Please select a TikTok account");
      return;
    }

    if (!mediaAsset) {
      setError("Please upload a video");
      return;
    }

    const now = new Date();
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);

    if (scheduled.getTime() - now.getTime() < 5 * 60 * 1000) {
      setError("Schedule must be at least 5 minutes in the future");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        connected_account_id: selectedAccountId,
        media_asset_id: mediaAsset.id,
        caption: caption || null,
        action: "schedule" as const,
        post_type: "video" as const,
        scheduled_at: scheduled.toISOString(),
        timezone,
        platform_settings: {
          privacy_level: privacyLevel,
          disable_comment: disableComment,
          disable_duet: disableDuet,
          disable_stitch: disableStitch,
          brand_content_toggle: brandContentToggle,
        },
      };

      await createSchedulePost(payload);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
      setIsSubmitting(false);
    }
  }, [selectedAccountId, scheduledDate, scheduledTime, timezone, caption, mediaAsset, privacyLevel, disableComment, disableDuet, disableStitch, brandContentToggle, onSuccess, handleClose]);

  const canSubmit = useMemo(() => {
    if (!selectedAccountId) return false;
    if (!mediaAsset) return false;

    const now = new Date();
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);

    if (scheduled.getTime() - now.getTime() < 5 * 60 * 1000) return false;

    return !isSubmitting;
  }, [selectedAccountId, mediaAsset, scheduledDate, scheduledTime, isSubmitting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="ml-auto h-full w-full max-w-[560px] overflow-hidden bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {step === "compose" ? "Schedule TikTok Video" : "Preview Schedule"}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Schedule video post to TikTok</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "compose" ? (
            <div className="space-y-5">
              {/* Destination */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  TikTok Account <span className="text-rose-500">*</span>
                </label>
                {tiktokAccounts.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-700">
                    No connected TikTok accounts available. Please connect a TikTok account first.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  >
                    {tiktokAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Video <span className="text-rose-500">*</span>
                </label>

                {!mediaAsset ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-[12px] font-medium text-slate-700">
                      Click to upload video
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      MP4, MOV, WebM
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center">
                        🎬
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-slate-900">{mediaAsset.storage_path}</p>
                        <p className="text-[10px] text-slate-400">
                          {mediaAsset.status === "ready" ? "Ready" : "Processing"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {mediaFile && !mediaAsset && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploadProgress !== null}
                    className="mt-2 w-full rounded-lg bg-pink-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-pink-700 disabled:opacity-50"
                  >
                    {uploadProgress !== null ? `Uploading... ${uploadProgress}%` : "Upload Video"}
                  </button>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Write a caption..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-5 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                />
                <p className="mt-1 text-[10px] text-slate-400">{caption.length} characters</p>
              </div>

              {/* Privacy Settings */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Privacy Settings
                </label>
                <select
                  value={privacyLevel}
                  onChange={(e) => setPrivacyLevel(e.target.value as typeof privacyLevel)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="PUBLIC_TO_EVERYONE">Public to Everyone</option>
                  <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                  <option value="FOLLOWER_OF_CREATOR">Followers</option>
                  <option value="SELF_ONLY">Private</option>
                </select>
              </div>

              {/* Toggle Settings */}
              <div className="space-y-2">
                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 cursor-pointer">
                  <span className="text-[12px] font-medium text-slate-700">Disable Comments</span>
                  <input
                    type="checkbox"
                    checked={disableComment}
                    onChange={(e) => setDisableComment(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 cursor-pointer">
                  <span className="text-[12px] font-medium text-slate-700">Disable Duet</span>
                  <input
                    type="checkbox"
                    checked={disableDuet}
                    onChange={(e) => setDisableDuet(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 cursor-pointer">
                  <span className="text-[12px] font-medium text-slate-700">Disable Stitch</span>
                  <input
                    type="checkbox"
                    checked={disableStitch}
                    onChange={(e) => setDisableStitch(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 cursor-pointer">
                  <span className="text-[12px] font-medium text-slate-700">Branded Content</span>
                  <input
                    type="checkbox"
                    checked={brandContentToggle}
                    onChange={(e) => setBrandContentToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>
              </div>

              {/* Schedule DateTime */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Schedule Time <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-lg">
                    🎵
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">
                      {tiktokAccounts.find((a) => a.id === selectedAccountId)?.name || "TikTok Account"}
                    </p>
                    <p className="text-[10px] text-slate-400">Scheduled Video</p>
                  </div>
                </div>

                {mediaAsset && (
                  <div className="mb-3 rounded bg-slate-100 aspect-[9/16] max-h-[300px] flex items-center justify-center">
                    <span className="text-4xl">🎬</span>
                  </div>
                )}

                {caption && (
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{caption}</p>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                    <span>📅</span>
                    <span>
                      {new Date(scheduledDate).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </span>
                    <span>•</span>
                    <span>{scheduledTime}</span>
                    <span>•</span>
                    <span>{timezone}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Privacy: {privacyLevel.replace(/_/g, " ").toLowerCase()}
                    {disableComment && " • Comments off"}
                    {disableDuet && " • Duet off"}
                    {disableStitch && " • Stitch off"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={() => setStep("compose")}
            className={cn(
              "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors",
              step === "compose" && "invisible"
            )}
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {step === "compose" ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  disabled={!canSubmit}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  Preview
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="rounded-lg bg-pink-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule TikTok Video"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
