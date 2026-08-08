import type { PublisherHistoryPlatform, PublisherHistoryStatus } from "./publisher-history.types";

export const PUBLISHER_HISTORY_PLATFORMS: Array<{ id: "all" | PublisherHistoryPlatform; label: string }> = [
  { id: "all", label: "All" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "shopee", label: "Shopee" },
];

export const PUBLISHER_HISTORY_STATUSES: Array<{ id: "all" | PublisherHistoryStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "completed", label: "Published" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

export const STATUS_DISPLAY: Record<PublisherHistoryStatus, string> = {
  completed: "Published",
  published: "Published",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<PublisherHistoryStatus, string> = {
  completed: "bg-emerald-500/12 border border-emerald-400/25 text-emerald-800 backdrop-blur-xl",
  published: "bg-emerald-500/12 border border-emerald-400/25 text-emerald-800 backdrop-blur-xl",
  failed: "bg-red-500/12 border border-red-400/25 text-red-800 backdrop-blur-xl",
  cancelled: "bg-slate-500/12 border border-slate-400/25 text-slate-700 backdrop-blur-xl",
};
