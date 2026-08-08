import { Clock, Eye } from "lucide-react";
import type { HistoryRecord } from "../history.types";
import { CATEGORY_LABELS, STATUS_LABELS } from "../history.constants";
import { formatHistoryTime } from "../history.utils";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  records: HistoryRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenDetails: (record: HistoryRecord) => void;
};

const statusTone: Record<string, string> = {
  information: "bg-slate-100 text-slate-600",
  "action-required": "bg-amber-50 text-amber-700",
  warning: "bg-orange-50 text-orange-700",
  "complete-locally": "bg-emerald-50 text-emerald-700",
  "backend-required": "bg-blue-50 text-blue-700",
  cancelled: "bg-rose-50 text-rose-600",
};

export function HistoryList({ records, selectedIds, onToggleSelect, onOpenDetails }: Props) {
  if (records.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="hidden grid-cols-[32px_1fr_100px_90px_80px_60px] gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:grid">
        <span />
        <span>Activity</span>
        <span>Category</span>
        <span>Status</span>
        <span>Platform</span>
        <span>Actions</span>
      </div>

      {/* Rows */}
      {records.map((record) => (
        <div
          key={record.id}
          role="group"
          tabIndex={0}
          aria-label={`${record.title}, ${selectedIds.has(record.id) ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
          onClick={(event) => {
            if (!isInteractiveSelectionTarget(event.target)) onToggleSelect(record.id);
          }}
          onKeyDown={(event) => {
            if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
              event.preventDefault();
              onToggleSelect(record.id);
            }
          }}
          className={cn(
            "grid cursor-pointer grid-cols-1 gap-1.5 border-b border-slate-50 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:grid-cols-[32px_1fr_100px_90px_80px_60px] sm:items-center sm:gap-2",
            selectedIds.has(record.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50",
          )}
        >
          <div className="hidden sm:block">
            <SelectionCheckbox
              checked={selectedIds.has(record.id)}
              onChange={() => onToggleSelect(record.id)}
              ariaLabel={`${selectedIds.has(record.id) ? "Deselect" : "Select"} ${record.title}`}
              className="h-3.5 w-3.5"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <SelectionCheckbox
                checked={selectedIds.has(record.id)}
                onChange={() => onToggleSelect(record.id)}
                ariaLabel={`${selectedIds.has(record.id) ? "Deselect" : "Select"} ${record.title}`}
                className="h-3.5 w-3.5 sm:hidden"
              />
              <h4 className="truncate text-[12px] font-medium text-slate-900">{record.title}</h4>
              {record.isDemo && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-700">Demo</span>}
            </div>
            <p className="text-[10px] text-slate-500 line-clamp-1">{record.description}</p>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
              <Clock className="h-2.5 w-2.5" /> {formatHistoryTime(record.timestamp)}
              {record.referenceLabel && <span>&middot; {record.referenceLabel}</span>}
            </div>
          </div>

          <div className="hidden sm:block">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">{CATEGORY_LABELS[record.category]}</span>
          </div>

          <div className="hidden sm:block">
            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", statusTone[record.status] || "bg-slate-100 text-slate-600")}>{STATUS_LABELS[record.status]}</span>
          </div>

          <div className="hidden sm:block">
            {record.platform && <span className="text-[10px] text-slate-500">{record.platform}</span>}
          </div>

          <div className="hidden sm:block">
            <button type="button" onClick={() => onOpenDetails(record)} className="inline-flex h-6 items-center rounded px-1.5 text-[10px] text-slate-400 hover:bg-slate-100 transition-colors">
              <Eye className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
