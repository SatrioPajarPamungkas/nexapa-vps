import { useMemo, useCallback } from "react";
import { SchedulerToolbar } from "./SchedulerToolbar";
import { SchedulerCalendar } from "./SchedulerCalendar";
import { SchedulerWeek } from "./SchedulerWeek";
import { SchedulerAgenda } from "./SchedulerAgenda";
import { SchedulerActionBar } from "./SchedulerActionBar";
import type { LocalSchedule, ScheduleDestinationDraft, ScheduleFilter, ScheduleSort, ScheduleView } from "../scheduler.types";
import { EMPTY_FILTERED, EMPTY_PRIMARY } from "../scheduler.constants";
import { CalendarClock, FilterX } from "lucide-react";

type Props = {
  schedules: LocalSchedule[];
  filtered: LocalSchedule[];
  sorted: LocalSchedule[];
  schedulesByDate: Map<string, LocalSchedule[]>;
  selectedDateKey: string;
  selectedDateSchedules: LocalSchedule[];
  filter: ScheduleFilter;
  sort: ScheduleSort;
  view: ScheduleView;
  selectedIds: Set<string>;
  browserTimezone: string;
  allDestinations: ScheduleDestinationDraft[];
  liveMsg: string;
  clipboardError: string;
  totalCount: number;
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  onSelectDate: (key: string) => void;
  onFilterChange: (f: ScheduleFilter) => void;
  onSortChange: (s: ScheduleSort) => void;
  onViewChange: (v: ScheduleView) => void;
  onClearFilters: () => void;
  onSchedulePost: (date?: string, time?: string) => void;
  onOpenPublisher: () => void;
  onOpenSettings: () => void;
  onToggle: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onPauseSelected: () => void;
  onResumeSelected: () => void;
  onCancelSelected: () => void;
  onRemoveSelected: () => void;
  onCopySelected: () => Promise<boolean>;
  onLoadDemoSchedule: () => void;
  onMoveSchedule: (scheduleId: string, newDate: string, newTime?: string) => void;
};

export function SchedulerWorkspace({
  schedules,
  filtered,
  sorted,
  schedulesByDate,
  selectedDateKey,
  selectedDateSchedules,
  filter,
  view,
  selectedIds,
  browserTimezone,
  currentMonth,
  onMonthChange,
  onSelectDate,
  onFilterChange,
  onViewChange,
  onClearFilters,
  onSchedulePost,
  onOpenPublisher,
  onToggle,
  onOpenDetails,
  onEdit,
  onDuplicate,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onCopy,
  onSelectAllVisible,
  onClearSelection,
  onPauseSelected,
  onResumeSelected,
  onCancelSelected,
  onRemoveSelected,
  onCopySelected,
  onLoadDemoSchedule,
  clipboardError,
  onMoveSchedule,
}: Props) {
  const visibleCount = filtered.length;
  const selectedCount = selectedIds.size;

  const periodLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(currentMonth);
    } catch {
      return `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`;
    }
  }, [currentMonth]);

  const handlePrev = useCallback(() => {
    const next = new Date(currentMonth);
    if (view === "week") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    onMonthChange(next);
  }, [currentMonth, view, onMonthChange]);

  const handleNext = useCallback(() => {
    const next = new Date(currentMonth);
    if (view === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    onMonthChange(next);
  }, [currentMonth, view, onMonthChange]);

  const handleToday = useCallback(() => {
    const today = new Date();
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }, [onMonthChange, onSelectDate]);

  const handleAddSchedule = useCallback((date?: string, time?: string) => {
    onSchedulePost(date, time);
  }, [onSchedulePost]);

  const handleMoveSchedule = useCallback((scheduleId: string, newDate: string, newTime?: string) => {
    onMoveSchedule(scheduleId, newDate, newTime);
  }, [onMoveSchedule]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <SchedulerToolbar
        view={view}
        onViewChange={onViewChange}
        periodLabel={periodLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        visibleCount={visibleCount}
        selectedCount={selectedCount}
        hasActiveFilters={filter.search.trim() !== "" || filter.platform !== "all" || filter.status !== "all" || filter.dateRange !== "all"}
        filter={filter}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        onSchedulePost={() => onSchedulePost()}
      />

      {/* Backend boundary notice */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <p className="flex-1 text-[11px] text-slate-500">
          Nexapa Scheduler is currently using local browser state. Persistent schedules and background publishing require Nexapa API and the scheduler worker.
        </p>
        <button type="button" disabled aria-disabled className="inline-flex h-7 cursor-not-allowed items-center gap-1 rounded-md bg-slate-900 px-2.5 text-[10px] font-medium text-white opacity-40">
          Activate Schedule
        </button>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <SchedulerActionBar
          selectedCount={selectedCount}
          totalVisible={visibleCount}
          hasSelection={selectedCount > 0}
          clipboardError={clipboardError}
          onSelectAllVisible={onSelectAllVisible}
          onClear={onClearSelection}
          onPause={onPauseSelected}
          onResume={onResumeSelected}
          onCancel={onCancelSelected}
          onRemove={onRemoveSelected}
          onCopy={onCopySelected}
        />
      )}

      {/* Empty state: no schedules at all */}
      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            <CalendarClock className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{EMPTY_PRIMARY.title}</h3>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-5 text-slate-500">{EMPTY_PRIMARY.description}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => onSchedulePost()} className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
              Schedule Post
            </button>
            <button type="button" onClick={onOpenPublisher} className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Open Publisher
            </button>
            <button type="button" onClick={onLoadDemoSchedule} className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Load Demo
            </button>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Demo items display DEMO &middot; No API request &middot; Clears on refresh</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            <FilterX className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{EMPTY_FILTERED.title}</h3>
          <p className="mx-auto mt-1 max-w-[380px] text-[12px] text-slate-500">{EMPTY_FILTERED.description}</p>
          <button type="button" onClick={onClearFilters} className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-slate-900 px-3 text-[12px] font-medium text-white hover:bg-slate-800 transition-colors">
            Clear Filters
          </button>
        </div>
      ) : view === "month" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
          {/* Month calendar */}
          <div>
            <SchedulerCalendar
              currentMonth={currentMonth}
              onMonthChange={onMonthChange}
              schedulesByDate={schedulesByDate}
              selectedDateKey={selectedDateKey}
              onSelectDate={onSelectDate}
              onAddSchedule={handleAddSchedule}
              onMoveSchedule={handleMoveSchedule}
            />
          </div>

          {/* Selected day panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-slate-900">
                  {new Date(selectedDateKey + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <span className="text-[10px] tabular-nums text-slate-400">{selectedDateSchedules.length} posts</span>
              </div>

              {selectedDateSchedules.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] font-medium text-slate-700">No posts planned for this day</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Create a schedule or choose another date.</p>
                  <button type="button" onClick={() => onSchedulePost(selectedDateKey)} className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors">
                    Schedule Post
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedDateSchedules.map((s) => (
                    <div
                      key={s.id}
                      draggable={s.status !== "cancelled"}
                      onDragStart={(e) => { e.dataTransfer.setData("text/schedule-id", s.id); e.dataTransfer.effectAllowed = "move"; }}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2.5 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => onOpenDetails(s.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-slate-900">{s.title}</p>
                        <p className="text-[10px] text-slate-500">{s.scheduledTime} &middot; {s.platforms.join(", ")}</p>
                      </div>
                      {s.isDemo && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-700">DEMO</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : view === "week" ? (
        <SchedulerWeek
          currentMonth={currentMonth}
          schedules={sorted}
          onSelectDate={onSelectDate}
          onOpenSchedule={onOpenDetails}
          onAddSchedule={handleAddSchedule}
          onMoveSchedule={(id, date, time) => handleMoveSchedule(id, date, time)}
        />
      ) : (
        <SchedulerAgenda
          schedules={sorted}
          selectedIds={selectedIds}
          browserTimezone={browserTimezone}
          onToggle={onToggle}
          onOpen={onOpenDetails}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          onRemove={onRemove}
          onCopy={onCopy}
        />
      )}
    </div>
  );
}
