import { useEffect, useRef } from "react";
import { X, Copy, Trash2, ExternalLink } from "lucide-react";
import type { HistoryRecord } from "../history.types";
import { CATEGORY_LABELS, STATUS_LABELS } from "../history.constants";
import { formatHistoryDate, getHistoryRoute } from "../history.utils";
import { cn } from "@/lib/cn";

type Props = {
  record: HistoryRecord | null;
  onClose: () => void;
  onRemove: (id: string) => void;
  onCopyDetails: (record: HistoryRecord) => void;
};

const statusTone: Record<string, string> = {
  information: "bg-slate-100 text-slate-600",
  "action-required": "bg-amber-50 text-amber-700",
  warning: "bg-orange-50 text-orange-700",
  "complete-locally": "bg-emerald-50 text-emerald-700",
  "backend-required": "bg-blue-50 text-blue-700",
  cancelled: "bg-rose-50 text-rose-600",
};

export function HistoryDetailsDrawer({ record, onClose, onRemove, onCopyDetails }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (record) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => dialogRef.current?.focus(), 0);
    } else {
      window.setTimeout(() => prevFocusRef.current?.focus(), 0);
    }
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [record, onClose]);

  if (!record) return null;

  const route = getHistoryRoute(record.category);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="history-detail-title">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="ml-auto h-full w-full max-w-[480px] overflow-hidden bg-white shadow-2xl drawer-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id="history-detail-title" className="truncate text-[15px] font-semibold text-slate-900">{record.title}</h2>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusTone[record.status])}>{STATUS_LABELS[record.status]}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{CATEGORY_LABELS[record.category]}</span>
              {record.isDemo && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Demo</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <InfoRow label="Timestamp" value={formatHistoryDate(record.timestamp)} />
            <InfoRow label="Action" value={record.action} />
            <InfoRow label="Description" value={record.description} />
            {record.platform && <InfoRow label="Platform" value={record.platform} />}
            <InfoRow label="Reference" value={`${record.referenceType}: ${record.referenceLabel}`} />
            <InfoRow label="Category" value={CATEGORY_LABELS[record.category]} />
            <InfoRow label="Status" value={STATUS_LABELS[record.status]} />
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500 ring-1 ring-slate-100">
            Activity is stored in local browser memory only. No remote activity log exists.
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 transition-colors">Close</button>
          <div className="flex-1" />
          <button type="button" onClick={() => onCopyDetails(record)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Copy className="h-3 w-3" /> Copy
          </button>
          <a href={route} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            <ExternalLink className="h-3 w-3" /> Open
          </a>
          <button type="button" onClick={() => { onRemove(record.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-100 transition-colors">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <p className="mt-0.5 text-[12px] text-slate-700">{value}</p>
    </div>
  );
}
