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

type PostType = "text" | "image" | "video";
type Step = "compose" | "preview";

export function FacebookScheduleComposer({ open, onClose, accounts, onSuccess }: Props) {
  const [postType, setPostType] = useState<PostType>("text");
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const facebookAccounts = useMemo(
    () => accounts.filter((a) => a.platform === "facebook" && a.status === "connected" && a.is_publishable),
    [accounts]
  );

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setScheduledTime("10:00");

      if (facebookAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(facebookAccounts[0].id);
      }
    }
  }, [open, facebookAccounts, selectedAccountId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = useCallback(() => {
    setPostType("text");
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

    const validTypes = postType === "image"
      ? ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      : ["video/mp4", "video/mov", "video/webm"];

    if (!validTypes.includes(file.type)) {
      setError(postType === "image"
        ? "Please select a valid image file (JPG, PNG, WebP)"
        : "Please select a valid video file (MP4, MOV, WebM)"
      );
      return;
    }

    setMediaFile(file);
    setError(null);

    const mockMediaAsset: MediaAsset = {
      id: `temp-${Date.now()}`,
      media_type: postType === "image" ? "image" : "video",
      storage_path: file.name,
      status: "ready",
    };
    setMediaAsset(mockMediaAsset);
  }, [postType]);

  const handleUpload = useCallback(async () => {
    if (!mediaFile) return;

    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", mediaFile);
    formData.append("kind", postType === "image" ? "image" : "video");

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
  }, [mediaFile, postType]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAccountId) {
      setError("Please select a Facebook Page");
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
        media_asset_id: mediaAsset?.id || null,
        caption: caption || null,
        action: "schedule" as const,
        post_type: postType,
        scheduled_at: scheduled.toISOString(),
        timezone,
        platform_settings: {
          post_type: postType,
        },
      };

      await createSchedulePost(payload);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
      setIsSubmitting(false);
    }
  }, [selectedAccountId, scheduledDate, scheduledTime, timezone, caption, mediaAsset, postType, onSuccess, handleClose]);

  const canSubmit = useMemo(() => {
    if (!selectedAccountId) return false;
    if (postType === "text" && !caption.trim()) return false;
    if ((postType === "image" || postType === "video") && !mediaAsset) return false;

    const now = new Date();
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);

    if (scheduled.getTime() - now.getTime() < 5 * 60 * 1000) return false;

    return !isSubmitting;
  }, [selectedAccountId, postType, caption, mediaAsset, scheduledDate, scheduledTime, isSubmitting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="ml-auto h-full w-full max-w-[560px] overflow-hidden bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {step === "compose" ? "Schedule Facebook Post" : "Preview Schedule"}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {postType === "text" ? "Text post" : postType === "image" ? "Image post" : "Video post"}
            </p>
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
              {/* Post Type */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Post Type</p>
                <div className="flex gap-2">
                  {(["text", "image", "video"] as PostType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setPostType(type); setMediaFile(null); setMediaAsset(null); setError(null); }}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors",
                        postType === type
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Facebook Page <span className="text-rose-500">*</span>
                </label>
                {facebookAccounts.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-700">
                    No connected Facebook Pages available. Please connect a Facebook Page first.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  >
                    {facebookAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {postType === "text" ? "Post Text" : "Caption"} {postType === "text" && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={postType === "text" ? 6 : 3}
                  placeholder={postType === "text" ? "What's on your mind?" : "Write a caption..."}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-5 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                />
                <p className="mt-1 text-[10px] text-slate-400">{caption.length} characters</p>
              </div>

              {/* Media Upload */}
              {(postType === "image" || postType === "video") && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    {postType === "image" ? "Image" : "Video"} <span className="text-rose-500">*</span>
                  </label>

                  {!mediaAsset ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-[12px] font-medium text-slate-700">
                        Click to upload {postType}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {postType === "image" ? "JPG, PNG, WebP" : "MP4, MOV, WebM"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center">
                          {postType === "image" ? "🖼️" : "🎬"}
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
                    accept={postType === "image" ? "image/*" : "video/*"}
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {mediaFile && !mediaAsset && (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploadProgress !== null}
                      className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploadProgress !== null ? `Uploading... ${uploadProgress}%` : "Upload Media"}
                    </button>
                  )}
                </div>
              )}

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
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                    📘
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">
                      {facebookAccounts.find((a) => a.id === selectedAccountId)?.name || "Facebook Page"}
                    </p>
                    <p className="text-[10px] text-slate-400">Scheduled Post</p>
                  </div>
                </div>

                {postType === "image" && mediaAsset && (
                  <div className="mb-3 rounded bg-slate-100 aspect-video flex items-center justify-center">
                    <span className="text-3xl">🖼️</span>
                  </div>
                )}
                {postType === "video" && mediaAsset && (
                  <div className="mb-3 rounded bg-slate-100 aspect-video flex items-center justify-center">
                    <span className="text-3xl">🎬</span>
                  </div>
                )}

                {caption && (
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{caption}</p>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
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
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? "Scheduling..." : `Schedule Facebook ${postType === "text" ? "Text" : postType === "image" ? "Image" : "Video"}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
