import { useEffect, useRef } from "react";
import { X, Calendar, FileText, StickyNote, Edit3, Files, Pause, Play, Ban, Trash2 } from "lucide-react";
import type { LocalSchedule } from "../scheduler.types";
import { STATUS_LABELS } from "../scheduler.constants";
import { buildLocalEquivalentLabel, formatTime12 } from "../scheduler.utils";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  schedule: LocalSchedule | null;
  browserTimezone: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
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

export function ScheduleDetailsDialog({ open, schedule, browserTimezone, onClose, onEdit, onDuplicate, onPause, onResume, onCancel, onRemove }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => dialogRef.current?.focus(), 0);
    } else {
      window.setTimeout(() => prevFocusRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !schedule) return null;

  const localEquiv = buildLocalEquivalentLabel(schedule.scheduledDate, schedule.scheduledTime, schedule.timezone);
  const showLocalEquiv = localEquiv && schedule.timezone !== browserTimezone;

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true" aria-labelledby="sched-detail-title">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="ml-auto h-full w-full max-w-[480px] overflow-hidden bg-white shadow-2xl drawer-slide-in flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id="sched-detail-title" className="truncate text-[15px] font-semibold text-slate-900">
              {schedule.title}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusTone(schedule.status))}>
                {STATUS_LABELS[schedule.status]}
              </span>
              {schedule.isDemo && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Demo</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {/* Schedule info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Calendar className="h-3 w-3" /> Scheduled
                </p>
                <p className="mt-1 text-[13px] font-medium text-slate-900">{schedule.scheduledDate}</p>
                <p className="text-[12px] text-slate-600">{formatTime12(schedule.scheduledTime)} {schedule.timezone}</p>
                {showLocalEquiv && <p className="mt-0.5 text-[10px] text-blue-600">Local: {localEquiv}</p>}
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Source</p>
                <p className="mt-1 text-[12px] font-medium text-slate-700">{schedule.source}</p>
                <p className="text-[10px] text-slate-400">Created {new Date(schedule.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Platforms</p>
              <div className="flex flex-wrap gap-1">
                {schedule.platforms.map((p) => (
                  <span key={p} className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{p}</span>
                ))}
              </div>
            </div>

            {/* Destinations */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Destinations ({schedule.destinations.length})</p>
              <div className="space-y-1">
                {schedule.destinations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
                    <span className="text-[11px] text-slate-700">{d.isDemo ? `DEMO ${d.label}` : d.label}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">{d.platform}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption */}
            {schedule.caption && (
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  <FileText className="h-3 w-3" /> Caption
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-white p-3 text-[11px] leading-5 text-slate-600 ring-1 ring-slate-100">
                  {schedule.caption}
                </p>
              </div>
            )}

            {/* Media */}
            {schedule.mediaName && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Media</p>
                <p className="text-[11px] text-slate-600">{schedule.mediaName} ({schedule.mediaType})</p>
              </div>
            )}

            {/* Notes */}
            {schedule.notes && (
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  <StickyNote className="h-3 w-3" /> Notes
                </p>
                <p className="rounded-xl bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-700 ring-1 ring-amber-100">{schedule.notes}</p>
              </div>
            )}

            {/* Backend notice */}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500 ring-1 ring-slate-100">
              Nexapa Scheduler is using local browser state. Persistent schedules and publishing require Nexapa API.
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">Close</button>
          <div className="flex-1" />
          <button type="button" onClick={() => { onEdit(schedule.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Edit3 className="h-3 w-3" /> Edit
          </button>
          <button type="button" onClick={() => onDuplicate(schedule.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Files className="h-3 w-3" /> Dup
          </button>
          {schedule.status === "paused" ? (
            <button type="button" onClick={() => onResume(schedule.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
              <Play className="h-3 w-3" /> Resume
            </button>
          ) : schedule.status !== "cancelled" ? (
            <button type="button" onClick={() => onPause(schedule.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Pause className="h-3 w-3" /> Pause
            </button>
          ) : null}
          {schedule.status !== "cancelled" && (
            <button type="button" onClick={() => onCancel(schedule.id)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              <Ban className="h-3 w-3" /> Cancel
            </button>
          )}
          <button type="button" onClick={() => { onRemove(schedule.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-100 transition-colors">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
