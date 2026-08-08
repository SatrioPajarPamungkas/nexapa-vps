export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiPaginatedEnvelope<T> = {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

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

export type DownloadMode = "single" | "multiple" | "profile";

export type DownloadPlatform = "tiktok" | "facebook" | "instagram" | "youtube" | "generic";

export type SourceType = "video" | "post" | "profile" | "channel" | "playlist" | "collection" | "unknown";

export type OutputFormat = "original" | "mp4" | "audio";

export type DownloadQuality = "best" | "1080p" | "720p" | "480p";

export type DownloadResultStatus = "discovered" | "selected" | "queued" | "processed" | "failed" | "skipped";

export type MediaAssetStatus = "pending" | "available" | "unavailable" | "archived";

export type ApiDownloadJob = {
  id: string;
  user_id: string | null;
  mode: DownloadMode;
  original_input: string;
  normalized_url: string;
  platform: DownloadPlatform;
  source_type: SourceType;
  output_format: OutputFormat;
  quality: DownloadQuality;
  filename_mode: string;
  delay_seconds: number;
  status: DownloadJobStatus;
  progress: number | null;
  current_stage: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  batch_id?: string | null;
  updated_at: string;
  results_count?: number;
  media_assets_count?: number;
  has_downloadable_file?: boolean;
  parent_download_job_id?: string | null;
  download_result_id?: string | null;
};

export type ApiDownloadJobDetail = {
  id: string;
  mode: DownloadMode;
  original_input: string;
  normalized_url: string;
  platform: DownloadPlatform;
  source_type: SourceType;
  output_format: OutputFormat;
  quality: DownloadQuality;
  filename_mode: string;
  delay_seconds: number;
  status: DownloadJobStatus;
  progress: number | null;
  current_stage: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  batch_id?: string | null;
  discovered_results_count: number | null;
  selected_results_count: number | null;
  available_media_assets_count: number | null;
  results: ApiDownloadResult[];
  media_assets: ApiMediaAsset[];
};

export type ApiDownloadResult = {
  id: string;
  download_job_id: string;
  external_id: string | null;
  title: string;
  source_url: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  selected: boolean;
  status: DownloadResultStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  batch_id?: string | null;
  updated_at: string;
  // Authoritative fields for determining if result has child or is queued
  child_job_id: string | null;
  is_queued: boolean;
};

export type ApiMediaAsset = {
  id: string;
  download_job_id: string | null;
  display_name: string;
  original_name: string;
  media_type: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  source_platform: string | null;
  source_url: string | null;
  status: MediaAssetStatus;
  created_at: string;
  batch_id?: string | null;
  content_url: string | null;
  download_url: string | null;
  thumbnail_url: string | null;
  is_in_use: boolean;
  usage_count: number | null;
  active_usage_count: number | null;
};

export type CreateJobRequest = {
  mode: DownloadMode;
  urls: string[];
  output_format?: OutputFormat;
  quality?: DownloadQuality;
  filename_mode?: string;
  delay_seconds?: number;
  max_retries?: number;
};

export type CreateJobResponseData = {
  accepted: ApiDownloadJob[];
  rejected: Array<{
    index: number;
    url: string;
    reason: string;
  }>;
  duplicates: Array<{
    index: number;
    url: string;
    reason: string;
  }>;
  counts: {
    total: number;
    accepted: number;
    rejected: number;
    duplicates: number;
  };
};

export type DownloadBatchStatus = {
  batch_id: string;
  total: number;
  queued: number;
  claimed: number;
  processing: number;
  completed: number;
  skipped: number;
  failed: number;
  cancelled: number;
  active: number;
  terminal: number;
  processed: number;
  remaining: number;
  progress: number;
  downloadable_files_count: number;
  has_downloadable_files: boolean;
  is_terminal: boolean;
  can_download_zip: boolean;
};

export type SelectResultsRequest = {
  result_ids?: string[];
  select_all?: boolean;
};

export type ApiCollection = {
  id: string;
  name: string;
  source_type: string | null;
  download_job_id: string | null;
  profile_url: string | null;
  source_platform: string | null;
  media_count: number;
  created_at: string;
  updated_at: string;
};
