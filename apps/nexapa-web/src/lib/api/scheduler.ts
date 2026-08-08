import type { PublisherPost, PublisherPostStatus, SchedulerStatus, ConnectedAccount } from "@/features/scheduler/scheduler.types";
import { apiPost } from "./client";

const API_BASE = import.meta.env.VITE_NEXAPA_API_BASE_URL || "/api/v1";

export async function fetchSchedulerPosts(params?: {
  platform?: string;
  status?: string;
  statuses?: PublisherPostStatus[];
  action?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
  active?: boolean;
}): Promise<{ data: PublisherPost[]; meta: { current_page: number; per_page: number; total: number } }> {
  const url = new URL(`${API_BASE}/publisher/posts`);
  
  if (params?.platform) url.searchParams.set("platform", params.platform);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.statuses && params.statuses.length > 0) {
    params.statuses.forEach((status) => url.searchParams.append("statuses[]", status));
  }
  if (params?.action) url.searchParams.set("action", params.action);
  if (params?.date_from) url.searchParams.set("date_from", params.date_from);
  if (params?.date_to) url.searchParams.set("date_to", params.date_to);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.per_page) url.searchParams.set("per_page", params.per_page.toString());
  if (params?.active !== undefined) url.searchParams.set("active", params.active.toString());

  const response = await fetch(url.toString(), {
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error("[Scheduler Load Error] HTTP", response.status, errorText);
    throw new Error(`Failed to fetch scheduler posts: HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchSchedulerPost(id: string): Promise<PublisherPost> {
  const response = await fetch(`${API_BASE}/publisher/posts/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch scheduler post");
  }

  const json = await response.json();
  return json.data;
}

export async function cancelSchedule(id: string): Promise<PublisherPost> {
  const response = await fetch(`${API_BASE}/publisher/posts/${id}/cancel`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to cancel schedule" }));
    throw new Error(error.message || error.error || "Failed to cancel schedule");
  }

  const json = await response.json();
  return json.data;
}

export async function reschedulePost(id: string, scheduledAt: string): Promise<PublisherPost> {
  const response = await fetch(`${API_BASE}/publisher/posts/${id}/reschedule`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to reschedule" }));
    throw new Error(error.message || error.error || "Failed to reschedule");
  }

  const json = await response.json();
  return json.data;
}

export async function fetchSchedulerStatus(): Promise<SchedulerStatus> {
  const response = await fetch(`${API_BASE}/publisher/scheduler/status`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch scheduler status");
  }

  return response.json();
}

export async function fetchConnectedAccounts(params?: {
  platform?: string;
  status?: string;
}): Promise<ConnectedAccount[]> {
  const url = new URL(`${API_BASE}/connected-accounts`);
  
  if (params?.platform) url.searchParams.set("platform", params.platform);
  if (params?.status) url.searchParams.set("status", params.status);

  const response = await fetch(url.toString(), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch connected accounts");
  }

  const json = await response.json();
  return json.data || [];
}

export async function createSchedulePost(payload: {
  connected_account_id: string;
  media_asset_id?: string | null;
  caption?: string | null;
  action: "schedule";
  post_type: "text" | "image" | "video";
  scheduled_at: string;
  timezone: string;
  platform_settings?: Record<string, unknown>;
}): Promise<{ success: boolean; data: { id: string; status: string; action: string } }> {
  const response = await fetch(`${API_BASE}/publisher/posts`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to create schedule" }));
    throw new Error(error.message || "Failed to create schedule");
  }

  return response.json();
}

export type BatchScheduleItem = {
  media_asset_id: string;
  caption: string;
  scheduled_at: string;
  post_type: "video";
  platform_settings: Record<string, unknown>;
};

export type BatchSchedulePayload = {
  platform: "facebook" | "tiktok";
  connected_account_id?: string;
  connected_account_ids?: string[];
  timezone: string;
  items: BatchScheduleItem[];
};

export type BatchScheduleResponse = {
  success: boolean;
  created_count: number;
  destination_count: number;
  video_count: number;
  posts: PublisherPost[];
};

export async function createBatchSchedule(payload: BatchSchedulePayload): Promise<BatchScheduleResponse> {
  return apiPost<BatchScheduleResponse>("/publisher/schedules/batch", payload);
}

export async function cancelBatchSchedules(ids: string[]): Promise<{ cancelled_count: number; posts: PublisherPost[] }> {
  return apiPost(`${API_BASE}/publisher/schedules/cancel-batch`, { ids });
}
