import { apiFetch } from "@/lib/api/client";

export type InboxNotification = {
  id: string;
  subject: string;
  message: string;
  action_url: string | null;
  sender: {
    id: number | null;
    name: string;
  };
  read_at: string | null;
  created_at: string | null;
};

export type NotificationListMeta = {
  current_page: number;
  per_page: number;
  total: number;
};

export type NotificationListResponse = {
  data: InboxNotification[];
  meta: NotificationListMeta;
};

export async function getNotifications(params?: {
  unread?: boolean;
  page?: number;
  per_page?: number;
  signal?: AbortSignal;
}): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.unread) {
    searchParams.set("unread", "1");
  }
  if (params?.page) {
    searchParams.set("page", String(params.page));
  }
  if (params?.per_page) {
    searchParams.set("per_page", String(params.per_page));
  }

  const query = searchParams.toString();
  const url = query ? `/notifications?${query}` : "/notifications";

  return apiFetch<NotificationListResponse>(url, {
    method: "GET",
    signal: params?.signal,
  });
}

export async function getUnreadNotificationCount(
  signal?: AbortSignal
): Promise<number> {
  const res = await apiFetch<{ success: boolean; data: { unread_count: number } }>(
    "/notifications/unread-count",
    { method: "GET", signal }
  );
  return res?.data?.unread_count ?? 0;
}

export async function markNotificationRead(
  id: string,
  signal?: AbortSignal
): Promise<{ id: string; read_at: string | null }> {
  const res = await apiFetch<{ success: boolean; data: { id: string; read_at: string | null } }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: "PATCH", signal }
  );
  return res.data;
}

export async function markAllNotificationsRead(
  signal?: AbortSignal
): Promise<number> {
  const res = await apiFetch<{ success: boolean; data: { marked_read: number } }>(
    "/notifications/read-all",
    { method: "PATCH", signal }
  );
  return res?.data?.marked_read ?? 0;
}
