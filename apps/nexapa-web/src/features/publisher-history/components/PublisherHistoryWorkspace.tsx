import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { usePublisherHistoryPage } from "../hooks/use-publisher-history-page";
import { PublisherHistoryToolbar } from "./PublisherHistoryToolbar";
import { PublisherHistoryCard } from "./PublisherHistoryCard";
import { PublisherHistoryListItem } from "./PublisherHistoryListItem";
import { PublisherHistoryDetailsDrawer } from "./PublisherHistoryDetailsDrawer";
import { PublisherHistorySelectionBar } from "./PublisherHistorySelectionBar";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

type ConfirmMode = "selected" | "clear" | null;

export function PublisherHistoryWorkspace() {
  const {
    records,
    sorted,
    filter,
    setFilter,
    sort,
    setSort,
    view,
    setView,
    isLoading,
    error,
    hasActiveFilters,
    clearFilters,
    selectRecord,
    getSelectedRecord,
    selectedIds,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    deleteSelected,
    clearHistory,
    isDeleting,
  } = usePublisherHistoryPage();

  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-2xl">
            <div className="mb-3 h-4 w-24 rounded bg-white/10" />
            <div className="mb-3 aspect-video rounded-xl bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="mt-2 h-3 w-2/3 rounded bg-white/8" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 backdrop-blur-xl">
        <p className="text-[13px] font-semibold text-red-800">Failed to load publishing history</p>
        <p className="text-[12px] text-red-700/80 mt-1">{error}</p>
      </div>
    );
  }

  const selectedRecord = getSelectedRecord();

  const handleOpenDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmMode("selected");
  };

  const handleOpenClearHistory = () => {
    setConfirmMode("clear");
  };

  const handleCloseConfirm = () => {
    setConfirmMode(null);
  };

  const handleConfirmDelete = async () => {
    if (confirmMode === "selected") {
      setDeleteLoading(true);
      try {
        const result = await deleteSelected();

        if (result.success) {
          handleCloseConfirm();
          clearSelection();
        }
      } finally {
        setDeleteLoading(false);
      }
    } else if (confirmMode === "clear") {
      setDeleteLoading(true);
      try {
        const result = await clearHistory();

        if (result.success) {
          handleCloseConfirm();
          clearSelection();
        }
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const getConfirmDialogTitle = () => {
    if (confirmMode === "selected") {
      return "Hapus riwayat terpilih?";
    }
    return "Hapus riwayat pada filter ini?";
  };

  const getConfirmDialogDescription = () => {
    if (confirmMode === "selected") {
      return `${selectedIds.size} data riwayat akan dihapus dari Nexapa. Postingan yang sudah tayang dan file media tidak akan dihapus.`;
    }

    const filterDesc = filter.platform !== "all" ? ` untuk ${filter.platform === "facebook" ? "Facebook" : filter.platform}` : "";
    return `Semua data riwayat selesai${filterDesc} akan dihapus. Postingan di platform dan file media tetap aman.`;
  };

  const getConfirmLabel = () => {
    if (confirmMode === "selected") {
      return `Hapus ${selectedIds.size} Riwayat`;
    }
    return "Hapus Riwayat";
  };

  return (
    <div className="space-y-4 bg-transparent">
      {selectedIds.size > 0 && (
        <PublisherHistorySelectionBar
          selectedCount={selectedIds.size}
          onDeleteSelected={handleOpenDeleteSelected}
          onClearSelection={clearSelection}
          isDeleting={isDeleting}
        />
      )}

      <PublisherHistoryToolbar
        filter={filter}
        sort={sort}
        view={view}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onViewChange={setView}
        onClearFilters={clearFilters}
        visibleCount={sorted.length}
        hasActiveFilters={hasActiveFilters}
        onSelectAllVisible={selectAllVisible}
        onClearHistory={handleOpenClearHistory}
        isDeleting={isDeleting}
        totalRecords={records.length}
      />

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-10 text-center shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/20 backdrop-blur-xl">
            <CalendarClock className="h-5 w-5 text-slate-600" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-slate-950">
            No publishing history
          </h3>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-5 text-slate-600">
            Published posts will appear here once they are successfully posted to your connected accounts.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 bg-transparent">
          {sorted.map((record) => (
            <PublisherHistoryCard
              key={record.id}
              record={record}
              isSelected={selectedIds.has(record.id)}
              onToggleSelect={() => toggleSelect(record.id)}
              onClick={() => selectRecord(record.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 bg-transparent">
          {sorted.map((record) => (
            <PublisherHistoryListItem
              key={record.id}
              record={record}
              isSelected={selectedIds.has(record.id)}
              onToggleSelect={() => toggleSelect(record.id)}
              onClick={() => selectRecord(record.id)}
            />
          ))}
        </div>
      )}

      <PublisherHistoryDetailsDrawer
        record={selectedRecord}
        onClose={() => selectRecord(null)}
      />

      <ConfirmDialog
        open={confirmMode !== null}
        title={getConfirmDialogTitle()}
        description={getConfirmDialogDescription()}
        confirmLabel={getConfirmLabel()}
        cancelLabel="Batal"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseConfirm}
      />
    </div>
  );
}
