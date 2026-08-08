import { ChevronLeft, ChevronRight, CalendarDays, CalendarClock, ListOrdered, Plus, Search, Filter, X } from "lucide-react";
import type { ScheduleView, ScheduleFilter, SchedulerPlatform, ScheduleStatus } from "../scheduler.types";
import { PLATFORMS, STATUS_LABELS } from "../scheduler.constants";
import { cn } from "@/lib/cn";

type Props = {
  view: ScheduleView;
  onViewChange: (v: ScheduleView) => void;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  visibleCount: number;
  selectedCount: number;
  hasActiveFilters: boolean;
  filter: ScheduleFilter;
  onFilterChange: (f: ScheduleFilter) => void;
  onClearFilters: () => void;
  onSchedulePost: () => void;
};

const VIEW_OPTIONS: Array<{ id: ScheduleView; label: string; icon: typeof CalendarDays }> = [
  { id: "month", label: "Month", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarClock },
  { id: "agenda", label: "Agenda", icon: ListOrdered },
];

export function SchedulerToolbar({
  view,
  onViewChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  visibleCount,
  selectedCount,
  hasActiveFilters,
  filter,
  onFilterChange,
  onClearFilters,
  onSchedulePost,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Left: navigation + period */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrev} aria-label="Previous" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToday} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Today
          </button>
          <button type="button" onClick={onNext} aria-label="Next" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 text-[14px] font-semibold text-slate-900 whitespace-nowrap">{periodLabel}</h2>
        </div>

        {/* Center: view switch */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5" role="tablist" aria-label="Calendar view">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = view === opt.id;
            return (
              <button
                key={opt.id}
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(opt.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Right: count + action */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-slate-400">
            {visibleCount}{selectedCount > 0 ? ` / ${selectedCount} sel` : ""}
          </span>
          <button
            type="button"
            onClick={onSchedulePost}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Schedule
          </button>
        </div>
      </div>

      {/* Compact filters row */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
        <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            placeholder="Search schedules..."
            aria-label="Search schedules"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2 text-[11px] placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
          />
        </div>

        <Filter className="h-3.5 w-3.5 text-slate-400" />

        <select
          value={filter.platform}
          onChange={(e) => onFilterChange({ ...filter, platform: e.target.value as "all" | SchedulerPlatform })}
          aria-label="Filter by platform"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
        >
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <select
          value={filter.status}
          onChange={(e) => onFilterChange({ ...filter, status: e.target.value as "all" | ScheduleStatus })}
          aria-label="Filter by status"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as ScheduleStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select
          value={filter.dateRange}
          onChange={(e) => onFilterChange({ ...filter, dateRange: e.target.value as ScheduleFilter["dateRange"] })}
          aria-label="Filter by date range"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="next7">Next 7 days</option>
          <option value="next30">Next 30 days</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
