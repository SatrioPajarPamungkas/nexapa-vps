import { Trash2, Copy, X, CheckSquare } from "lucide-react";

type Props = {
  selectedCount: number;
  onRemoveSelected: () => void;
  onClearSelection: () => void;
  onCopySelected: () => void;
  onSelectAllVisible: (ids: string[]) => void;
  totalVisible: number;
};

export function HistorySelectionBar({ selectedCount, onRemoveSelected, onClearSelection, onCopySelected, onSelectAllVisible, totalVisible }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md sticky-action-bar">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button type="button" onClick={() => onSelectAllVisible([])} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <CheckSquare className="h-3 w-3" /> All ({totalVisible})
        </button>
        <span className="text-slate-500 tabular-nums">{selectedCount} selected</span>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onCopySelected} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Copy className="h-3 w-3" /> Copy
        </button>
        <button type="button" onClick={onRemoveSelected} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100 transition-colors">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
        <button type="button" onClick={onClearSelection} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-800 transition-colors">
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
    </div>
  );
}
