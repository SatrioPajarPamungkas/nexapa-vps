import { Pause, Play, Ban, Trash2, Copy, X, CheckSquare } from "lucide-react";

type Props = {
  selectedCount: number;
  totalVisible: number;
  hasSelection: boolean;
  clipboardError: string;
  onSelectAllVisible: () => void;
  onClear: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onCopy: () => Promise<boolean>;
};

export function SchedulerActionBar({ selectedCount, totalVisible, hasSelection, clipboardError, onSelectAllVisible, onClear, onPause, onResume, onCancel, onRemove, onCopy }: Props) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sticky-action-bar">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <button
          type="button"
          onClick={onSelectAllVisible}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <CheckSquare className="h-3.5 w-3.5" /> All ({totalVisible})
        </button>
        <span className="text-slate-500 tabular-nums">{selectedCount} selected</span>
        {clipboardError && <span className="text-[10px] text-amber-600">{clipboardError}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={!hasSelection} onClick={onPause} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          <Pause className="h-3.5 w-3.5" /> Pause
        </button>
        <button type="button" disabled={!hasSelection} onClick={onResume} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          <Play className="h-3.5 w-3.5" /> Resume
        </button>
        <button type="button" disabled={!hasSelection} onClick={onCancel} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition-colors">
          <Ban className="h-3.5 w-3.5" /> Cancel
        </button>
        <button type="button" disabled={!hasSelection} onClick={onRemove} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-40 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
        <button type="button" disabled={!hasSelection} onClick={() => void onCopy()} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        <button type="button" disabled={!hasSelection} onClick={onClear} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-40 transition-colors">
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}
