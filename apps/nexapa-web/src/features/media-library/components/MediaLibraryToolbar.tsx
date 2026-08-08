import { CheckSquare, LayoutGrid, List, Search, Square, X } from "lucide-react";
import type { MediaFilter, MediaSort, MediaViewMode } from "../media-library.types";
import { cn } from "@/lib/cn";

type Props = {
  filter: MediaFilter;
  sort: MediaSort;
  view: MediaViewMode;
  resultCount: number;
  totalCount: number;
  selectedCount: number;
  selectAllMatching: boolean;
  onSearch: (v: string) => void;
  onTypeChange: (t: MediaFilter["type"]) => void;
  onStatusChange: (s: MediaFilter["status"]) => void;
  onSortChange: (s: MediaSort) => void;
  onViewChange: (v: MediaViewMode) => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
  onClearFilters: () => void;
};

export function MediaLibraryToolbar({
  filter,
  sort,
  view,
  resultCount,
  totalCount,
  selectedCount,
  selectAllMatching,
  onSearch,
  onTypeChange,
  onStatusChange,
  onSortChange,
  onViewChange,
  onSelectAllMatching,
  onClearSelection,
  onClearFilters,
}: Props) {
  const hasActiveFilters =
    filter.search.trim() !== "" || filter.type !== "all" || filter.status !== "all";

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
            <label htmlFor="media-search" className="sr-only">
              Search media
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              id="media-search"
              type="search"
              value={filter.search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name, tag..."
              className="h-9 w-full rounded-xl border border-white/20 bg-white/12 pl-9 pr-3 text-[13px] text-slate-950 backdrop-blur-xl placeholder:text-slate-600 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={selectAllMatching}
              disabled={selectAllMatching || resultCount === 0}
              onClick={onSelectAllMatching}
              className={cn(
                "inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50",
                selectAllMatching
                  ? "cursor-default border-blue-300/50 bg-blue-500/15 text-blue-800"
                  : "border-white/20 bg-white/12 text-slate-800 hover:bg-white/22",
              )}
            >
              {selectAllMatching ? (
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {selectAllMatching ? "All Selected" : "Select All"}
            </button>
            {(selectedCount > 0 || selectAllMatching) && (
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear Selection
              </button>
            )}
            <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/5 p-0.5 backdrop-blur-xl">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => onViewChange("grid")}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  view === "grid" ? "bg-white/20 text-slate-950 shadow-sm ring-1 ring-white/15" : "text-slate-600 hover:bg-white/10 hover:text-slate-900",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => onViewChange("list")}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  view === "list" ? "bg-white/20 text-slate-950 shadow-sm ring-1 ring-white/15" : "text-slate-600 hover:bg-white/10 hover:text-slate-900",
                )}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <span className="text-[11px] text-slate-700">
              {resultCount} of {totalCount}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-type" className="text-[11px] font-medium text-slate-700">
              Type
            </label>
            <select
              id="filter-type"
              value={filter.type}
              onChange={(e) => onTypeChange(e.target.value as MediaFilter["type"])}
              className="h-8 rounded-lg border border-white/20 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="all">All</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-status" className="text-[11px] font-medium text-slate-700">
              Status
            </label>
            <select
              id="filter-status"
              value={filter.status}
              onChange={(e) => onStatusChange(e.target.value as MediaFilter["status"])}
              className="h-8 rounded-lg border border-white/20 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="all">All statuses</option>
              <option value="local-preview">Local preview</option>
              <option value="metadata-ready">Metadata ready</option>
              <option value="limited-metadata">Limited metadata</option>
              <option value="ready-to-publish">Ready to Publish</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-sort" className="text-[11px] font-medium text-slate-700">
              Sort
            </label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as MediaSort)}
              className="h-8 rounded-lg border border-white/20 bg-white/15 px-2 text-[12px] text-slate-900 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="recent">Recently added</option>
              <option value="oldest">Oldest added</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="largest">Largest</option>
              <option value="smallest">Smallest</option>
              <option value="longest">Longest</option>
              <option value="shortest">Shortest</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/22"
            >
              <X className="h-3 w-3" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
