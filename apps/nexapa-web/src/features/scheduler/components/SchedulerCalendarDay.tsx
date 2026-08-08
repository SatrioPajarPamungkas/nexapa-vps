import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import type { LocalSchedule } from "../scheduler.types";
import { isTodayKey, formatDateKey } from "../scheduler.utils";
import { cn } from "@/lib/cn";

type Props = {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  schedules: LocalSchedule[];
  onSelectDate: (dateKey: string) => void;
  onAddSchedule: (date: string) => void;
  onMoveSchedule: (scheduleId: string, newDate: string) => void;
};

const MAX_VISIBLE = 3;

export function SchedulerCalendarDay({ date, isCurrentMonth, isSelected, schedules, onSelectDate, onAddSchedule, onMoveSchedule }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const dateKey = formatDateKey(date);
  const today = isTodayKey(dateKey);
  const count = schedules.length;
  const extra = count - MAX_VISIBLE > 0 ? count - MAX_VISIBLE : 0;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const schedId = e.dataTransfer.getData("text/schedule-id");
    if (schedId) onMoveSchedule(schedId, dateKey);
  }, [dateKey, onMoveSchedule]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${today ? ", today" : ""}${isSelected ? ", selected" : ""}, ${count} scheduled`}
      aria-pressed={isSelected}
      onClick={() => onSelectDate(dateKey)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectDate(dateKey); } }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex min-h-[100px] flex-col border-b border-r border-slate-100 p-1.5 transition-colors cursor-pointer",
        !isCurrentMonth && "bg-slate-50/50",
        isSelected && "bg-blue-50/60",
        dragOver && "bg-blue-50 ring-2 ring-inset ring-blue-300",
        !dragOver && !isSelected && "hover:bg-slate-50/80",
      )}
    >
      {/* Date number + add button */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
          today ? "bg-blue-600 text-white" : isSelected ? "bg-blue-100 text-blue-700" : isCurrentMonth ? "text-slate-700" : "text-slate-400",
        )}>
          {date.getDate()}
        </span>
        <button
          type="button"
          aria-label={`Add schedule for ${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
          onClick={(e) => { e.stopPropagation(); onAddSchedule(dateKey); }}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 opacity-0 transition-all hover:bg-blue-100 hover:text-blue-600 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Schedule items */}
      {count > 0 && (
        <div className="mt-1 flex-1 space-y-0.5">
          {schedules.slice(0, MAX_VISIBLE).map((s) => (
            <div
              key={s.id}
              draggable={s.status !== "cancelled"}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/schedule-id", s.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className={cn(
                "truncate rounded px-1 py-0.5 text-[10px] leading-tight transition-colors",
                s.status === "cancelled"
                  ? "bg-slate-100 text-slate-400 line-through"
                  : s.status === "paused"
                    ? "bg-slate-100 text-slate-600"
                    : s.isDemo
                      ? "bg-amber-50 text-amber-800"
                      : "bg-blue-50 text-blue-800",
              )}
            >
              <span className="font-medium">{s.scheduledTime.slice(0, 5)}</span>{" "}
              <span className="truncate">{s.title.slice(0, 16)}</span>
            </div>
          ))}
          {extra > 0 && (
            <p className="px-1 text-[9px] font-medium text-slate-400">+{extra} more</p>
          )}
        </div>
      )}
    </div>
  );
}
