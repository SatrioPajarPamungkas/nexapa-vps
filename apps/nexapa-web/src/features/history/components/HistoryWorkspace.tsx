import { useState, useCallback } from "react";
import { CalendarClock, Download, Trash2 } from "lucide-react";
import { useHistoryWorkspace } from "../hooks/useHistoryWorkspace";
import { HistoryToolbar } from "./HistoryToolbar";
import { HistoryTimeline } from "./HistoryTimeline";
import { HistoryList } from "./HistoryList";
import { HistoryDetailsDrawer } from "./HistoryDetailsDrawer";
import { HistorySelectionBar } from "./HistorySelectionBar";
import type { HistoryRecord } from "../history.types";

export function HistoryWorkspace() {
  const ws = useHistoryWorkspace();
  const [detailsRecord, setDetailsRecord] = useState<HistoryRecord | null>(null);

  const handleCopyDetails = useCallback(async (record: HistoryRecord) => {
    const text = `Title: ${record.title}\nCategory: ${record.category}\nStatus: ${record.status}\nDescription: ${record.description}\nTimestamp: ${new Date(record.timestamp).toISOString()}\nReference: ${record.referenceType}: ${record.referenceLabel}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      ws.announce("Details copied to clipboard");
    } catch {
      ws.announce("Clipboard access failed");
    }
  }, [ws]);

  return (
    <div className="space-y-4">
      {/* Compact backend notice */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <p className="flex-1 text-[11px] text-slate-500">
          Local activity only. Downloads, media changes, account preparation, publishing drafts, schedules, and affiliate workflows appear here.
        </p>
      </div>

      {/* Toolbar */}
      <HistoryToolbar
        filter={ws.filter}
        sort={ws.sort}
        view={ws.view}
        onFilterChange={ws.setFilter}
        onSortChange={ws.setSort}
        onViewChange={ws.setView}
        onClearFilters={ws.clearFilters}
        visibleCount={ws.filtered.length}
        selectedCount={ws.selectedIds.size}
        hasActiveFilters={ws.hasActiveFilters}
      />

      {/* Selection bar */}
      <HistorySelectionBar
        selectedCount={ws.selectedIds.size}
        onRemoveSelected={ws.removeSelected}
        onClearSelection={ws.clearSelection}
        onCopySelected={ws.exportVisible}
        onSelectAllVisible={ws.selectAllVisible}
        totalVisible={ws.filtered.length}
      />

      {/* Content */}
      {ws.records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            <CalendarClock className="h-5 w-5 text-slate-400" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-slate-900">No activity recorded</h3>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-5 text-slate-500">
            Downloads, media changes, account preparation, publishing drafts, schedules, affiliate workflows, and settings activity will appear here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={ws.loadDemo} className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
              Load Demo Activity
            </button>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Demo items display DEMO &middot; No API request &middot; Clears on refresh</p>
        </div>
      ) : ws.filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-[14px] font-semibold text-slate-900">No schedules match these filters</h3>
          <p className="mt-1 text-[12px] text-slate-500">Adjust the filters or clear the search.</p>
          <button type="button" onClick={ws.clearFilters} className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-slate-900 px-3 text-[12px] font-medium text-white hover:bg-slate-800 transition-colors">
            Clear Filters
          </button>
        </div>
      ) : ws.view === "timeline" ? (
        <HistoryTimeline
          records={ws.sorted}
          selectedIds={ws.selectedIds}
          onToggleSelect={ws.toggleSelect}
          onOpenDetails={setDetailsRecord}
        />
      ) : (
        <HistoryList
          records={ws.sorted}
          selectedIds={ws.selectedIds}
          onToggleSelect={ws.toggleSelect}
          onOpenDetails={setDetailsRecord}
        />
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={ws.exportVisible} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export Visible
        </button>
        <button type="button" onClick={ws.clearAll} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12px] font-medium text-rose-700 hover:bg-rose-100 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Clear Local History
        </button>
        {!ws.showDemo ? (
          <button type="button" onClick={ws.loadDemo} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Load Demo
          </button>
        ) : (
          <button type="button" onClick={ws.clearDemo} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">
            Clear Demo
          </button>
        )}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">{ws.feedback}</div>

      <HistoryDetailsDrawer
        record={detailsRecord}
        onClose={() => setDetailsRecord(null)}
        onRemove={(id) => { ws.removeRecord(id); setDetailsRecord(null); }}
        onCopyDetails={handleCopyDetails}
      />
    </div>
  );
}
