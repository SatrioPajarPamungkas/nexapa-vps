import { useMemo } from "react";
import { Clock, ExternalLink } from "lucide-react";
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

type Group = { key: string; label: string; items: HistoryRecord[] };

const statusTone: Record<string, string> = {
  information: "bg-slate-100 text-slate-600",
  "action-required": "bg-amber-50 text-amber-700",
  warning: "bg-orange-50 text-orange-700",
  "complete-locally": "bg-emerald-50 text-emerald-700",
  "backend-required": "bg-blue-50 text-blue-700",
  cancelled: "bg-rose-50 text-rose-600",
};

const categoryIcon: Record<string, string> = {
  downloads: "\u2B07",
  media: "\u{1F3AC}",
  accounts: "\u{1F464}",
  publishing: "\u{1F4E4}",
  scheduler: "\u{1F4C5}",
  affiliate: "\u{1F4B0}",
  settings: "\u2699",
  system: "\u{1F4BB}",
};

export function HistoryTimeline({ records, selectedIds, onToggleSelect, onOpenDetails }: Props) {
  const groups = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const g: Record<string, Group> = {
      today: { key: "today", label: "Today", items: [] },
      yesterday: { key: "yesterday", label: "Yesterday", items: [] },
      thisWeek: { key: "this-week", label: "This week", items: [] },
      earlier: { key: "earlier", label: "Earlier", items: [] },
    };

    for (const r of records) {
      const d = new Date(r.timestamp);
      const dk = d.toISOString().slice(0, 10);
      if (dk === todayKey) g.today.items.push(r);
      else if (dk === yesterdayKey) g.yesterday.items.push(r);
      else if (d > weekAgo) g.thisWeek.items.push(r);
      else g.earlier.items.push(r);
    }

    return Object.values(g).filter((gr) => gr.items.length > 0);
  }, [records]);

  if (records.length === 0) return null;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</h3>
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] tabular-nums text-slate-400">{group.items.length}</span>
          </div>

          <div className="relative ml-4 space-y-0">
            {/* Timeline connector */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />

            {group.items.map((record) => (
              <div
                key={record.id}
                role="group"
                tabIndex={0}
                aria-label={`${record.title}, ${selectedIds.has(record.id) ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
                className={cn(
                  "relative flex cursor-pointer items-start gap-3 py-2.5 pl-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  selectedIds.has(record.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50",
                )}
                onClick={(event) => {
                  if (!isInteractiveSelectionTarget(event.target)) onToggleSelect(record.id);
                }}
                onKeyDown={(event) => {
                  if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
                    event.preventDefault();
                    onToggleSelect(record.id);
                  }
                }}
              >
                {/* Timeline node */}
                <div className={cn(
                  "absolute left-0 top-3.5 h-2.5 w-2.5 -translate-x-[5px] rounded-full ring-2 ring-white",
                  record.status === "complete-locally" ? "bg-emerald-500" :
                  record.status === "backend-required" ? "bg-blue-500" :
                  record.status === "warning" ? "bg-amber-500" :
                  "bg-slate-400",
                )} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <SelectionCheckbox
                      checked={selectedIds.has(record.id)}
                      onChange={() => onToggleSelect(record.id)}
                      ariaLabel={`${selectedIds.has(record.id) ? "Deselect" : "Select"} ${record.title}`}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[14px]" aria-hidden="true">{categoryIcon[record.category] || "\u{1F4CB}"}</span>
                    <h4 className="truncate text-[12px] font-semibold text-slate-900">{record.title}</h4>
                    {record.isDemo && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-700">Demo</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{record.description}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatHistoryTime(record.timestamp)}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", statusTone[record.status] || "bg-slate-100 text-slate-600")}>{STATUS_LABELS[record.status]}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">{CATEGORY_LABELS[record.category]}</span>
                    {record.platform && <span className="text-slate-400">{record.platform}</span>}
                  </div>
                </div>

                <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDetails(record); }} className="shrink-0 inline-flex h-6 items-center rounded px-1.5 text-[10px] text-slate-400 hover:bg-slate-100 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
