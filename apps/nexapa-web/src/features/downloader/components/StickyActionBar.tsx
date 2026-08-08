import { Download, Trash2, X, RotateCcw, Library, Loader2 } from "lucide-react";

import type { DownloadQueueItem } from "../downloader.types";
import { canCancelDownloadJob, canRetryDownloadJob, canDeleteDownloadJob } from "../downloader.utils";

type Props = {
  itemCount: number;
  selectedCount: number;
  selectedItems: DownloadQueueItem[];
  isSubmitting?: boolean;
  onCancelSelected: () => void;
  onRetrySelected: () => void;
  onRemoveSelected: () => void;
  onDownloadMediaSelected: () => void;
  onClearQueue: () => void;
};

export function StickyActionBar({
  itemCount,
  selectedCount,
  selectedItems,
  isSubmitting,
  onCancelSelected,
  onRetrySelected,
  onRemoveSelected,
  onDownloadMediaSelected,
  onClearQueue,
}: Props) {
  const hasSelection = selectedCount > 0;

  const hasCancellable = selectedItems.some((i) => canCancelDownloadJob(i.status));
  const hasRetryable = selectedItems.some((i) => canRetryDownloadJob(i.status));
  const hasDeletable = selectedItems.some((i) => canDeleteDownloadJob(i.status));
  const hasDownloadable = selectedItems.some(
    (i) => (i.status === "completed" || i.status === "partially_completed") && i.mediaAssetsCount > 0,
  );

  return (
    <div className="sticky-action-bar sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-white/20 bg-white/10 px-4 py-3 shadow-[0_-4px_20px_rgba(2,6,23,0.08)] backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/12 px-2.5 py-1 text-[12px] font-medium text-slate-800 backdrop-blur-xl">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/50 bg-blue-500/12 px-2.5 py-1 text-[12px] font-medium text-blue-800">
              {selectedCount} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSelection && hasCancellable && (
            <button
              type="button"
              onClick={onCancelSelected}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-amber-500/12 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Cancel selected</span>
              <span className="sm:hidden">Cancel</span>
            </button>
          )}

          {hasSelection && hasRetryable && (
            <button
              type="button"
              onClick={onRetrySelected}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-blue-500/12 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Retry selected</span>
              <span className="sm:hidden">Retry</span>
            </button>
          )}

          {hasSelection && hasDownloadable && (
            <button
              type="button"
              onClick={onDownloadMediaSelected}
              disabled={isSubmitting}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-200/50 bg-emerald-500/12 px-3 py-1.5 text-[12px] font-medium text-emerald-800 backdrop-blur-xl transition hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Download media</span>
              <span className="sm:hidden">Download</span>
            </button>
          )}

          {hasSelection && hasDownloadable && (
            <button
              type="button"
              onClick={() => { window.location.href = "/library"; }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Library className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Media Library</span>
              <span className="sm:hidden">Library</span>
            </button>
          )}

          {hasSelection && hasDeletable && (
            <button
              type="button"
              onClick={onRemoveSelected}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-rose-500/12 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Remove selected</span>
              <span className="sm:hidden">Remove</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearQueue}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear queue</span>
            <span className="sm:hidden">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
}
