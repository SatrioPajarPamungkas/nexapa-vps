import { Search, Filter, X, Calendar, LayoutList } from "lucide-react";
import type { HistoryFilter, HistorySort, HistoryView, HistoryCategory, HistoryStatus } from "../history.types";
import { HISTORY_CATEGORIES, STATUS_LABELS } from "../history.constants";
import { cn } from "@/lib/cn";

type Props = {
  filter: HistoryFilter;
  sort: HistorySort;
  view: HistoryView;
  onFilterChange: (f: HistoryFilter) => void;
  onSortChange: (s: HistorySort) => void;
  onViewChange: (v: HistoryView) => void;
  onClearFilters: () => void;
  visibleCount: number;
  selectedCount: number;
  hasActiveFilters: boolean;
};

export function HistoryToolbar({ filter, sort, view, onFilterChange, onSortChange, onViewChange, onClearFilters, visibleCount, selectedCount, hasActiveFilters }: Props) {
  return (
    <div className="space-y-2">
      {/* Main toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
        <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            placeholder="Search activity..."
            aria-label="Search history"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2 text-[11px] placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
          />
        </div>

        <Filter className="h-3.5 w-3.5 text-slate-400" />

        <select
          value={filter.category}
          onChange={(e) => onFilterChange({ ...filter, category: e.target.value as HistoryCategory | "all" })}
          aria-label="Filter by category"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none"
        >
          <option value="all">All activity</option>
          {HISTORY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <select
          value={filter.status}
          onChange={(e) => onFilterChange({ ...filter, status: e.target.value as HistoryStatus | "all" })}
          aria-label="Filter by status"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as HistoryStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select
          value={filter.dateRange}
          onChange={(e) => onFilterChange({ ...filter, dateRange: e.target.value as HistoryFilter["dateRange"] })}
          aria-label="Filter by date"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none"
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as HistorySort)}
          aria-label="Sort"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="category">Category</option>
          <option value="status">Status</option>
        </select>

        {/* View toggle */}
        <div className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => onViewChange("timeline")}
            aria-pressed={view === "timeline"}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              view === "timeline" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100",
            )}
            title="Timeline view"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            aria-pressed={view === "list"}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              view === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100",
            )}
            title="List view"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Count + clear */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="tabular-nums">{visibleCount}</span>
          {selectedCount > 0 && <span className="font-medium text-blue-600">{selectedCount} sel</span>}
          {hasActiveFilters && (
            <button type="button" onClick={onClearFilters} className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 transition-colors">
              <X className="h-2.5 w-2.5" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
