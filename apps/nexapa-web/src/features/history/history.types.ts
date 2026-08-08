export type HistoryCategory = "downloads" | "media" | "accounts" | "publishing" | "scheduler" | "affiliate" | "settings" | "system";

export type HistoryStatus = "information" | "action-required" | "warning" | "complete-locally" | "backend-required" | "cancelled";

export type HistoryRecord = {
  id: string;
  category: HistoryCategory;
  action: string;
  title: string;
  description: string;
  platform: string;
  status: HistoryStatus;
  referenceType: string;
  referenceId: string;
  referenceLabel: string;
  timestamp: number;
  metadata: Record<string, string>;
  isDemo: boolean;
};

export type HistoryFilter = {
  search: string;
  category: HistoryCategory | "all";
  status: HistoryStatus | "all";
  dateRange: "all" | "today" | "last7" | "last30";
  platform: string;
};

export type HistorySort = "newest" | "oldest" | "category" | "status";

export type HistoryView = "timeline" | "list";
