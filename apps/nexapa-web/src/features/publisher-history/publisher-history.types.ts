export type PublisherHistoryPlatform = "facebook" | "tiktok" | "youtube" | "shopee";

export type PublisherHistoryStatus = "completed" | "published" | "failed" | "cancelled";

export type PublisherHistoryRecord = {
  id: string;
  platform: PublisherHistoryPlatform;
  status: PublisherHistoryStatus;
  provider_status: string | null;
  caption: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  provider_publish_id: string | null;
  permalink?: string | null;
  destination_name: string;
  destination_avatar?: string | null;
  thumbnail_url?: string | null;
  media_type?: "image" | "video";
  content_url?: string | null;
  media_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type PublisherHistoryFilter = {
  search: string;
  platform: "all" | PublisherHistoryPlatform;
  status: "all" | PublisherHistoryStatus;
  dateRange: "all" | "today" | "last7" | "last30";
};

export type PublisherHistorySort = "newest" | "oldest" | "recent-updated";

export type PublisherHistoryView = "grid" | "list";
