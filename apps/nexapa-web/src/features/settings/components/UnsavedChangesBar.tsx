type Props = {
  visible: boolean;
  onApply: () => void;
  onDiscard: () => void;
};

export function UnsavedChangesBar({ visible, onApply, onDiscard }: Props) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-2.5 shadow-lg" role="status" aria-live="polite">
      <p className="text-[12px] font-medium text-slate-700">Unsaved changes</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Apply Locally
        </button>
      </div>
    </div>
  );
}
