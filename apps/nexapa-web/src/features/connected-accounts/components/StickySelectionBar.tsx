import { Settings, Trash2, X, Copy, Power, PowerOff, CheckSquare, Square } from "lucide-react";

type Props = {
  selectedCount: number;
  isAllVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onClearVisibleSelection: () => void;
  onClearSelection: () => void;
  onRemoveSelected: () => void;
  onSetActiveInactive: (active: boolean) => void;
  onCopyRefs: () => void;
};

export function StickySelectionBar({
  selectedCount,
  isAllVisibleSelected,
  onSelectAllVisible,
  onClearVisibleSelection,
  onClearSelection,
  onRemoveSelected,
  onSetActiveInactive,
  onCopyRefs,
}: Props) {
  return (
    <div className="sticky-action-bar sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={isAllVisibleSelected ? onClearVisibleSelection : onSelectAllVisible}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            {isAllVisibleSelected ? <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" /> : <Square className="h-3.5 w-3.5" aria-hidden="true" />}
            {isAllVisibleSelected ? "Deselect" : "Select all"}
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700 ring-1 ring-blue-200">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Prepare Auth
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => onSetActiveInactive(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <PowerOff className="h-3.5 w-3.5" aria-hidden="true" /> Inactive
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => onSetActiveInactive(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Power className="h-3.5 w-3.5" aria-hidden="true" /> Reactivate
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={onCopyRefs}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy Refs
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={onRemoveSelected}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}
