import { Trash2, ToggleLeft, ToggleRight, ExternalLink, Link2 } from "lucide-react";

type Props = {
  selectedCount: number;
  onRemoveSelected: () => void;
  onMarkInactive: () => void;
  onReactivate: () => void;
  onCopyProductUrls: () => void;
  onCopyAffiliateUrls: () => void;
  onClearSelection: () => void;
};

export function AffiliateSelectionBar({
  selectedCount,
  onRemoveSelected,
  onMarkInactive,
  onReactivate,
  onCopyProductUrls,
  onCopyAffiliateUrls,
  onClearSelection,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-2 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 shadow-lg ring-1 ring-blue-200 sm:flex-row" role="status" aria-live="polite">
      <p className="text-[13px] font-medium text-blue-900">{selectedCount} product{selectedCount !== 1 ? "s" : ""} selected</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={onCopyProductUrls} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-800 hover:bg-blue-100">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Copy product URLs
        </button>
        <button type="button" onClick={onCopyAffiliateUrls} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-800 hover:bg-blue-100">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Copy affiliate URLs
        </button>
        <button type="button" onClick={onMarkInactive} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-800 hover:bg-blue-100">
          <ToggleLeft className="h-3.5 w-3.5" aria-hidden="true" /> Mark inactive
        </button>
        <button type="button" onClick={onReactivate} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-800 hover:bg-blue-100">
          <ToggleRight className="h-3.5 w-3.5" aria-hidden="true" /> Reactivate
        </button>
        <button type="button" onClick={onRemoveSelected} className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-600 px-3 text-[12px] font-medium text-white hover:bg-rose-700">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
        </button>
        <button type="button" onClick={onClearSelection} className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-800 hover:bg-blue-100">
          Clear
        </button>
      </div>
    </div>
  );
}
