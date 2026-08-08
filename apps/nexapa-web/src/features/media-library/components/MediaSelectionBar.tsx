import { useState } from "react";
import { Copy, Trash2, X, CheckSquare, Square, FileText } from "lucide-react";

type Props = {
  totalVisible: number;
  selectedVisible: number;
  isAllVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onClearVisibleSelection: () => void;
  onClearAllSelection: () => void;
  onRemoveSelected: () => void;
  onCopyNames: () => Promise<boolean>;
  onCopyMetadata: () => Promise<boolean>;
  clipboardMsg: string;
};

export function MediaSelectionBar({
  totalVisible,
  selectedVisible,
  isAllVisibleSelected,
  onSelectAllVisible,
  onClearVisibleSelection,
  onClearAllSelection,
  onRemoveSelected,
  onCopyNames,
  onCopyMetadata,
  clipboardMsg,
}: Props) {
  const [localMsg, setLocalMsg] = useState<string>("");

  async function withFeedback(fn: () => Promise<boolean>, successText: string) {
    const ok = await fn();
    setLocalMsg(ok ? successText : "Clipboard access failed – copy manually");
    window.setTimeout(() => setLocalMsg(""), 3000);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.12)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <button
          type="button"
          onClick={isAllVisibleSelected ? onClearVisibleSelection : onSelectAllVisible}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {isAllVisibleSelected ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
          {isAllVisibleSelected ? "Deselect all visible" : `Select all visible (${totalVisible})`}
        </button>
        <span className="text-slate-700">
          {selectedVisible} visible selected
        </span>
        {(localMsg || clipboardMsg) && (
          <span className="text-[11px] text-emerald-700" role="status" aria-live="polite">
            {localMsg || clipboardMsg}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={selectedVisible === 0}
          onClick={() => void withFeedback(onCopyNames, "Filenames copied")}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy names
        </button>
        <button
          type="button"
          disabled={selectedVisible === 0}
          onClick={() => void withFeedback(onCopyMetadata, "Metadata copied")}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-white/22 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <FileText className="h-4 w-4" aria-hidden="true" /> Copy metadata
        </button>
        <button
          type="button"
          disabled={selectedVisible === 0}
          onClick={onRemoveSelected}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-800 backdrop-blur-xl transition hover:bg-rose-500/12 hover:text-rose-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove selected
        </button>
        <button
          type="button"
          disabled={selectedVisible === 0}
          onClick={onClearAllSelection}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-950/80 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-xl transition hover:bg-slate-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <X className="h-4 w-4" aria-hidden="true" /> Clear selection
        </button>
      </div>
    </div>
  );
}
