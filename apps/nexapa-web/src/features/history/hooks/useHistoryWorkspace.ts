import { useCallback, useMemo, useState } from "react";
import type { HistoryRecord, HistoryFilter, HistorySort, HistoryView } from "../history.types";
import { DEMO_HISTORY } from "../history.constants";
import { filterHistory, sortHistory, generateHistoryId } from "../history.utils";

export function useHistoryWorkspace() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>({
    search: "",
    category: "all",
    status: "all",
    dateRange: "all",
    platform: "all",
  });
  const [sort, setSort] = useState<HistorySort>("newest");
  const [view, setView] = useState<HistoryView>("timeline");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDemo, setShowDemo] = useState(false);
  const [feedback, setFeedback] = useState("");

  const announce = useCallback((msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(""), 3500);
  }, []);

  const filtered = useMemo(() => filterHistory(records, filter), [records, filter]);
  const sorted = useMemo(() => sortHistory(filtered, sort), [filtered, sort]);

  const hasActiveFilters = filter.search.trim() !== "" || filter.category !== "all" || filter.status !== "all" || filter.dateRange !== "all" || filter.platform !== "all";

  const clearFilters = useCallback(() => {
    setFilter({ search: "", category: "all", status: "all", dateRange: "all", platform: "all" });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    announce(`${selectedIds.size} record(s) removed`);
  }, [selectedIds, announce]);

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    announce("Record removed");
  }, [announce]);

  const loadDemo = useCallback(() => {
    if (showDemo) return;
    const now = Date.now();
    const demos: HistoryRecord[] = DEMO_HISTORY.map((d, i) => ({
      id: generateHistoryId(),
      category: d.category,
      action: d.action,
      title: d.title,
      description: d.description,
      platform: d.platform,
      status: d.status,
      referenceType: d.referenceType,
      referenceId: `demo-${i}`,
      referenceLabel: d.referenceLabel,
      timestamp: now - (i * 3600000),
      metadata: {},
      isDemo: true,
    }));
    setRecords((prev) => [...prev, ...demos]);
    setShowDemo(true);
    announce("Demo activity loaded. All items display DEMO.");
  }, [showDemo, announce]);

  const clearDemo = useCallback(() => {
    setRecords((prev) => prev.filter((r) => !r.isDemo));
    setSelectedIds(new Set());
    setShowDemo(false);
    announce("Demo data cleared.");
  }, [announce]);

  const addRecord = useCallback((record: Omit<HistoryRecord, "id" | "timestamp">) => {
    const newRecord: HistoryRecord = {
      ...record,
      id: generateHistoryId(),
      timestamp: Date.now(),
    };
    setRecords((prev) => [newRecord, ...prev]);
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
    setSelectedIds(new Set());
    announce("All history cleared");
  }, [announce]);

  const exportVisible = useCallback(async () => {
    const safe = sorted.map((r) => ({
      category: r.category,
      action: r.action,
      title: r.title,
      description: r.description,
      platform: r.platform,
      status: r.status,
      referenceLabel: r.referenceLabel,
      timestamp: new Date(r.timestamp).toISOString(),
      isDemo: r.isDemo,
    }));
    const json = JSON.stringify(safe, null, 2);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(json);
      announce(`${safe.length} records exported to clipboard as JSON`);
    } catch {
      announce("Clipboard access failed");
    }
  }, [sorted, announce]);

  return {
    records,
    filtered,
    sorted,
    filter,
    setFilter,
    sort,
    setSort,
    view,
    setView,
    selectedIds,
    hasActiveFilters,
    clearFilters,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    removeSelected,
    removeRecord,
    loadDemo,
    clearDemo,
    showDemo,
    addRecord,
    clearAll,
    exportVisible,
    feedback,
    announce,
  };
}
