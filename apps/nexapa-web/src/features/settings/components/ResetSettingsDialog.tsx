import { useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { SettingsSection } from "../settings.types";

type Props = {
  open: boolean;
  target: SettingsSection | "all";
  onClose: () => void;
  onConfirm: (target: SettingsSection | "all") => void;
};

export function ResetSettingsDialog({ open, target, onClose, onConfirm }: Props) {
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const label = target === "all" ? "all settings" : `${target} section`;

  return (
    <div className="fixed inset-0 z-[80] flex" role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="relative m-auto w-[92vw] max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="reset-title" className="text-[14px] font-semibold text-slate-900">Reset {label}?</h2>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">
                This will reset {label} to defaults in memory only. Secrets will be cleared to empty values. No previous secret values will be exposed after reset. This does not contact a server. Refresh also clears local configuration.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close reset dialog"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={() => { onConfirm(target); onClose(); }} className="rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            Reset {target === "all" ? "all" : "section"}
          </button>
        </div>
      </div>
    </div>
  );
}
