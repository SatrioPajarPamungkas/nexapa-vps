import type { HistoryCategory, HistoryStatus } from "./history.types";

export const HISTORY_CATEGORIES: Array<{ id: HistoryCategory; label: string }> = [
  { id: "downloads", label: "Downloads" },
  { id: "media", label: "Media" },
  { id: "accounts", label: "Accounts" },
  { id: "publishing", label: "Publishing" },
  { id: "scheduler", label: "Scheduler" },
  { id: "affiliate", label: "Affiliate" },
  { id: "settings", label: "Settings" },
  { id: "system", label: "System" },
];

export const CATEGORY_LABELS: Record<HistoryCategory, string> = {
  downloads: "Downloads",
  media: "Media",
  accounts: "Accounts",
  publishing: "Publishing",
  scheduler: "Scheduler",
  affiliate: "Affiliate",
  settings: "Settings",
  system: "System",
};

export const STATUS_LABELS: Record<HistoryStatus, string> = {
  information: "Information",
  "action-required": "Action Required",
  warning: "Warning",
  "complete-locally": "Complete Locally",
  "backend-required": "Backend Required",
  cancelled: "Cancelled",
};

export const CATEGORY_ROUTES: Record<HistoryCategory, string> = {
  downloads: "/downloader",
  media: "/library",
  accounts: "/accounts",
  publishing: "/publisher",
  scheduler: "/scheduler",
  affiliate: "/affiliate",
  settings: "/settings",
  system: "/dashboard",
};

export const DEMO_HISTORY: Array<{
  category: HistoryCategory;
  action: string;
  title: string;
  description: string;
  platform: string;
  status: HistoryStatus;
  referenceType: string;
  referenceLabel: string;
}> = [
  { category: "media", action: "import", title: "Media draft imported", description: "demo-media-1.mp4 was added to local Media Library.", platform: "", status: "complete-locally", referenceType: "media", referenceLabel: "demo-media-1.mp4" },
  { category: "affiliate", action: "create", title: "Local campaign prepared", description: "Product Showcase Campaign was created locally.", platform: "TikTok", status: "complete-locally", referenceType: "campaign", referenceLabel: "Product Showcase Campaign" },
  { category: "scheduler", action: "create", title: "Schedule draft created", description: "Product Showcase Draft scheduled for 2026-07-22 10:00.", platform: "", status: "backend-required", referenceType: "schedule", referenceLabel: "Product Showcase Draft" },
  { category: "settings", action: "update", title: "Integration settings changed locally", description: "TikTok Client Key was updated in Settings.", platform: "TikTok", status: "information", referenceType: "settings", referenceLabel: "TikTok integration" },
  { category: "downloads", action: "request", title: "Download request prepared", description: "URL queued for local download preview. Backend required.", platform: "", status: "backend-required", referenceType: "download", referenceLabel: "https://example.com/video" },
  { category: "accounts", action: "draft", title: "Account reference created", description: "Demo TikTok account draft added locally.", platform: "TikTok", status: "complete-locally", referenceType: "account", referenceLabel: "Demo TikTok Account" },
  { category: "publishing", action: "prepare", title: "Publishing draft prepared", description: "Media and caption prepared for multi-platform publishing.", platform: "Instagram", status: "backend-required", referenceType: "publish", referenceLabel: "Local publish draft" },
  { category: "system", action: "info", title: "Application initialized", description: "Nexapa frontend shell loaded. No backend connected.", platform: "", status: "information", referenceType: "system", referenceLabel: "System" },
];
