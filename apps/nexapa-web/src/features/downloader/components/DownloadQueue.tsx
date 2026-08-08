import { useState } from "react";
import { Copy, Trash2, CheckSquare, Square, AlertTriangle, Search, Filter, ArrowUpDown, LayoutGrid, List } from "lucide-react";
import type { DownloadQueueItem, QueueFilter, QueueSort, ViewMode, SourceType, DownloadPlatform } from "../downloader.types";
import type { DownloadBatchStatus } from "@/lib/api/response.types";
import { DownloadQueueItemRow } from "./DownloadQueueItem";
import { DownloadQueueBatchCard } from "./DownloadQueueBatchCard";
import { cn } from "@/lib/cn";
import { getDownloadBatchArchiveUrl } from "@/lib/api/download-jobs";

type Props = {
  items: DownloadQueueItem[];
  filtered: DownloadQueueItem[];
  selectedIds: Set<string>;
  filter: QueueFilter;
  sort: QueueSort;
  view: ViewMode;
  onFilterChange: (f: QueueFilter) => void;
  onSortChange: (s: QueueSort) => void;
  onViewChange: (v: ViewMode) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
  onSelectAllFiltered: (ids: string[]) => void;
  onDeselectAll: () => void;
  onRemoveSelected: () => void;
  onCopySelected: () => Promise<boolean>;
  onClearAll: () => void;
  clipboardError: string;
  feedback: string;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onCancelBatch?: (batchId: string) => void;
  onRetryFailedBatch?: (batchId: string) => void;
  onDeleteBatch?: (batchId: string) => void;
  actionLoading?: Set<string>;
  batchActionLoading?: Set<string>;
  onDownloadZip?: (batchId: string) => void;
  batchMetadata?: Map<string, { batchId: string; sourceUrl: string; sourceName: string; platform: string; results: Array<{ resultId: string; title: string; originalUrl: string; thumbnailUrl: string | null }> }>;
  batchStatuses?: Record<string, DownloadBatchStatus>;
};

export function DownloadQueue({
  items,
  filtered,
  selectedIds,
  filter,
  sort,
  view,
  onFilterChange,
  onSortChange,
  onViewChange,
  onToggle,
  onRemove,
  onCopy,
  onSelectAllFiltered,
  onDeselectAll,
  onRemoveSelected,
  onCopySelected,
  onClearAll,
  clipboardError,
  feedback,
  onCancel,
  onRetry,
  onCancelBatch,
  onRetryFailedBatch,
  onDeleteBatch,
  actionLoading,
  batchActionLoading,
  onDownloadZip,
  batchMetadata,
  batchStatuses,
}: Props) {
  const [copyResult, setCopyResult] = useState<string>("");
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  async function handleCopySelected() {
    const ok = await onCopySelected();
    if (ok) setCopyResult(`${selectedIds.size} URL(s) copied`);
    else setCopyResult(clipboardError || "Copy failed");
    window.setTimeout(() => setCopyResult(""), 3000);
  }

  const isAllSelectedFiltered = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  // Group jobs by batch_id for profile scrapes
  // Group every job with a non-null batch_id
  // Exclude profile parent jobs (mode "profile" with no parent and no result)
  const batchGroups = new Map<string, DownloadQueueItem[]>();
  const standaloneJobs: DownloadQueueItem[] = [];

  filtered.forEach((job) => {
    // Exclude profile parent jobs from Download Queue using authoritative criteria:
    // Profile parent job: mode === "profile" && parent_download_job_id == null && download_result_id == null
    const isProfileParent =
      job.mode === "profile" &&
      job.parent_download_job_id == null &&
      job.download_result_id == null;

    if (isProfileParent) {
      return;
    }

    if (job.batch_id) {
      const existing = batchGroups.get(job.batch_id) ?? [];
      batchGroups.set(job.batch_id, [...existing, job]);
    } else {
      standaloneJobs.push(job);
    }
  });

  // Queue count represents visible cards: grouped batch cards + standalone cards
  const visibleCardCount = batchGroups.size + standaloneJobs.length;
  const selectedCardCount =
    Array.from(batchGroups.values()).filter((batch) => batch.some((job) => selectedIds.has(job.id))).length
    + standaloneJobs.filter((job) => selectedIds.has(job.id)).length;

  function handleToggleBatch(batchId: string) {
    const batch = batchGroups.get(batchId) ?? [];
    const shouldSelect = !batch.every((job) => selectedIds.has(job.id));
    batch.forEach((job) => {
      if (selectedIds.has(job.id) !== shouldSelect) onToggle(job.id);
    });
  }

  function handleRemoveBatch(batchId: string) {
    const batch = batchGroups.get(batchId);
    if (!batch) return;
    batch.forEach((j) => onRemove(j.id));
  }

  async function handleCopyBatch(batchId: string) {
    const batch = batchGroups.get(batchId);
    if (!batch) return;
    const text = batch.map((j) => j.originalUrl).join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyResult(`${batch.length} URL(s) copied`);
      } else {
        setCopyResult("Clipboard failed");
      }
    } catch {
      setCopyResult("Copy failed");
    }
    window.setTimeout(() => setCopyResult(""), 3000);
  }

  function handleDownloadZip(batchId: string) {
    if (onDownloadZip) {
      onDownloadZip(batchId);
    } else {
      // Fallback: open archive URL directly
      const url = getDownloadBatchArchiveUrl(batchId);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="animate-card-enter glass-card rounded-xl border border-white/20 shadow-card ring-1 ring-white/10">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[14px] font-semibold text-slate-950">Download Queue</h3>
            <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur-xl">
              {visibleCardCount}
            </span>
            {selectedCardCount > 0 && (
              <span className="rounded-full border border-blue-200/50 bg-blue-500/12 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                {selectedCardCount} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (isAllSelectedFiltered ? onDeselectAll() : onSelectAllFiltered(filtered.map((i) => i.id)))}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {isAllSelectedFiltered ? <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" /> : <Square className="h-3.5 w-3.5" aria-hidden="true" />}
              {isAllSelectedFiltered ? "Deselect" : `Select all`}
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleCopySelected}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={onRemoveSelected}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search queue..."
                aria-label="Search queue by URL or title"
                value={filter.search}
                onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
                className="h-8 w-full rounded-lg border border-white/25 bg-white/15 pl-8 pr-2.5 text-[12px] text-slate-950 backdrop-blur-xl placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <select
                aria-label="Filter queue by platform"
                value={filter.platform}
                onChange={(e) => onFilterChange({ ...filter, platform: e.target.value as DownloadPlatform | "all" })}
                className="h-8 rounded-lg border border-white/25 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="all">All platforms</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="generic">Generic</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <select
                aria-label="Filter queue by source type"
                value={filter.source}
                onChange={(e) => onFilterChange({ ...filter, source: e.target.value as SourceType | "all" })}
                className="h-8 rounded-lg border border-white/25 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="all">All sources</option>
                <option value="video">Video</option>
                <option value="profile">Profile</option>
                <option value="channel">Channel</option>
                <option value="playlist">Playlist</option>
                <option value="post">Post</option>
                <option value="collection">Collection</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <select
                aria-label="Sort queue"
                value={sort}
                onChange={(e) => onSortChange(e.target.value as QueueSort)}
                className="h-8 rounded-lg border border-white/25 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="recent">Recent</option>
                <option value="platform">Platform</option>
                <option value="title-asc">Title A–Z</option>
                <option value="title-desc">Title Z–A</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5 backdrop-blur-xl">
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => onViewChange("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "list" ? "bg-white/18 text-slate-950 shadow-sm ring-1 ring-white/20" : "text-slate-600 hover:bg-white/12 hover:text-slate-900",
              )}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={view === "grid"}
              onClick={() => onViewChange("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "grid" ? "bg-white/18 text-slate-950 shadow-sm ring-1 ring-white/20" : "text-slate-600 hover:bg-white/12 hover:text-slate-900",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {(feedback || copyResult) && (
          <div className="mt-2 flex items-center gap-2">
            {feedback && (
              <span className="text-[11px] text-slate-700" role="status" aria-live="polite">
                {feedback}
              </span>
            )}
            {copyResult && (
              <span className="text-[11px] font-medium text-emerald-700">{copyResult}</span>
            )}
            {clipboardError && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {clipboardError}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className={cn(view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3")}>
          {/* Render batch cards first */}
          {Array.from(batchGroups.entries()).map(([batchId, jobs]) => {
            const status = batchStatuses?.[batchId];
            const metadata = batchMetadata?.get(batchId);
            const isTerminal = status?.is_terminal ?? false;
            const canDownloadZip = status?.can_download_zip ?? false;
            const availableFiles = status?.downloadable_files_count ?? 0;
            const expanded = expandedBatches.has(batchId);
            return (
              <div key={batchId} className="space-y-2">
                <DownloadQueueBatchCard
                batchId={batchId}
                jobs={jobs}
                selectedIds={selectedIds}
                onToggleBatch={handleToggleBatch}
                onRemoveBatch={handleRemoveBatch}
                onCopyBatch={handleCopyBatch}
                onDownloadZip={handleDownloadZip}
                onCancelBatch={onCancelBatch}
                onRetryFailedBatch={onRetryFailedBatch}
                onDeleteBatch={onDeleteBatch}
                actionLoading={batchActionLoading}
                isTerminal={isTerminal}
                canDownloadZip={canDownloadZip}
                availableFiles={availableFiles}
                metadata={metadata}
                status={status}
                expanded={expanded}
                onToggleExpanded={() => {
                  setExpandedBatches((current) => {
                    const next = new Set(current);
                    if (next.has(batchId)) next.delete(batchId);
                    else next.add(batchId);
                    return next;
                  });
                }}
                />
                {expanded && (
                  <div className="space-y-2 border-l-2 border-blue-200/60 pl-3" aria-label="Batch children">
                    {jobs.map((job) => (
                      <DownloadQueueItemRow
                        key={job.id}
                        item={job}
                        selected={selectedIds.has(job.id)}
                        onToggle={onToggle}
                        onRemove={onRemove}
                        onCopy={onCopy}
                        onCancel={onCancel}
                        onRetry={onRetry}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Render standalone jobs */}
          {standaloneJobs.map((it) => (
            <DownloadQueueItemRow
              key={it.id}
              item={it}
              selected={selectedIds.has(it.id)}
              onToggle={onToggle}
              onRemove={onRemove}
              onCopy={onCopy}
              onCancel={onCancel}
              onRetry={onRetry}
              actionLoading={actionLoading}
            />
          ))}
        </div>

        {filtered.length === 0 && items.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[12px] text-slate-500">No queue items match current filters. Clear filters to see all {items.length} items.</p>
          </div>
        )}
      </div>
    </div>
  );
}
