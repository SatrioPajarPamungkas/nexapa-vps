import { useMemo } from "react";
import type { PublisherHistoryRecord, PublisherHistoryFilter, PublisherHistorySort } from "./publisher-history.types";

export function filterPublisherHistory(records: PublisherHistoryRecord[], filter: PublisherHistoryFilter): PublisherHistoryRecord[] {
  return records.filter((record) => {
    if (filter.platform !== "all" && record.platform !== filter.platform) {
      return false;
    }

    if (filter.status !== "all" && record.status !== filter.status) {
      return false;
    }

    if (filter.dateRange !== "all") {
      const recordDate = new Date(record.published_at || record.created_at).getTime();
      const now = Date.now();
      const today = new Date(now).setHours(0, 0, 0, 0);
      
      if (filter.dateRange === "today") {
        if (recordDate < today) return false;
      } else if (filter.dateRange === "last7") {
        if (recordDate < today - 7 * 24 * 60 * 60 * 1000) return false;
      } else if (filter.dateRange === "last30") {
        if (recordDate < today - 30 * 24 * 60 * 60 * 1000) return false;
      }
    }

    if (filter.search.trim()) {
      const searchLower = filter.search.toLowerCase();
      const caption = (record.caption || "").toLowerCase();
      const destination = (record.destination_name || "").toLowerCase();
      const mediaName = (record.media_name || "").toLowerCase();
      
      if (!caption.includes(searchLower) && !destination.includes(searchLower) && !mediaName.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

export function sortPublisherHistory(records: PublisherHistoryRecord[], sort: PublisherHistorySort): PublisherHistoryRecord[] {
  const sorted = [...records];
  
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();
        return dateB - dateA;
      });
    case "oldest":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();
        return dateA - dateB;
      });
    case "recent-updated":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA;
      });
    default:
      return sorted;
  }
}

export function usePublisherHistoryWorkspace(
  records: PublisherHistoryRecord[],
  filter: PublisherHistoryFilter,
  sort: PublisherHistorySort
) {
  const filtered = useMemo(() => filterPublisherHistory(records, filter), [records, filter]);
  const sorted = useMemo(() => sortPublisherHistory(filtered, sort), [filtered, sort]);
  
  return { filtered, sorted };
}