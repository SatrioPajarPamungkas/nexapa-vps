import { Clock, Copy, Edit3, Pause, Play, Trash2, Calendar, Ban, Eye, Files } from "lucide-react";
import type { LocalSchedule } from "../scheduler.types";
import { STATUS_LABELS } from "../scheduler.constants";
import { buildLocalEquivalentLabel, formatTime12 } from "../scheduler.utils";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  schedule: LocalSchedule;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
  browserTimezone: string;
};

function statusTone(status: LocalSchedule["status"]): string {
  switch (status) {
    case "local-draft": return "bg-slate-100 text-slate-600";
    case "backend-required": return "bg-amber-50 text-amber-700";
    case "authorization-required": return "bg-amber-50 text-amber-700";
    case "ready-locally": return "bg-emerald-50 text-emerald-700";
    case "paused": return "bg-slate-100 text-slate-500";
    case "cancelled": return "bg-rose-50 text-rose-600";
    default: return "bg-slate-50 text-slate-600";
  }
}

export function ScheduledPostRow({ schedule, selected, onToggle, onOpen, onEdit, onDuplicate, onPause, onResume, onCancel, onRemove, onCopy, browserTimezone }: Props) {
  const localEquiv = buildLocalEquivalentLabel(schedule.scheduledDate, schedule.scheduledTime, schedule.timezone);
  const showLocalEquiv = localEquiv && schedule.timezone !== browserTimezone;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${schedule.title}, ${selected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggle(schedule.id);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggle(schedule.id);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:flex-row sm:items-start sm:justify-between",
        selected ? "border-blue-300 bg-blue-50/50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm",
        schedule.status === "cancelled" && "opacity-60",
      )}
      draggable={schedule.status !== "cancelled"}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/schedule-id", schedule.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <div className="pt-0.5">
          <SelectionCheckbox
            checked={selected}
            onChange={() => onToggle(schedule.id)}
            ariaLabel={`${selected ? "Deselect" : "Select"} ${schedule.title}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-[13px] font-semibold text-slate-900">{schedule.title}</h4>
            {schedule.isDemo && <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-700 leading-none">Demo</span>}
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusTone(schedule.status))}>
              {STATUS_LABELS[schedule.status]}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-3 w-3" /> {schedule.scheduledDate}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {formatTime12(schedule.scheduledTime)}
            </span>
            <span className="text-slate-400">{schedule.timezone}</span>
            {showLocalEquiv && <span className="rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-600">{localEquiv}</span>}
            {schedule.mediaName && <span className="truncate text-slate-400">&middot; {schedule.mediaName}</span>}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1">
            {schedule.platforms.map((p) => (
              <span key={p} className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white leading-none">{p.slice(0, 2)}</span>
            ))}
            <span className="text-[10px] text-slate-400">{schedule.destinationIds.length} dest</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:flex-col sm:items-stretch">
        <button type="button" onClick={() => onOpen(schedule.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Eye className="h-3 w-3" /> View
        </button>
        <button type="button" onClick={() => onEdit(schedule.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Edit3 className="h-3 w-3" /> Edit
        </button>
        <button type="button" onClick={() => onDuplicate(schedule.id)} aria-label={`Duplicate ${schedule.title}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Files className="h-3 w-3" /> Dup
        </button>
        {schedule.status === "paused" ? (
          <button type="button" onClick={() => onResume(schedule.id)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
            <Play className="h-3 w-3" /> Resume
          </button>
        ) : schedule.status !== "cancelled" && (
          <button type="button" onClick={() => onPause(schedule.id)} title="Local state only" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Pause className="h-3 w-3" /> Pause
          </button>
        )}
        {schedule.status !== "cancelled" && (
          <button type="button" onClick={() => onCancel(schedule.id)} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">
            <Ban className="h-3 w-3" /> Cancel
          </button>
        )}
        <button type="button" onClick={() => onRemove(schedule.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100 transition-colors">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
        <button type="button" onClick={() => onCopy(schedule.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
    </div>
  );
}
