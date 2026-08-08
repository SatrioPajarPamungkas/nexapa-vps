import { Copy, Trash2, Download, Loader2, RotateCcw } from "lucide-react";
import type { DownloadQueueItem, DownloadPlatform } from "../downloader.types";
import type { DownloadBatchStatus } from "@/lib/api/response.types";
import { cn } from "@/lib/cn";
import { PlatformBadge } from "./PlatformBadge";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type BatchCardProps = {
  batchId: string;
  jobs: DownloadQueueItem[];
  selectedIds: Set<string>;
  onToggleBatch: (batchId: string) => void;
  onRemoveBatch: (batchId: string) => void;
  onCopyBatch: (batchId: string) => void;
  onDownloadZip: (batchId: string) => void;
  onCancelBatch?: (batchId: string) => void;
  onRetryFailedBatch?: (batchId: string) => void;
  onDeleteBatch?: (batchId: string) => void;
  actionLoading?: Set<string>;
  isTerminal: boolean;
  canDownloadZip: boolean;
  availableFiles: number;
  metadata?: {
    batchId: string;
    sourceUrl: string;
    sourceName: string;
    platform: string;
    results: Array<{
      resultId: string;
      title: string;
      originalUrl: string;
      thumbnailUrl: string | null;
    }>;
  };
  status?: DownloadBatchStatus;
  expanded: boolean;
  onToggleExpanded: () => void;
};

function ThumbnailGrid({ jobs, metadata }: { jobs: DownloadQueueItem[]; metadata?: BatchCardProps["metadata"] }) {
  const sourceResults = metadata?.results ?? jobs;
  const hasOverflow = sourceResults.length > 6;
  const visibleResults = hasOverflow ? sourceResults.slice(0, 5) : sourceResults.slice(0, 6);
  const remaining = hasOverflow ? sourceResults.length - 5 : 0;

  return (
    <div className="flex gap-1">
      {visibleResults.map((result, idx) => (
        <div
          key={"resultId" in result ? result.resultId : result.id}
          className="relative h-10 w-10 overflow-hidden rounded border border-white/15 bg-slate-950/10"
        >
          {"thumbnailUrl" in result && result.thumbnailUrl ? (
            <img
              src={result.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10">
              <span className="text-[8px] text-slate-600">{idx + 1}</span>
            </div>
          )}
        </div>
      ))}

      {hasOverflow && (
        <div className="flex h-10 w-10 items-center justify-center rounded border border-white/15 bg-white/12 text-[10px] font-medium text-slate-700 backdrop-blur-xl">
          +{remaining}
        </div>
      )}
    </div>
  );
}
export function DownloadQueueBatchCard({
  batchId,
  jobs,
  selectedIds,
  onToggleBatch,
  onRemoveBatch,
  onCopyBatch,
  onDownloadZip,
  onCancelBatch,
  onRetryFailedBatch,
  onDeleteBatch,
  actionLoading,
  canDownloadZip,
  availableFiles,
  metadata,
  status,
  expanded,
  onToggleExpanded,
}: BatchCardProps) {
  const allSelected = jobs.every((j) => selectedIds.has(j.id));
  const someSelected = jobs.some((j) => selectedIds.has(j.id));
  const isLoading = actionLoading?.has(batchId) ?? false;

  // Use batch status from API if available, otherwise calculate based on individual job statuses
  const queuedCount = status?.queued ?? jobs.filter(job => job.status === "queued").length;
  const claimedCount = status?.claimed ?? jobs.filter(job => job.status === "claimed").length;
  const processingCount = status?.processing ?? jobs.filter(job => job.status === "processing").length;
  const completedCount = status?.completed ?? jobs.filter(job => job.status === "completed").length;
  const partiallyCompletedCount = jobs.filter(job => job.status === "partially_completed").length;
  const failedCount = status?.failed ?? jobs.filter(job => job.status === "failed").length;
  const cancelledCount = status?.cancelled ?? jobs.filter(job => job.status === "cancelled").length;
  const skippedCount = status?.skipped ?? 0;

  const activeProcessing = queuedCount + claimedCount + processingCount;
  const successfulJobs = completedCount + partiallyCompletedCount;
  const failedJobs = failedCount + cancelledCount + skippedCount;
  const totalJobs = status?.total ?? jobs.length;

  const platform = (metadata?.platform ?? jobs[0]?.platform ?? "generic") as DownloadPlatform;
  const sourceUrl = metadata?.sourceUrl ?? jobs[0]?.originalUrl ?? "";
  const sourceName = metadata?.sourceName ?? jobs[0]?.title ?? `Batch ${batchId.slice(0, 8)}`;

  // Determine status label and color
  let statusLabel = "Processing";
  let statusColor = "text-blue-600";
  const isBatchTerminal = status?.is_terminal ?? (activeProcessing === 0 && totalJobs > 0);

  if (isBatchTerminal) {
    if (failedJobs > 0 && successfulJobs === 0) {
      statusLabel = "Failed";
      statusColor = "text-rose-600";
    } else if (successfulJobs > 0) {
      statusLabel = "Completed";
      statusColor = "text-emerald-600";
    }
  }

  // Progress calculation
  const progressPercent = status?.progress ?? (totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0);

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${sourceName}, ${allSelected ? "selected" : someSelected ? "partially selected" : "not selected"}. Press Enter or Space to toggle batch selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggleBatch(batchId);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggleBatch(batchId);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        allSelected
          ? "border-blue-300/50 bg-blue-500/10 shadow-[0_10px_30px_rgba(2,6,23,0.12)] ring-1 ring-blue-200/50"
          : "border-white/12 bg-white/8 hover:border-white/20 hover:bg-white/15 hover:shadow-[0_10px_30px_rgba(2,6,23,0.14)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <SelectionCheckbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={() => onToggleBatch(batchId)}
            ariaLabel={`${allSelected ? "Deselect" : "Select"} batch ${sourceName}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={platform} />
            <span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-700 backdrop-blur-xl">
              Profile scrape
            </span>
            <span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-700 backdrop-blur-xl">
              {jobs.length} items
            </span>
          </div>

          <p className="mt-1 truncate text-[13px] font-medium text-slate-950" title={sourceName}>
            {sourceName}
          </p>

          <p className="truncate text-[11px] text-slate-600" title={sourceUrl}>
            {sourceUrl}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <p className={cn("text-[10px] font-medium", statusColor)}>
              {statusLabel}
            </p>
            {!isBatchTerminal && (
              <>
                <span className="text-[10px] text-slate-600">
                  {Math.round(progressPercent)}% • {successfulJobs} of {totalJobs}
                </span>
                {activeProcessing > 0 && (
                  <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                )}
              </>
            )}
            {isBatchTerminal && failedJobs > 0 && (
              <span className="text-[10px] text-rose-700">
                {failedJobs} failed
              </span>
            )}
          </div>
        </div>

        <ThumbnailGrid jobs={jobs} metadata={metadata} />
      </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <div className="flex items-center gap-1">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              ) : (
                <>
                  {onCancelBatch && !isBatchTerminal && (
                    <button
                      type="button"
                      aria-label="Cancel batch"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelBatch(batchId);
                      }}
                      disabled={actionLoading?.has(batchId) ?? false}
                      className="inline-flex h-7 min-w-[52px] items-center justify-center rounded-lg border border-white/20 bg-white/12 px-2 text-slate-700 backdrop-blur-xl transition hover:bg-amber-500/15 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel batch"
                    >
                      {(actionLoading?.has(batchId) ?? false) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-medium">Cancel Batch</span>
                      )}
                    </button>
                  )}
                  {onRetryFailedBatch && isBatchTerminal && failedJobs > 0 && (
                    <button
                      type="button"
                      aria-label="Retry failed jobs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryFailedBatch(batchId);
                      }}
                      disabled={actionLoading?.has(batchId) ?? false}
                      className="inline-flex h-7 min-w-[52px] items-center justify-center rounded-lg border border-white/20 bg-white/12 px-2 text-slate-700 backdrop-blur-xl transition hover:bg-blue-500/15 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Retry failed jobs"
                    >
                      {(actionLoading?.has(batchId) ?? false) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                          <span className="text-[10px] font-medium">Retry Failed ({failedJobs})</span>
                        </>
                      )}
                    </button>
                  )}
                  {onDeleteBatch && isBatchTerminal && (
                    <button
                      type="button"
                      aria-label="Delete batch"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBatch(batchId);
                      }}
                      disabled={actionLoading?.has(batchId) ?? false}
                      className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/12 px-2 text-slate-600 backdrop-blur-xl transition hover:bg-rose-500/15 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete batch"
                    >
                      {(actionLoading?.has(batchId) ?? false) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /><span className="text-[10px] font-medium">Delete Batch</span></>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse batch children" : "Expand batch children"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpanded();
                    }}
                    className="inline-flex h-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 px-2 text-[10px] font-medium text-slate-600 backdrop-blur-xl transition hover:bg-white/22 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Copy batch URLs`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyBatch(batchId);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-white/22 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    title="Copy URLs"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove batch`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBatch(batchId);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-rose-500/15 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    title="Remove batch"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadZip(batchId);
              }}
              disabled={
                activeProcessing > 0 ||
                (isBatchTerminal && (!canDownloadZip || availableFiles <= 0))
              }
              className={cn(
                "inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                activeProcessing > 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : isBatchTerminal && canDownloadZip && availableFiles > 0
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
              title={
                activeProcessing > 0
                  ? "Processing"
                  : isBatchTerminal && canDownloadZip && availableFiles > 0
                  ? `Download ZIP (${availableFiles} files)`
                  : successfulJobs > 0
                  ? "File Missing"
                  : "Unavailable"
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {activeProcessing > 0
                ? "Processing"
                : isBatchTerminal && canDownloadZip && availableFiles > 0
                ? `Download ZIP (${availableFiles} files)`
                : successfulJobs > 0
                ? "File Missing"
                : "Unavailable"}
            </button>
          </div>
    </div>
  );
}
