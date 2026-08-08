import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";
import type { PublisherPost } from "@/features/scheduler/scheduler.types";
import { reschedulePost } from "@/lib/api/scheduler";

type Props = {
  open: boolean;
  post: PublisherPost | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function RescheduleModal({ open, post, onClose, onSuccess }: Props) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open && post?.scheduled_at) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const scheduled = new Date(post.scheduled_at);
      const year = scheduled.getFullYear();
      const month = String(scheduled.getMonth() + 1).padStart(2, "0");
      const day = String(scheduled.getDate()).padStart(2, "0");
      setScheduledDate(`${year}-${month}-${day}`);
      setScheduledTime(scheduled.toTimeString().slice(0, 5));
    }
  }, [open, post?.scheduled_at]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = useCallback(() => {
    setError(null);
    setIsSubmitting(false);
    onClose();
    setTimeout(() => prevFocusRef.current?.focus(), 0);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!post || isSubmitting) return;

    setError(null);
    if (!scheduledDate || !scheduledTime) {
      setError("Choose both a new date and time.");
      return;
    }
    const now = new Date();
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);

    if (scheduled.getTime() - now.getTime() < 5 * 60 * 1000) {
      setError("Schedule must be at least 5 minutes in the future");
      return;
    }

    setIsSubmitting(true);

    try {
      await reschedulePost(post.id, scheduled.toISOString());
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule");
      setIsSubmitting(false);
    }
  }, [post, scheduledDate, scheduledTime, isSubmitting, onSuccess, handleClose]);

  const canSubmit = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return false;

    const now = new Date();
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);

    if (scheduled.getTime() - now.getTime() < 5 * 60 * 1000) return false;

    return !isSubmitting;
  }, [scheduledDate, scheduledTime, isSubmitting]);

  if (!open || !post) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Reschedule Post</h2>
            <p className="mt-0.5 text-[11px] text-white/50">Choose a new date and time</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 backdrop-blur-xl transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-[12px] text-red-200 backdrop-blur-xl">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/55">
                New Date <span className="text-red-300">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-[13px] text-white backdrop-blur-xl placeholder:text-white/50 focus:border-blue-400/60 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/55">
                New Time <span className="text-red-300">*</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-[13px] text-white backdrop-blur-xl placeholder:text-white/50 focus:border-blue-400/60 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Timezone
              </label>
              <div className="flex h-10 w-full items-center rounded-xl border border-white/10 bg-white/8 px-3 text-[12px] text-white/75 backdrop-blur-xl">
                {post.timezone || timezone}
              </div>
              <p className="mt-1.5 text-[10px] text-white/40">Timezone is locked to browser timezone</p>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 backdrop-blur-xl">
              <p className="text-[11px] text-amber-200/90">
                <span className="font-semibold">Note:</span> Schedule must be at least 5 minutes in the future.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save New Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
