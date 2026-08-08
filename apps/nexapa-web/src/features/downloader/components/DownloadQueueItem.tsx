import { useState } from "react";
import { Copy, Trash2, Clock3, AlertTriangle, Film, FileText, UserCircle, PlayCircle, RotateCcw, X, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { deleteDownloadJob } from "@/lib/api/download-jobs";
import type { DownloadQueueItem as QueueItemType, SourceType } from "../downloader.types";
import { shortenUrl, formatTime, getJobStatusLabel, isJobActive, getProgressWidth, canCancelDownloadJob, canRetryDownloadJob, canDeleteDownloadJob } from "../downloader.utils";
import { PlatformBadge } from "./PlatformBadge";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  item: QueueItemType;
  selected: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  actionLoading?: Set<string>;
};

function SourceIcon({ type }: { type: SourceType }) {
  switch (type) {
    case "video":
      return <PlayCircle className="h-3 w-3" aria-hidden="true" />;
    case "post":
      return <FileText className="h-3 w-3" aria-hidden="true" />;
    case "profile":
    case "channel":
      return <UserCircle className="h-3 w-3" aria-hidden="true" />;
    default:
      return <Film className="h-3 w-3" aria-hidden="true" />;
  }
}

function StatusIndicator({ item }: { item: QueueItemType }) {
  const isActive = isJobActive(item.status);
  const progressWidth = getProgressWidth(item.progress);

  const statusColors: Record<string, string> = {
    queued: "text-slate-500",
    analyzing: "text-blue-600",
    awaiting_selection: "text-amber-600",
    ready: "text-cyan-600",
    claimed: "text-blue-600",
    processing: "text-blue-600",
    completed: "text-emerald-600",
    partially_completed: "text-emerald-600",
    failed: "text-rose-600",
    cancelled: "text-slate-400",
  };

  const label = getJobStatusLabel(item.status);
  const color = statusColors[item.status] ?? "text-slate-500";

  return (
    <div className="flex-1">
      {isActive && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-300"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      )}
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className={cn("text-[10px] font-medium", color)}>{label}</p>
        {item.currentStage && isActive && (
          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.currentStage}</p>
        )}
        {item.progress !== null && isActive && (
          <p className="text-[10px] text-slate-400">{item.progress}%</p>
        )}
      </div>
    </div>
  );
}

function getDownloadLabel(item: QueueItemType): string {
  if (item.mediaAssetsCount <= 0) return "Download";

  // For single file, show extension
  if (item.mediaAssetsCount === 1) {
    // We'd need the actual extension from media asset
    // For now use output format as hint
    if (item.outputFormat === "audio") return "Audio";
    if (item.outputFormat === "original") return "File";
    return "MP4";
  }

  // Multiple files - ZIP
  return `ZIP (${item.mediaAssetsCount} files)`;
}

async function saveUrlAsFile(
  url: string,
  filename: string,
): Promise<void> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60_000);
  }
}

export function DownloadQueueItemRow({ item, selected, onToggle, onRemove, onCopy, onCancel, onRetry, actionLoading }: Props) {
  const short = shortenUrl(item.normalizedUrl, 72);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const isLoading =
    (actionLoading?.has(item.id) ?? false) || isDownloading;

  const canCancel = canCancelDownloadJob(item.status);
  const canRetry = canRetryDownloadJob(item.status);
  const canDelete = canDeleteDownloadJob(item.status);

  // Determine if the item can be downloaded based on status and has_downloadable_file
  const canDownload =
    (item.status === "completed" || item.status === "partially_completed") &&
    item.mediaAssetsCount > 0;

  const hasDownloadableFile = item.has_downloadable_file ?? canDownload;

  const handleDownload = async (): Promise<void> => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const base = (
        import.meta.env.VITE_NEXAPA_API_BASE_URL ?? ""
      ).replace(/\/+$/, "");

      // Use the new archive endpoint for all downloads
      const safeTitle = item.title
        .replace(/[\\/:*?"<>|]+/g, "_")
        .trim();

      await saveUrlAsFile(
        `${base}/download-jobs/${encodeURIComponent(item.id)}/archive`,
        `${safeTitle || item.id}.zip`,
      );

      // Bersihkan selection sebelum card disembunyikan.
      if (selected) {
        onToggle(item.id);
      }

      // Blob sudah diterima browser, card boleh hilang.
      setIsHidden(true);

      // Hapus job dan file temporer dari backend.
      try {
        await deleteDownloadJob(item.id);
      } catch (deleteError) {
        console.error(
          "File downloaded but job cleanup failed:",
          deleteError,
        );
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isHidden) {
    return null;
  }

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${item.title}, ${selected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggle(item.id);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggle(item.id);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-xl border px-3 py-3 backdrop-blur-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-4",
        selected
          ? "border-blue-300/50 bg-blue-500/10 shadow-[0_10px_30px_rgba(2,6,23,0.12)] ring-1 ring-blue-200/50"
          : "border-white/12 bg-white/8 hover:border-white/20 hover:bg-white/15 hover:shadow-[0_10px_30px_rgba(2,6,23,0.14)]",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="pt-1">
          <SelectionCheckbox
            checked={selected}
            onChange={() => onToggle(item.id)}
            ariaLabel={`${selected ? "Deselect" : "Select"} ${item.title}${item.isDemo ? " DEMO" : ""}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={item.platform} />
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-700 backdrop-blur-xl">
              <SourceIcon type={item.sourceType} />
              <span className="capitalize">{item.sourceType}</span>
            </span>
            <span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-700 backdrop-blur-xl">
              {item.outputFormat === "original" ? "ORIGINAL" : item.outputFormat.toUpperCase()} · {item.quality === "best" ? "Best" : item.quality}
            </span>
            {item.isDemo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/50 bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" /> DEMO
              </span>
            )}
            {(item.status === "completed" || item.status === "partially_completed") && (
              <span className="rounded-full border border-emerald-200/50 bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                {item.mediaAssetsCount} file{item.mediaAssetsCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <p className="mt-1.5 truncate text-[13px] font-medium text-slate-950" title={item.title}>
            {item.title}
          </p>

          <p className="hidden truncate text-[11px] text-slate-600 sm:block" title={item.normalizedUrl}>
            {short}
          </p>

          <div className="mt-1.5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
              <Clock3 className="h-3 w-3" aria-hidden="true" /> {formatTime(item.createdAt)}
            </span>

            <StatusIndicator item={item} />
          </div>

          {item.status === "failed" && item.errorMessage && (
            <p className="mt-1 truncate text-[11px] text-rose-700" title={item.errorMessage}>
              {item.errorCode ? `[${item.errorCode}] ` : ""}{item.errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <>
              {canCancel && onCancel && (
                <button
                  type="button"
                  aria-label="Cancel job"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCancel(item.id); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-amber-500/15 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="Cancel job"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              {canRetry && onRetry && (
                <button
                  type="button"
                  aria-label="Retry job"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRetry(item.id); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-blue-500/15 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="Retry job"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                aria-label={
                  item.status === "queued" || item.status === "claimed" || item.status === "processing"
                    ? "Processing"
                    : (item.status === "completed" || item.status === "partially_completed")
                    ? hasDownloadableFile
                      ? `Download ${getDownloadLabel(item)} ${item.title}`
                      : "File Missing"
                    : "Unavailable"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if ((item.status === "completed" || item.status === "partially_completed") && hasDownloadableFile) {
                    void handleDownload();
                  }
                }}
                disabled={
                  isDownloading ||
                  (item.status === "queued" || item.status === "claimed" || item.status === "processing") ||
                  ((item.status === "completed" || item.status === "partially_completed") && !hasDownloadableFile) ||
                  (item.status === "failed" || item.status === "cancelled")
                }
                className={cn(
                  "inline-flex min-h-[28px] items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  item.status === "queued" || item.status === "claimed" || item.status === "processing"
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : (item.status === "completed" || item.status === "partially_completed")
                    ? hasDownloadableFile
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
                title={
                  item.status === "queued" || item.status === "claimed" || item.status === "processing"
                    ? "Processing"
                    : (item.status === "completed" || item.status === "partially_completed")
                    ? hasDownloadableFile
                      ? `Download ${getDownloadLabel(item)}`
                      : "File Missing"
                    : "Unavailable"
                }
              >
                <Download className="h-3 w-3" aria-hidden="true" />
                {item.status === "queued" || item.status === "claimed" || item.status === "processing"
                  ? "Processing"
                  : (item.status === "completed" || item.status === "partially_completed")
                  ? hasDownloadableFile
                    ? getDownloadLabel(item)
                    : "File Missing"
                  : "Unavailable"}
              </button>
              <button
                type="button"
                aria-label={`Copy URL ${item.originalUrl}`}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCopy(item.id); }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-white/22 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                title={item.originalUrl}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Remove ${item.title}`}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(item.id); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-rose-500/15 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="sm:hidden">
        <p className="break-all text-[12px] leading-5 text-slate-600" title={item.normalizedUrl}>
          {item.normalizedUrl}
        </p>
      </div>
    </div>
  );
}
