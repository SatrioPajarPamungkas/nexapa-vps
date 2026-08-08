import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  isDeleting: boolean;
};

export function PublisherHistorySelectionBar({
  selectedCount,
  onDeleteSelected,
  onClearSelection,
  isDeleting,
}: Props) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/75 px-4 py-3 shadow-[0_18px_55px_rgba(2,6,23,0.30)] backdrop-blur-2xl text-white">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/15 backdrop-blur-xl">
          <span className="text-sm font-semibold">{selectedCount}</span>
        </div>
        <p className="text-[13px] font-medium text-white">
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={isDeleting || selectedCount === 0}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Hapus Terpilih {selectedCount > 0 && `(${selectedCount})`}
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          disabled={isDeleting}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Batal
        </button>
      </div>
    </div>
  );
}
