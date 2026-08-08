import type { PublisherPost, PublisherPostStatus } from "@/features/scheduler/scheduler.types";
import { apiFetch } from "./client";

export async function fetchHistoryPosts(params?: {
  platform?: string;
  statuses?: PublisherPostStatus[];
  action?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}): Promise<{ data: PublisherPost[]; meta: { current_page: number; per_page: number; total: number } }> {
  const searchParams = new URLSearchParams();
  
  if (params?.platform) searchParams.set("platform", params.platform);
  if (params?.statuses && params.statuses.length > 0) {
    params.statuses.forEach((status) => searchParams.append("statuses[]", status));
  }
  if (params?.action) searchParams.set("action", params.action);
  if (params?.date_from) searchParams.set("date_from", params.date_from);
  if (params?.date_to) searchParams.set("date_to", params.date_to);
  if (params?.per_page) searchParams.set("per_page", params.per_page.toString());

  const query = searchParams.toString();
  const path = query ? `/publisher/posts?${query}` : "/publisher/posts";

  return apiFetch(path, {
    method: "GET",
  });
}

export async function deletePublisherHistoryBatch(ids: string[]): Promise<{
  success: boolean;
  message?: string;
  data?: { deleted_count: number };
  error?: string;
  messages?: Record<string, string[]>;
}> {
  return apiFetch("/publisher/posts/history/batch", {
    method: "DELETE",
    body: { ids },
  });
}

export async function clearPublisherHistory(filters?: {
  platform?: string;
  status?: string;
  action?: string;
  provider_mode?: string;
}): Promise<{
  success: boolean;
  message?: string;
  data?: { deleted_count: number };
  error?: string;
  messages?: Record<string, string[]>;
}> {
  return apiFetch("/publisher/posts/history/clear", {
    method: "DELETE",
    body: filters,
  });
}
