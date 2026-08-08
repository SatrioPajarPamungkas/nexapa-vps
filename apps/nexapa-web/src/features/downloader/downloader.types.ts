export type DownloadPlatform = "tiktok" | "facebook" | "instagram" | "youtube" | "generic";

export type SourceType = "video" | "post" | "profile" | "channel" | "playlist" | "collection" | "unknown";

export type OutputFormat = "original" | "mp4" | "audio";

export type DownloadQuality = "best" | "1080p" | "720p" | "480p";

export type FilenameMode = "original" | "platform_date" | "safe_generated";

export type DownloadMode = "single" | "multiple" | "profile";

export type DownloadJobStatus =
  | "queued"
  | "analyzing"
  | "awaiting_selection"
  | "ready"
  | "claimed"
  | "processing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";

export const ACTIVE_JOB_STATUSES: DownloadJobStatus[] = [
  "queued",
  "analyzing",
  "ready",
  "claimed",
  "processing",
];

export const TERMINAL_JOB_STATUSES: DownloadJobStatus[] = [
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
];

export type QueueDelay = 0 | 2 | 5 | 10 | 15;

export type DownloaderSettings = {
  outputFormat: OutputFormat;
  quality: DownloadQuality;
  filenameMode: FilenameMode;
  delaySeconds: QueueDelay;
};

export const DEFAULT_SETTINGS: DownloaderSettings = {
  outputFormat: "original",
  quality: "best",
  filenameMode: "original",
  delaySeconds: 0,
};

export type DownloadQueueItem = {
  batch_id?: string | null;
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  platform: DownloadPlatform;
  sourceType: SourceType;
  sourceOrigin: SourceOrigin;
  title: string;
  thumbnailUrl: string | null;
  outputFormat: OutputFormat;
  quality: DownloadQuality;
  filenameMode: FilenameMode;
  delaySeconds: QueueDelay;
  status: DownloadJobStatus;
  progress: number | null;
  currentStage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  createdAtMs: number;
  startedAt: string | null;
  completedAt: string | null;
  selected: boolean;
  isDemo: boolean;
  resultsCount: number;
  mediaAssetsCount: number;
  has_downloadable_file?: boolean;
  // Authoritative backend fields for filtering
  mode: DownloadMode;
  parent_download_job_id: string | null;
  download_result_id: string | null;
};

export type SourceOrigin =
  | "direct-url"
  | "batch-url"
  | "profile-result"
  | "profile-analysis"
  | "demo-result";

export type ProfileBatchMetadata = {
  batchId: string;
  sourceUrl: string;
  sourceName: string;
  platform: string;
  createdAt: number;
  results: Array<{
    resultId: string;
    title: string;
    originalUrl: string;
    thumbnailUrl: string | null;
  }>;
};

export type ProfileResultItem = {
  id: string;
  jobId: string;
  title: string;
  platform: DownloadPlatform;
  sourceType: string;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  selected: boolean;
  isDemo: boolean;
  // Authoritative backend fields
  childJobId?: string | null;
  isQueued?: boolean;
};

export type ProfileWorkspaceState =
  | "idle"
  | "analyzing"
  | "awaiting_selection"
  | "results"
  | "empty"
  | "error"
  | "ready";

export type AddUrlResult = {
  added: DownloadQueueItem[];
  invalidLines: Array<{ lineNumber: number; value: string; reason: string }>;
  duplicateLines: Array<{ lineNumber: number; value: string }>;
  duplicatesInQueue: string[];
  overLimitSkipped: number;
  apiResult?: {
    accepted: number;
    rejected: number;
    duplicates: number;
  };
};

export type InputMode = "single" | "multiple" | "profile";

export type QueueFilter = {
  search: string;
  platform: "all" | DownloadPlatform;
  source: "all" | SourceType;
};

export type QueueSort =
  | "recent"
  | "platform"
  | "title-asc"
  | "title-desc";

export type ProfileResultFilter = {
  search: string;
  mediaType: "all" | "video" | "post" | "other";
};

export type ProfileResultSort = "newest" | "oldest";

export type ViewMode = "grid" | "list";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "unreachable"
  | "auth_required";
