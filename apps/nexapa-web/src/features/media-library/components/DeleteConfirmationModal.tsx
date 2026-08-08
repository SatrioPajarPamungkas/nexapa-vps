import { Trash2, X } from "lucide-react";

type DeleteConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  deleting: boolean;
};

export function DeleteConfirmationModal({
  open,
  onClose,
  onConfirm,
  selectedCount,
  deleting,
}: DeleteConfirmationModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm"
        onClick={() => {
          if (!deleting) onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-2xl shadow-[0_25px_80px_rgba(2,6,23,0.40)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4 border-b border-white/10 bg-white/[0.02] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-500/15">
              <Trash2 className="h-5 w-5 text-red-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-[15px] font-semibold text-white">Delete selected media?</h2>
              <p className="mt-1 text-[13px] text-white/65">
                {selectedCount} media akan dihapus permanen dari Media Library dan private storage VPS.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="inline-flex h-8 w-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/60 transition hover:bg-white/15 hover:text-white/80"
              aria-label="Close dialog"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/[0.03] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-red-400/20 bg-red-500/20 px-4 py-2 text-[13px] font-medium text-red-100 transition hover:bg-red-500/30 hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
