import { useMemo } from "react";
import { SchedulerCalendarDay } from "./SchedulerCalendarDay";
import { getCalendarDays, formatDateKey, parseDateKey } from "../scheduler.utils";
import type { LocalSchedule } from "../scheduler.types";
import { WEEKDAY_LABELS_SHORT } from "../scheduler.constants";

type Props = {
  currentMonth: Date;
  onMonthChange: (next: Date) => void;
  schedulesByDate: Map<string, LocalSchedule[]>;
  selectedDateKey: string;
  onSelectDate: (key: string) => void;
  onAddSchedule: (date: string) => void;
  onMoveSchedule: (scheduleId: string, newDate: string) => void;
};

export function SchedulerCalendar({ currentMonth, schedulesByDate, selectedDateKey, onSelectDate, onAddSchedule, onMoveSchedule }: Props) {
  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAY_LABELS_SHORT.map((wd) => (
          <div key={wd} className="p-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = formatDateKey(date);
          const schedules = schedulesByDate.get(key) ?? [];
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const parsedSelected = parseDateKey(selectedDateKey);
          const selected = parsedSelected ? formatDateKey(date) === selectedDateKey : false;

          return (
            <SchedulerCalendarDay
              key={key + date.toISOString()}
              date={date}
              isCurrentMonth={isCurrentMonth}
              isSelected={selected}
              schedules={schedules}
              onSelectDate={onSelectDate}
              onAddSchedule={onAddSchedule}
              onMoveSchedule={onMoveSchedule}
            />
          );
        })}
      </div>
    </div>
  );
}
