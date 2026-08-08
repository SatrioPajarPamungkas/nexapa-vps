import { apiFetch, apiPost, apiDelete } from "./client";

export type PublisherPost = {
  id: string;
  user_id: string;
  connected_account_id: string;
  media_asset_id: string | null;
  platform: "facebook" | "tiktok" | "youtube" | "shopee";
  caption: string | null;
  action: "draft" | "publish_now" | "schedule";
  provider_mode: string | null;
  status: "draft" | "scheduled" | "queued" | "uploading" | "processing" | "completed" | "failed" | "cancelled";
  scheduled_at: string | null;
  provider_publish_id: string | null;
  provider_status: string | null;
  failure_code: string | null;
  failure_message: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  connected_account?: {
    id: string;
    platform: string;
    name: string;
    display_name?: string;
    username: string | null;
    is_default: boolean;
    scopes: string[] | null;
    account_type?: string;
    status: string;
    is_publishable?: boolean;
  };
  media_asset?: {
    id: string;
    display_name?: string;
    original_name?: string;
    media_type: "image" | "video";
    mime_type: string;
    size_bytes?: number;
    status: string;
    storage_path?: string;
  };
};

export type PublisherReadiness = {
  status: "ready" | "action_required" | "unavailable";
  reason_code: string | null;
  reason_message: string | null;
  checks: {
    storage_writable: boolean;
    database_available: boolean;
    tiktok_configured: boolean;
    connected_account: boolean;
    account_scope: boolean | null;
    queue_configured: boolean;
  };
};

export type AccountReadiness = {
  status: "ready" | "action_required";
  reason_code: string | null;
  reason_message: string | null;
  has_video_upload_scope: boolean;
  scopes: string[] | null;
};

export type CreatePostPayload = {
  platform?: "facebook" | "tiktok";
  connected_account_id: string;
  media_asset_id?: string;
  post_type?: "text" | "image" | "video";
  caption?: string;
  platform_settings?: { post_type: "text" | "image" | "video" };
  action: "draft" | "publish_now" | "schedule";
  provider_mode?: "direct_post" | "upload_as_draft";
  privacy_level?: string;
  disable_comment?: boolean;
  disable_duet?: boolean;
  disable_stitch?: boolean;
  brand_content_toggle?: boolean;
  brand_organic_toggle?: boolean;
  scheduled_at?: string | null;
};

export type CreatePostResponse = {
  success: true;
  message: string;
  data: Pick<PublisherPost, "id" | "status" | "action">;
};

export async function getPublisherReadiness(signal?: AbortSignal): Promise<PublisherReadiness> {
  return apiFetch<PublisherReadiness>("/publisher/readiness", { signal });
}

export async function getAccountReadiness(
  accountId: string,
  signal?: AbortSignal
): Promise<AccountReadiness> {
  return apiFetch<AccountReadiness>(`/publisher/accounts/${accountId}/readiness`, { signal });
}

export async function getPublisherPosts(
  params?: { status?: string; action?: string },
  signal?: AbortSignal
): Promise<{ data: PublisherPost[]; meta: { current_page: number; per_page: number; total: number } }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set("status", params.status);
  if (params?.action) queryParams.set("action", params.action);

  const query = queryParams.toString();
  const path = `/publisher/posts${query ? `?${query}` : ""}`;
  return apiFetch(path, { signal });
}

export async function getPublisherPost(postId: string, signal?: AbortSignal): Promise<{ data: PublisherPost }> {
  return apiFetch<{ data: PublisherPost }>(`/publisher/posts/${postId}`, { signal });
}

export async function createPublisherPost(
  payload: CreatePostPayload,
  signal?: AbortSignal
): Promise<CreatePostResponse> {
  return apiPost<CreatePostResponse>("/publisher/posts", payload, signal);
}

export async function updatePublisherPost(
  postId: string,
  payload: Partial<CreatePostPayload>,
  signal?: AbortSignal
): Promise<{ data: PublisherPost }> {
  return apiFetch<{ data: PublisherPost }>(`/publisher/posts/${postId}`, {
    method: "PATCH",
    body: payload,
    signal,
  });
}

export async function deletePublisherPost(postId: string, signal?: AbortSignal): Promise<void> {
  return apiDelete(`/publisher/posts/${postId}`, signal);
}

export async function cancelPublisherPost(postId: string, signal?: AbortSignal): Promise<{ data: PublisherPost }> {
  return apiPost<{ data: PublisherPost }>(`/publisher/posts/${postId}/cancel`, {}, signal);
}

export async function reschedulePublisherPost(
  postId: string,
  scheduledAt: string,
  signal?: AbortSignal
): Promise<{ data: PublisherPost }> {
  return apiPost<{ data: PublisherPost }>(`/publisher/posts/${postId}/reschedule`, { scheduled_at: scheduledAt }, signal);
}

export type CreatorInfoResponse = {
  data: {
    creator_nickname: string;
    creator_username: string;
    creator_avatar_url: string;
    privacy_level_options: string[];
    comment_disabled: boolean;
    duet_disabled: boolean;
    stitch_disabled: boolean;
    max_video_post_duration_sec: number;
  };
};

export async function getCreatorInfo(
  accountId: string,
  signal?: AbortSignal
): Promise<CreatorInfoResponse> {
  return apiFetch<CreatorInfoResponse>(`/publisher/accounts/${accountId}/creator-info`, { signal });
}
