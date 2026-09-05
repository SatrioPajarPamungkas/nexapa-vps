import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    confirmRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="confirm-dialog-title" className="text-[15px] font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white/60 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p id="confirm-dialog-description" className="mt-2 text-[13px] leading-5 text-white/65">
          {description}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-[13px] font-medium text-white backdrop-blur-xl transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50",
              variant === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
