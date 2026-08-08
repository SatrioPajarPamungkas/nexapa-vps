import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { LocalSchedule, ScheduleDestinationDraft, SchedulerPlatform, ScheduleFormValues } from "../scheduler.types";
import { PLATFORMS, NOTES_MAX, TITLE_MAX, CAPTION_ADVISORY_MAX } from "../scheduler.constants";
import { TimezoneSelector } from "./TimezoneSelector";
import { ScheduleValidationPanel } from "./ScheduleValidationPanel";
import { getBrowserTimezone, validateScheduleForm } from "../scheduler.utils";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  editingSchedule: LocalSchedule | null;
  allSchedules: LocalSchedule[];
  demoLoaded?: boolean;
  destinations: ScheduleDestinationDraft[];
  browserTimezone: string;
  onClose: () => void;
  onSave: (values: ScheduleFormValues, destDrafts: ScheduleDestinationDraft[]) => { ok: boolean; error?: string; errors?: Record<string, string> };
  onLoadDemoDestinations: () => void;
  prefill: ScheduleFormValues | null;
  hasPublisherDraft: boolean;
};

function InnerDialog({
  initialValues,
  prefill,
  editingSchedule,
  allSchedules,
  destinations,
  onClose,
  onSave,
  onLoadDemoDestinations,
  hasPublisherDraft,
}: {
  initialValues: ScheduleFormValues;
  prefill: ScheduleFormValues | null;
  editingSchedule: LocalSchedule | null;
  allSchedules: LocalSchedule[];
  destinations: ScheduleDestinationDraft[];
  onClose: () => void;
  onSave: Props["onSave"];
  onLoadDemoDestinations: () => void;
  hasPublisherDraft: boolean;
}) {
  const [values, setValues] = useState<ScheduleFormValues>(initialValues);
  const [sourceMode, setSourceMode] = useState<"light" | "publisher">(() => (prefill ? "publisher" : "light"));
  const [showValidation, setShowValidation] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const timeout = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const destDrafts = useMemo(() => destinations.filter((d) => values.destinationIds.includes(d.id)), [destinations, values.destinationIds]);

  const validation = useMemo(() => validateScheduleForm(
    { title: values.title, caption: values.caption, platforms: values.platforms, destinationIds: values.destinationIds, destinations: destDrafts, date: values.date, time: values.time, timezone: values.timezone, notes: values.notes },
    allSchedules, editingSchedule ? editingSchedule.id : null,
  ), [values, destDrafts, allSchedules, editingSchedule]);

  const handleSubmit = useCallback(() => {
    const result = onSave(values, destDrafts);
    if (result.ok) onClose();
  }, [values, destDrafts, onSave, onClose]);

  const togglePlatform = (p: SchedulerPlatform) => {
    setValues((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  };

  const toggleDestination = (id: string) => {
    setValues((prev) => ({
      ...prev,
      destinationIds: prev.destinationIds.includes(id) ? prev.destinationIds.filter((x) => x !== id) : [...prev.destinationIds, id],
    }));
  };

  const actionCount = validation.validationItems.filter((v) => v.severity === "action-required").length;

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="ml-auto h-full w-full max-w-[520px] overflow-hidden bg-white shadow-2xl drawer-slide-in flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h2 id="schedule-dialog-title" className="text-[15px] font-semibold text-slate-900">
              {editingSchedule ? "Edit schedule" : "Schedule Post"}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Plan dates, times, destinations. No backend execution.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {/* Content source */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Content source</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setSourceMode("light")} aria-pressed={sourceMode === "light"} className={cn("rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors", sourceMode === "light" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                  Lightweight
                </button>
                <button type="button" onClick={() => setSourceMode("publisher")} aria-pressed={sourceMode === "publisher"} className={cn("rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors", sourceMode === "publisher" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                  Publisher draft
                </button>
              </div>
              {sourceMode === "publisher" && !hasPublisherDraft && <p className="mt-1.5 text-[10px] text-amber-600">No Publisher draft available in this session.</p>}
              {sourceMode === "publisher" && hasPublisherDraft && <p className="mt-1.5 text-[10px] text-emerald-600">Publisher draft detected — fields prefilled.</p>}
            </div>

            {/* Title */}
            <div>
              <label htmlFor="sched-title" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Title <span className="text-rose-500">*</span></label>
              <input id="sched-title" value={values.title} onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))} maxLength={TITLE_MAX + 20} placeholder="Product Showcase Draft" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors" />
              <div className="mt-1 flex justify-between text-[10px]">
                <span className={validation.errors.title ? "text-rose-500" : "text-slate-400"}>{validation.errors.title ?? `${values.title.length}/${TITLE_MAX}`}</span>
              </div>
            </div>

            {/* Caption */}
            <div>
              <label htmlFor="sched-caption" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Caption</label>
              <textarea id="sched-caption" value={values.caption} onChange={(e) => setValues((p) => ({ ...p, caption: e.target.value }))} rows={3} placeholder="Optional caption reference" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] leading-5 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors" />
              <p className="mt-0.5 text-[10px] text-slate-400">{values.caption.length} chars (advisory {CAPTION_ADVISORY_MAX})</p>
            </div>

            {/* Media */}
            <div>
              <label htmlFor="sched-media" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Media reference</label>
              <input id="sched-media" value={values.mediaName} onChange={(e) => setValues((p) => ({ ...p, mediaName: e.target.value }))} placeholder="demo-media-1.mp4" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors" />
            </div>

            {/* Platforms */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Platforms <span className="text-rose-500">*</span></p>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const active = values.platforms.includes(p.id);
                  return (
                    <button key={p.id} type="button" aria-pressed={active} onClick={() => togglePlatform(p.id)} className={cn("rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors", active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {validation.errors.platforms && <p className="mt-1 text-[10px] text-rose-500">{validation.errors.platforms}</p>}
            </div>

            {/* Destinations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Destinations <span className="text-rose-500">*</span></p>
                <span className="text-[10px] text-slate-400">{values.destinationIds.length}/{destinations.length}</span>
              </div>
              {destinations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                  No destinations available. <button type="button" onClick={onLoadDemoDestinations} className="text-blue-600 font-medium hover:underline">Load demo</button>
                </div>
              ) : (
                <div className="max-h-[140px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
                  {destinations.map((d) => {
                    const checked = values.destinationIds.includes(d.id);
                    return (
                      <label key={d.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] transition-colors", checked ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600")}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDestination(d.id)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="truncate flex-1">{d.isDemo ? `DEMO ${d.label}` : d.label}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">{d.platform.slice(0, 2)}</span>
                        {d.isDemo && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-700">DEMO</span>}
                      </label>
                    );
                  })}
                </div>
              )}
              {validation.errors.destinations && <p className="mt-1 text-[10px] text-rose-500">{validation.errors.destinations}</p>}
            </div>

            {/* Date + Time + Timezone */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="sched-date" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date <span className="text-rose-500">*</span></label>
                <input id="sched-date" type="date" value={values.date} onChange={(e) => setValues((p) => ({ ...p, date: e.target.value }))} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors" />
                {validation.errors.date && <p className="mt-0.5 text-[10px] text-rose-500">{validation.errors.date}</p>}
              </div>
              <div>
                <label htmlFor="sched-time" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Time <span className="text-rose-500">*</span></label>
                <input id="sched-time" type="time" value={values.time} onChange={(e) => setValues((p) => ({ ...p, time: e.target.value }))} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors" />
                {validation.errors.time && <p className="mt-0.5 text-[10px] text-rose-500">{validation.errors.time}</p>}
              </div>
              <TimezoneSelector value={values.timezone} onChange={(tz) => setValues((p) => ({ ...p, timezone: tz }))} />
            </div>
            {validation.errors.dateTime && (
              <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {validation.errors.dateTime}
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="sched-notes" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</label>
              <textarea id="sched-notes" value={values.notes} onChange={(e) => setValues((p) => ({ ...p, notes: e.target.value }))} rows={2} maxLength={NOTES_MAX + 50} placeholder="Internal notes — local only" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-4 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors" />
              <p className="mt-0.5 text-[10px] text-slate-400">{values.notes.length}/{NOTES_MAX}</p>
            </div>

            {/* Validation */}
            <div>
              <button type="button" onClick={() => setShowValidation(!showValidation)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
                {showValidation ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Requirements
                {actionCount > 0 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">{actionCount}</span>}
              </button>
              {showValidation && <div className="mt-2"><ScheduleValidationPanel items={validation.validationItems} /></div>}
            </div>

            {validation.conflicts && validation.conflicts.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-700">
                <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Conflict</p>
                <ul className="mt-1 list-disc pl-4">
                  {validation.conflicts.map((c, i) => <li key={`${c.destinationId}-${c.conflictWithId}-${i}`}>Uses {c.destinationLabel} at same time as &quot;{c.conflictWithTitle}&quot;</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          <span className="text-[10px] text-slate-400">Max 100 &middot; Local preview &middot; Clears on refresh</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={!validation.valid} className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
              {editingSchedule ? "Save changes" : "Create schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SchedulePostDialog({ open, editingSchedule, allSchedules, destinations, browserTimezone, onClose, onSave, onLoadDemoDestinations, prefill, hasPublisherDraft }: Props) {
  const initialValues: ScheduleFormValues = useMemo(() => {
    if (editingSchedule) {
      return {
        title: editingSchedule.title, caption: editingSchedule.caption, mediaName: editingSchedule.mediaName ?? "",
        platforms: [...editingSchedule.platforms], destinationIds: [...editingSchedule.destinationIds],
        date: editingSchedule.scheduledDate, time: editingSchedule.scheduledTime, timezone: editingSchedule.timezone,
        notes: editingSchedule.notes, source: editingSchedule.source === "demo" ? "demo" : "manual",
      };
    }
    if (prefill) return { ...prefill };
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      title: "", caption: "", mediaName: "", platforms: [], destinationIds: [],
      date: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`,
      time: "10:00", timezone: browserTimezone || getBrowserTimezone(), notes: "", source: "manual",
    };
  }, [editingSchedule, prefill, browserTimezone]);

  const dialogKey = useMemo(() => {
    if (editingSchedule) return `edit-${editingSchedule.id}-${editingSchedule.updatedAt}`;
    if (prefill) return `prefill-${prefill.title}-${prefill.caption.slice(0, 10)}`;
    return `create-${open ? "open" : "closed"}`;
  }, [editingSchedule, prefill, open]);

  if (!open) return null;

  return (
    <InnerDialog key={dialogKey} initialValues={initialValues} prefill={prefill} editingSchedule={editingSchedule} allSchedules={allSchedules} destinations={destinations} onClose={onClose} onSave={onSave} onLoadDemoDestinations={onLoadDemoDestinations} hasPublisherDraft={hasPublisherDraft} />
  );
}
