import { useMemo, useRef, useCallback } from "react";
import { getWeekDays, formatWeekRange, formatDateKey, formatHourLabel, computeWeekBlocks, isTodayKey, formatTime12 } from "../scheduler.utils";
import { WEEK_HOURS } from "../scheduler.constants";
import type { LocalSchedule } from "../scheduler.types";
import { cn } from "@/lib/cn";

type Props = {
  currentMonth: Date;
  schedules: LocalSchedule[];
  onSelectDate: (key: string) => void;
  onOpenSchedule: (id: string) => void;
  onAddSchedule: (date: string, time: string) => void;
  onMoveSchedule: (scheduleId: string, newDate: string, newTime: string) => void;
};

export function SchedulerWeek({ currentMonth, schedules, onSelectDate, onOpenSchedule, onAddSchedule, onMoveSchedule }: Props) {
  const weekDays = useMemo(() => getWeekDays(currentMonth), [currentMonth]);
  const weekLabel = useMemo(() => formatWeekRange(weekDays), [weekDays]);
  const blocks = useMemo(() => computeWeekBlocks(schedules, weekDays), [schedules, weekDays]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTimeSlotClick = useCallback((dayIndex: number, hour: number) => {
    const dateKey = formatDateKey(weekDays[dayIndex]);
    const time = `${String(hour).padStart(2, "0")}:00`;
    onAddSchedule(dateKey, time);
  }, [weekDays, onAddSchedule]);

  const handleDragEnd = useCallback((e: React.DragEvent, scheduleId: string) => {
    const target = e.currentTarget as HTMLElement;
    const dateKey = target.dataset.date;
    const hour = target.dataset.hour;
    if (dateKey && hour) {
      onMoveSchedule(scheduleId, dateKey, `${String(hour).padStart(2, "0")}:00`);
    }
  }, [onMoveSchedule]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Week header */}
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <p className="text-[12px] font-semibold text-slate-900">{weekLabel}</p>
      </div>

      {/* Day headers */}
      <div className="border-b border-slate-100 grid grid-cols-[60px_repeat(7,1fr)]">
        <div className="p-2" />
        {weekDays.map((day) => {
          const key = formatDateKey(day);
          const today = isTodayKey(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={cn(
                "border-l border-slate-100 p-2 text-center transition-colors hover:bg-slate-50",
                today && "bg-blue-50/50",
              )}
            >
              <p className="text-[10px] font-medium uppercase text-slate-400">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className={cn(
                "mt-0.5 text-[13px] font-semibold",
                today ? "text-blue-600" : "text-slate-900",
              )}>
                {day.getDate()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {WEEK_HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="border-b border-slate-100 p-1.5 text-right pr-2">
                <span className="text-[10px] font-medium text-slate-400">{formatHourLabel(hour)}</span>
              </div>

              {/* Day cells */}
              {weekDays.map((day, dayIdx) => {
                const dateKey = formatDateKey(day);
                const today = isTodayKey(dateKey);
                const hourBlocks = blocks.filter(
                  (b) => b.dayIndex === dayIdx && b.startHour === hour,
                );

                return (
                  <div
                    key={`${dateKey}-${hour}`}
                    data-date={dateKey}
                    data-hour={hour}
                    className={cn(
                      "relative border-l border-b border-slate-100 min-h-[48px] cursor-pointer transition-colors hover:bg-blue-50/30",
                      today && "bg-blue-50/20",
                    )}
                    onClick={() => {
                      if (hourBlocks.length === 0) {
                        handleTimeSlotClick(dayIdx, hour);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const schedId = e.dataTransfer.getData("text/schedule-id");
                      if (schedId) handleDragEnd(e, schedId);
                    }}
                  >
                    {hourBlocks.map((block) => (
                      <div
                        key={block.schedule.id}
                        draggable={block.schedule.status !== "cancelled"}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/schedule-id", block.schedule.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSchedule(block.schedule.id);
                        }}
                        className={cn(
                          "absolute inset-x-0.5 rounded-lg px-1.5 py-1 text-[10px] leading-tight shadow-sm cursor-pointer transition-all hover:shadow-md z-10",
                          block.schedule.status === "paused"
                            ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                            : block.schedule.isDemo
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
                        )}
                        style={{
                          top: "2px",
                          height: "calc(100% - 4px)",
                          width: `calc(${100 / block.totalLanes}% - 4px)`,
                          left: `calc(${(block.lane / block.totalLanes) * 100}% + 2px)`,
                        }}
                      >
                        <p className="font-semibold truncate">{formatTime12(block.schedule.scheduledTime)}</p>
                        <p className="truncate">{block.schedule.title}</p>
                        <div className="mt-0.5 flex gap-0.5">
                          {block.schedule.platforms.slice(0, 2).map((p) => (
                            <span key={p} className="rounded bg-black/10 px-0.5 text-[8px] font-bold uppercase">{p.slice(0, 2)}</span>
                          ))}
                        </div>
                        {block.schedule.isDemo && <span className="text-[8px] font-bold">DEMO</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Current time indicator - visual only */}
      <div className="sr-only" aria-live="polite">
        Week view showing {weekLabel}. Click empty time slots to add schedules. Drag schedule blocks to reschedule.
      </div>
    </div>
  );
}
