import { useState, useMemo } from "react";
import { Search, CheckSquare, Square, Trash2, EyeOff, AlertTriangle, Filter, ArrowUpDown, LayoutGrid, List, Film, UserCircle, Loader2 } from "lucide-react";
import type { ProfileResultItem, ProfileResultFilter, ProfileResultSort, ViewMode } from "../downloader.types";
import { ProfileResultItemRow } from "./ProfileResultItem";
import { cn } from "@/lib/cn";
import { useNavigate } from "react-router-dom";
import { listMediaCollections } from "@/lib/api/media-collections";

type Props = {
  state: "idle" | "analyzing" | "awaiting_selection" | "results" | "empty" | "error" | "ready";
  results: ProfileResultItem[];
  filtered: ProfileResultItem[];
  filter: ProfileResultFilter;
  sort: ProfileResultSort;
  view: ViewMode;
  error: string;
  onFilterChange: (f: ProfileResultFilter) => void;
  onSortChange: (s: ProfileResultSort) => void;
  onViewChange: (v: ViewMode) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddSelectedToQueue: () => void;
  onDownloadAll: () => void;
  onLoadDemo: () => void;
  onLoadResults?: (jobId: string) => void;
  jobId?: string | null;
  individualDownloads: Record<
    string,
    | { state: "idle" }
    | { state: "processing" }
    | { state: "ready" }
    | { state: "failed" }
  >;
  selectedSubmitting: boolean;
  allSubmitting: boolean;
  profileSubmittingIds: Set<string>;
  profileProcessedIds?: Set<string>;
};

function ProfileEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto" aria-hidden="true">
      <circle cx="24" cy="24" r="23" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="24" cy="20" r="7" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <path d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="14" r="4" fill="#ecfeff" stroke="#06b6d4" strokeWidth="1" />
      <path d="M34.5 14h3M36 12.5v3" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function formatCompletedDuration(seconds: number | null): string | null {
  if (seconds === null) return null;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function ProfileResultWorkspace({
  state,
  results,
  filtered,
  filter,
  sort,
  view,
  error,
  onFilterChange,
  onSortChange,
  onViewChange,
  onToggle,
  onRemove,
  onAdd,
  onSelectAll,
  onDeselectAll,
  onAddSelectedToQueue,
  onDownloadAll,
  onLoadDemo,
  onLoadResults,
  jobId,
  individualDownloads,
  selectedSubmitting,
  allSubmitting,
  profileSubmittingIds,
  profileProcessedIds,
}: Props) {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [openLibraryError, setOpenLibraryError] = useState<string | null>(null);
  const selectedCount = results.filter((r) => r.selected).length;
  const downloadableTotal = results.filter((r) => r.originalUrl).length;
  const demoOnlyResults = results.length > 0 && results.every((r) => r.isDemo);
  const sourcePlatform = results.length > 0 ? results[0].platform : null;

  // Filter out processed results (ones that have children or are queued)
  // According to requirements: display results with child_job_id null and is_queued false
  const unprocessedFiltered = useMemo(() => {
    return filtered.filter(item => {
      // Check authoritative backend fields first
      const hasChildOrQueued = item.isQueued === true || // Explicitly check for true
                               (item.childJobId !== undefined && item.childJobId !== null);
      return !hasChildOrQueued;
    });
  }, [filtered]);

  const unprocessedResults = useMemo(() => {
    return results.filter(item => {
      // Check authoritative backend fields first
      const hasChildOrQueued = item.isQueued === true || // Explicitly check for true
                               (item.childJobId !== undefined && item.childJobId !== null);
      return !hasChildOrQueued;
    });
  }, [results]);

  const handleOpenMediaLibrary = async () => {
    if (isNavigating) return;

    // Get the job ID either from props or from the first result
    const resolvedJobId = jobId || results[0]?.jobId;

    if (!resolvedJobId) {
      setOpenLibraryError("Scrape job ID is not available.");
      return;
    }

    setIsNavigating(true);
    setOpenLibraryError(null);

    try {
      // Look up the collection by download job ID
      const collections = await listMediaCollections({
        source_type: "profile_scrape",
        download_job_id: resolvedJobId
      });

      if (collections.length > 0) {
        navigate(`/library?collection=${encodeURIComponent(collections[0].id)}`);
      } else {
        setOpenLibraryError("Scrape folder is not available yet.");
      }
    } catch (err) {
      console.error("Failed to open media library folder:", err);
      setOpenLibraryError("Failed to open the scrape folder.");
    } finally {
      setIsNavigating(false);
    }
  };

  if (state === "idle") {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center backdrop-blur-2xl">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/18 backdrop-blur-xl">
          <ProfileEmptyIcon />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold text-slate-950">Analyze a profile or channel</h3>
        <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-700">
          Paste a supported profile, creator, channel, page, or playlist URL to collect media results.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-5 py-4 backdrop-blur-2xl">
        <p className="flex items-center gap-2 text-[13px] font-medium text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error || "Invalid profile URL"}
        </p>
        <button
          type="button"
          onClick={onLoadDemo}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22"
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Load Demo Preview
        </button>
      </div>
    );
  }

  if (state === "analyzing") {
    return (
      <div className="rounded-2xl border border-blue-300/30 bg-blue-500/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
          <h3 className="mt-3 text-[15px] font-semibold text-slate-950">Analyzing profile</h3>
          <p className="mt-1.5 max-w-[500px] text-[13px] leading-6 text-slate-700">
            The download worker is extracting media entries from this profile. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  if (state === "awaiting_selection") {
    return (
      <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col items-center text-center">
          <UserCircle className="h-8 w-8 text-amber-600" aria-hidden="true" />
          <h3 className="mt-3 text-[15px] font-semibold text-slate-950">Results ready for selection</h3>
          <p className="mt-1.5 max-w-[500px] text-[13px] leading-6 text-slate-700">
            The worker found media entries. Load the results to select which ones to download.
          </p>
          {jobId && onLoadResults && (
            <button
              type="button"
              onClick={() => onLoadResults(jobId)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800"
            >
              Load Results
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "empty" || (state === "results" && filtered.length === 0 && results.length > 0)) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/18 backdrop-blur-xl">
            <Film className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[13px] font-medium text-slate-900">No results match your filters</p>
          <p className="mt-1 text-[12px] text-slate-600">Try adjusting your search or filters, or load the demo preview.</p>
          <button
            type="button"
            onClick={onLoadDemo}
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Load Demo Preview
          </button>
        </div>
      </div>
    );
  }

  // Check if this is a direct download completed job
  const allResultsHaveAssets = results.length > 0 && results.every(r => {
    const itemInIndividualDownloads = individualDownloads[r.id];
    return itemInIndividualDownloads?.state === "ready" || profileProcessedIds?.has(r.id);
  });

  if (state === "results" && allResultsHaveAssets) {
    const mediaAssetCount = results.reduce((count, r) => {
      const item = individualDownloads[r.id];
      return count + (item?.state === "ready" || profileProcessedIds?.has(r.id) ? 1 : 0);
    }, 0);

    return (
      <div className="rounded-2xl border border-green-300/30 bg-green-500/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-200/30 bg-green-500/15 backdrop-blur-xl">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-3 text-[15px] font-semibold text-slate-950">Download Complete</h3>
          <p className="mt-1.5 max-w-[500px] text-[13px] leading-6 text-slate-700">
            Successfully downloaded {mediaAssetCount} media asset{mediaAssetCount !== 1 ? 's' : ''}. The media is now available in your Media Library.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleOpenMediaLibrary}
              disabled={isNavigating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
            >
              {isNavigating ? "Opening..." : "Open Media Library"}
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-4 py-2.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22"
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Load Demo
            </button>
          </div>
          {openLibraryError && (
            <div className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-800">
              {openLibraryError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/18 backdrop-blur-xl">
            <Film className="h-5 w-5 text-slate-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[13px] font-medium text-slate-900">No media found</p>
          <p className="mt-1 text-[12px] text-slate-600">Try loading the demo preview to see the result workspace.</p>
          <button
            type="button"
            onClick={onLoadDemo}
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-[12px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Load Demo Preview
          </button>
        </div>
      </div>
    );
  }

  if (state === "ready") {
    return (
      <div className="rounded-2xl border border-green-300/30 bg-green-500/10 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.12)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-950">Profile download complete</h3>
              <p className="mt-1 text-[13px] text-slate-700">
                {results.length} media asset{results.length !== 1 ? "s" : ""} available in your Media Library.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenMediaLibrary}
              disabled={isNavigating}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
            >
              {isNavigating ? "Opening..." : "Open Media Library"}
            </button>
            {openLibraryError && (
              <div className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-800">
                {openLibraryError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => {
              const duration = formatCompletedDuration(item.durationSeconds);

              return (
                <article key={item.id} className="overflow-hidden rounded-xl border border-white/20 bg-white/12 backdrop-blur-xl">
                  <div className="flex gap-3 p-3">
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950/10">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Film className="h-6 w-6 text-slate-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 text-[13px] font-medium text-slate-950" title={item.title}>{item.title}</h4>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                        <span className="capitalize">{item.mediaType ?? "media"}</span>
                        {duration && <span>{duration}</span>}
                      </div>
                      {item.originalUrl && (
                        <a
                          href={item.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-[11px] text-blue-700 hover:underline"
                          title={item.originalUrl}
                        >
                          {item.originalUrl}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-card-enter rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[14px] font-semibold text-slate-950">Profile Results</h3>
            <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] font-medium text-slate-700 backdrop-blur-xl">
              {unprocessedFiltered.length}/{unprocessedResults.length}
            </span>
            {selectedCount > 0 && (
              <span className="rounded-full border border-blue-200/50 bg-blue-500/12 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                {selectedCount} selected
              </span>
            )}
            {results.length > 0 && results[0].isDemo && (
              <span className="rounded-full border border-amber-200/50 bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                DEMO
              </span>
            )}
            {sourcePlatform && (
              <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] text-slate-700 backdrop-blur-xl capitalize">
                {sourcePlatform}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectedCount > 0 ? onDeselectAll : onSelectAll}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {selectedCount > 0 ? <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" /> : <Square className="h-3.5 w-3.5" aria-hidden="true" />}
              {selectedCount > 0 ? "Clear" : "Select all"}
            </button>
            <button
              type="button"
              disabled={
                results.filter((r) => r.selected && r.originalUrl).length === 0 ||
                selectedSubmitting
              }
              onClick={onAddSelectedToQueue}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {selectedSubmitting
                ? "Preparing downloads..."
                : `Download selected (${results.filter((r) => r.selected && r.originalUrl).length})`}
            </button>
            {!demoOnlyResults && (
              <button
                type="button"
                disabled={downloadableTotal === 0 || selectedSubmitting}
                onClick={onDownloadAll}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-blue-300/50 bg-blue-500/10 px-3 py-1.5 text-[12px] font-medium text-blue-800 backdrop-blur-xl transition hover:bg-blue-500/15 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {allSubmitting
                  ? "Preparing all downloads..."
                  : `Download all (${downloadableTotal})`}
              </button>
            )}
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22"
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Load Demo
            </button>
            {jobId && (
              <button
                type="button"
                onClick={() => onRemove(jobId)}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-rose-300/30 bg-rose-500/10 px-2.5 py-1.5 text-[12px] font-medium text-rose-700 backdrop-blur-xl transition hover:bg-rose-500/15"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete Scrape
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search profile results by title"
                placeholder="Search results..."
                value={filter.search}
                onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
                className="h-8 w-full rounded-lg border border-white/25 bg-white/15 pl-8 pr-2.5 text-[12px] text-slate-950 backdrop-blur-xl placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <select
                aria-label="Filter by media type"
                value={filter.mediaType}
                onChange={(e) => onFilterChange({ ...filter, mediaType: e.target.value as ProfileResultFilter["mediaType"] })}
                className="h-8 rounded-lg border border-white/25 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="all">All types</option>
                <option value="video">Video</option>
                <option value="post">Post / Reel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <select
                aria-label="Sort profile results"
                value={sort}
                onChange={(e) => onSortChange(e.target.value as ProfileResultSort)}
                className="h-8 rounded-lg border border-white/25 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/22 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
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
      </div>

      <div className="p-4 sm:p-5">
        <div className={cn(view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2")}>
          {unprocessedFiltered.map((item) => (
            <ProfileResultItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onRemove={onRemove}
              onDownload={onAdd}
              viewMode={view}
              isSubmitting={profileSubmittingIds?.has(item.id) ?? false}
              isProcessed={false}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[11px] text-slate-800 backdrop-blur-xl transition hover:bg-white/22"
          >
            Select all ({unprocessedFiltered.length})
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[11px] text-slate-800 backdrop-blur-xl transition hover:bg-white/22"
          >
            Deselect all
          </button>
          <button
            type="button"
            onClick={() => filtered.forEach((r) => onRemove(r.id))}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-300/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 backdrop-blur-xl transition hover:bg-rose-500/15"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" /> Clear visible
          </button>
        </div>
      </div>
    </div>
  );
}



