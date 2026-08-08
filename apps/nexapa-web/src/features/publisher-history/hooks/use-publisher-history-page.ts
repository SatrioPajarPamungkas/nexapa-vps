import { useCallback, useEffect, useState } from "react";
import type { PublisherHistoryRecord, PublisherHistoryFilter, PublisherHistorySort, PublisherHistoryView, PublisherHistoryPlatform, PublisherHistoryStatus } from "../publisher-history.types";
import { fetchHistoryPosts, deletePublisherHistoryBatch, clearPublisherHistory } from "@/lib/api/history";
import { usePublisherHistoryWorkspace } from "../publisher-history.utils";

const HISTORY_STATUSES = ["completed", "published", "failed", "cancelled"] as const;

export function usePublisherHistoryPage() {
  const [records, setRecords] = useState<PublisherHistoryRecord[]>([]);
  const [filter, setFilter] = useState<PublisherHistoryFilter>({
    search: "",
    platform: "all",
    status: "all",
    dateRange: "all",
  });
  const [sort, setSort] = useState<PublisherHistorySort>("newest");
  const [view, setView] = useState<PublisherHistoryView>("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { filtered, sorted } = usePublisherHistoryWorkspace(records, filter, sort);

  const hasActiveFilters = filter.search.trim() !== "" || filter.platform !== "all" || filter.status !== "all" || filter.dateRange !== "all";

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof fetchHistoryPosts>[0] = {
        per_page: 100,
        statuses: [...HISTORY_STATUSES],
      };
      
      if (filter.platform !== "all") {
        params.platform = filter.platform;
      }
      
      const result = await fetchHistoryPosts(params);
      
      const historyRecords: PublisherHistoryRecord[] = result.data.map((post) => ({
        id: post.id,
        platform: post.platform as PublisherHistoryPlatform,
        status: post.status as PublisherHistoryStatus,
        provider_status: post.provider_status,
        caption: post.caption,
        scheduled_at: post.scheduled_at,
        published_at: post.published_at,
        provider_publish_id: post.provider_publish_id,
        permalink: typeof post.metadata?.permalink_url === "string"
          ? post.metadata.permalink_url
          : typeof post.metadata?.permalink === "string"
            ? post.metadata.permalink
            : null,
        destination_name: post.connected_account?.display_name || post.connected_account?.name || "Destination unavailable",
        destination_avatar: post.connected_account?.avatar_url || undefined,
        thumbnail_url: post.media_asset?.thumbnail_url || undefined,
        media_type: post.media_asset?.media_type,
        content_url: post.media_asset?.content_url || undefined,
        media_name: post.media_asset?.original_filename || post.media_asset?.original_name || post.media_asset?.display_name || undefined,
        created_at: post.created_at,
        updated_at: post.updated_at,
      }));
      
      setRecords(historyRecords);
      setSelectedIds(new Set());
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load publishing history");
    } finally {
      setIsLoading(false);
    }
  }, [filter.platform]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const clearFilters = useCallback(() => {
    setFilter({
      search: "",
      platform: "all",
      status: "all",
      dateRange: "all",
    });
  }, []);

  const selectRecord = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const getSelectedRecord = useCallback(() => {
    if (!selectedId) return null;
    return records.find((r) => r.id === selectedId) || null;
  }, [selectedId, records]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    const visibleIds = sorted.map((r) => r.id);
    setSelectedIds(new Set(visibleIds));
  }, [sorted]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (selectedIds.size === 0) {
      return { success: false, error: "No items selected" };
    }

    setIsDeleting(true);
    try {
      const result = await deletePublisherHistoryBatch(Array.from(selectedIds));
      
      if (result.success) {
        setSelectedIds(new Set());
        await loadRecords();
        return { success: true, message: `${result.data?.deleted_count || 0} items deleted` };
      } else {
        return { success: false, error: result.error || "Failed to delete" };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete" };
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, loadRecords]);

  const clearHistory = useCallback(async (): Promise<{ success: boolean; message?: string; error?: string; deletedCount?: number }> => {
    setIsDeleting(true);
    try {
      const filters: Parameters<typeof clearPublisherHistory>[0] = {};
      
      if (filter.platform !== "all") {
        filters.platform = filter.platform;
      }
      
      if (filter.status !== "all") {
        filters.status = filter.status;
      }
      
      const result = await clearPublisherHistory(filters);
      
      if (result.success) {
        setSelectedIds(new Set());
        await loadRecords();
        return { success: true, message: result.message, deletedCount: result.data?.deleted_count };
      } else {
        return { success: false, error: result.error || "Failed to clear history" };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to clear history" };
    } finally {
      setIsDeleting(false);
    }
  }, [filter.platform, filter.status, loadRecords]);

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
    isLoading,
    error,
    hasActiveFilters,
    clearFilters,
    selectedId,
    selectRecord,
    getSelectedRecord,
    selectedIds,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    deleteSelected,
    clearHistory,
    isDeleting,
    reloadRecords: loadRecords,
  };
}
