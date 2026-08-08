import type { HistoryRecord, HistoryFilter, HistorySort, HistoryCategory } from "./history.types";
import { CATEGORY_ROUTES } from "./history.constants";

let idSeq = 0;
export function generateHistoryId(): string {
  idSeq += 1;
  return `hist_${Date.now().toString(36)}_${idSeq.toString(36)}`;
}

export function filterHistory(records: HistoryRecord[], filter: HistoryFilter): HistoryRecord[] {
  let list = [...records];
  const term = filter.search.trim().toLowerCase();
  if (term) {
    list = list.filter((r) =>
      r.title.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      r.referenceLabel.toLowerCase().includes(term) ||
      r.platform.toLowerCase().includes(term)
    );
  }
  if (filter.category !== "all") {
    list = list.filter((r) => r.category === filter.category);
  }
  if (filter.status !== "all") {
    list = list.filter((r) => r.status === filter.status);
  }
  if (filter.platform !== "all") {
    list = list.filter((r) => r.platform === filter.platform);
  }
  if (filter.dateRange !== "all") {
    const now = Date.now();
    if (filter.dateRange === "today") {
      const todayKey = new Date().toISOString().slice(0, 10);
      list = list.filter((r) => new Date(r.timestamp).toISOString().slice(0, 10) === todayKey);
    } else if (filter.dateRange === "last7") {
      list = list.filter((r) => r.timestamp > now - 7 * 24 * 60 * 60 * 1000);
    } else if (filter.dateRange === "last30") {
      list = list.filter((r) => r.timestamp > now - 30 * 24 * 60 * 60 * 1000);
    }
  }
  return list;
}

export function sortHistory(records: HistoryRecord[], sort: HistorySort): HistoryRecord[] {
  const copy = [...records];
  switch (sort) {
    case "newest": return copy.sort((a, b) => b.timestamp - a.timestamp);
    case "oldest": return copy.sort((a, b) => a.timestamp - b.timestamp);
    case "category": return copy.sort((a, b) => a.category.localeCompare(b.category));
    case "status": return copy.sort((a, b) => a.status.localeCompare(b.status));
    default: return copy;
  }
}

export function getHistoryRoute(category: HistoryCategory): string {
  return CATEGORY_ROUTES[category] ?? "/dashboard";
}

export function formatHistoryTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHistoryDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
