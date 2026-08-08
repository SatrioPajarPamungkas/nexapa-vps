import { Search, Filter, List, Grid3x3, Trash2 } from "lucide-react";
import { PUBLISHER_HISTORY_PLATFORMS } from "../publisher-history.constants";
import type { PublisherHistoryFilter, PublisherHistorySort, PublisherHistoryView } from "../publisher-history.types";
import { PlatformLogo } from "@/features/connected-accounts/components/PlatformLogo";
import { cn } from "@/lib/cn";

type Props = {
  filter: PublisherHistoryFilter;
  sort: PublisherHistorySort;
  view: PublisherHistoryView;
  onFilterChange: (filter: PublisherHistoryFilter) => void;
  onSortChange: (sort: PublisherHistorySort) => void;
  onViewChange: (view: PublisherHistoryView) => void;
  onClearFilters: () => void;
  visibleCount: number;
  hasActiveFilters: boolean;
  onSelectAllVisible: () => void;
  onClearHistory: () => void;
  isDeleting: boolean;
  totalRecords: number;
};

export function PublisherHistoryToolbar({
  filter,
  sort,
  view,
  onFilterChange,
  onSortChange,
  onViewChange,
  onClearFilters,
  visibleCount,
  hasActiveFilters,
  onSelectAllVisible,
  onClearHistory,
  isDeleting,
  totalRecords,
}: Props) {
  const handlePlatformChange = (platform: "all" | "facebook" | "tiktok" | "youtube" | "shopee") => {
    onFilterChange({ ...filter, platform });
  };

  return (
    <div className="space-y-3 bg-transparent">
      {/* Search and Actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-white/8 p-2 backdrop-blur-xl shadow-[0_10px_30px_rgba(2,6,23,0.08)]">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search captions, destinations..."
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-white/12 py-2 pl-9 pr-3 text-[13px] text-slate-950 placeholder:text-slate-600 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {totalRecords > 0 && (
            <>
              <button
                type="button"
                onClick={onSelectAllVisible}
                disabled={isDeleting}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/20 bg-white/12 px-3 py-2 text-[13px] font-medium text-slate-700 backdrop-blur-xl transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearHistory}
                disabled={isDeleting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-800 backdrop-blur-xl transition-colors hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Riwayat
              </button>
            </>
          )}

          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as PublisherHistorySort)}
            className="h-9 rounded-lg border border-white/20 bg-white/12 px-3 py-2 text-[13px] text-slate-700 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="recent-updated">Recently Updated</option>
          </select>

          <div className="flex items-center rounded-lg border border-white/15 bg-white/8 p-0.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-white/12",
                view === "grid" && "bg-white/22 border border-white/25 text-slate-900 shadow-sm"
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-white/12",
                view === "list" && "bg-white/22 border border-white/25 text-slate-900 shadow-sm"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-white/8 p-1.5 backdrop-blur-xl w-fit shadow-[0_10px_30px_rgba(2,6,23,0.08)]">
        {PUBLISHER_HISTORY_PLATFORMS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handlePlatformChange(option.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all border",
              filter.platform === option.id
                ? option.id === "all"
                  ? "bg-white/20 border-white/25 text-slate-950 shadow-sm"
                  : "bg-blue-500/15 border-blue-400/40 text-slate-900 shadow-sm"
                : "bg-transparent border-transparent text-slate-700 hover:bg-white/10 hover:text-slate-900"
            )}
          >
            {option.id !== "all" ? (
              <PlatformLogo platform={option.id as "facebook" | "tiktok" | "youtube" | "shopee"} className="h-4 w-4" />
            ) : (
              <Filter className="h-4 w-4" />
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/8 px-3 py-2 backdrop-blur-xl">
          <span className="text-[12px] text-slate-600">
            {visibleCount} post{visibleCount !== 1 ? "s" : ""} found
          </span>
          <button
            type="button"
            onClick={onClearFilters}
            className="text-[12px] font-medium text-blue-700 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
