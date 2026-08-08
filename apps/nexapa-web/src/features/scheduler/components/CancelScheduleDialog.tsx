import { useState, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { PublisherPost } from "@/features/scheduler/scheduler.types";
import { cancelSchedule } from "@/lib/api/scheduler";

type Props = {
  open: boolean;
  post: PublisherPost | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function CancelScheduleDialog({ open, post, onClose, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = () => {
    setError(null);
    setIsSubmitting(false);
    onClose();
    setTimeout(() => prevFocusRef.current?.focus(), 0);
  };

  const handleConfirm = async () => {
    if (!post) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await cancelSchedule(post.id);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel schedule");
      setIsSubmitting(false);
    }
  };

  if (!open || !post) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <h2 className="text-[15px] font-semibold text-white">Cancel Schedule</h2>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 backdrop-blur-xl transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-[12px] text-red-200 backdrop-blur-xl">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-400/20 bg-amber-500/15 backdrop-blur-xl">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Are you sure?</h3>
              <p className="mt-1 text-[12px] text-white/65">
                Cancel this scheduled post? The uploaded media will remain available.
              </p>
              {post.caption && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xl">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">Caption Preview</p>
                  <p className="line-clamp-3 text-[11px] text-white/70">{post.caption}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/15"
          >
            Keep Schedule
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl bg-rose-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {isSubmitting ? "Cancelling..." : "Cancel Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
