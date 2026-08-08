export type SchedulerPlatform = "tiktok" | "facebook" | "instagram" | "youtube" | "shopee";

export type PublisherPostStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "uploading"
  | "processing"
  | "publishing"
  | "completed"
  | "published"
  | "failed"
  | "cancelled";

export type PublisherPostAction = "draft" | "publish_now" | "schedule";

export type ScheduleSource = "publisher" | "manual";

export type ScheduleStatus =
  | "local-draft"
  | "backend-required"
  | "authorization-required"
  | "ready-locally"
  | "paused"
  | "cancelled";

export type ConnectedAccount = {
  id: string;
  user_id: string;
  platform: SchedulerPlatform;
  display_name: string;
  name?: string;
  identifier?: string;
  username?: string | null;
  avatar_url?: string | null;
  status: "connected" | "disconnected" | "error";
  account_type?: string;
  is_publishable?: boolean;
  is_default?: boolean;
};

export type MediaAsset = {
  id: string;
  media_type: "image" | "video";
  storage_path: string;
  display_name?: string;
  original_name?: string;
  original_filename?: string;
  status: "ready" | "available" | "archived" | "processing" | "failed";
  thumbnail_url?: string | null;
  content_url?: string | null;
};

export type PublisherPost = {
  id: string;
  user_id: string;
  connected_account_id: string;
  media_asset_id: string | null;
  platform: SchedulerPlatform;
  caption: string | null;
  action: PublisherPostAction;
  provider_mode: string | null;
  status: PublisherPostStatus;
  scheduled_at: string | null;
  timezone?: string | null;
  provider_publish_id: string | null;
  provider_status: string | null;
  failure_code: string | null;
  failure_message: string | null;
  published_at: string | null;
  failed_at?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  connected_account?: ConnectedAccount;
  media_asset?: MediaAsset;
};

export type SchedulerStatus = {
  scheduler: "ready" | "stale";
  last_run_at: string | null;
  queue_connection: string;
};

export type ScheduleFilter = {
  search: string;
  platform: "all" | SchedulerPlatform;
  status: "all" | ScheduleStatus;
  dateRange: "all" | "today" | "next7" | "next30";
  destinationId: string;
};

export type ScheduleSort = "earliest" | "latest" | "recent-created" | "recent-updated" | "title-asc";

export type ScheduleView = "month" | "week" | "agenda";

export type ScheduleFormValues = {
  title: string;
  caption: string;
  mediaName: string;
  platforms: SchedulerPlatform[];
  destinationIds: string[];
  date: string;
  time: string;
  timezone: string;
  notes: string;
  source: ScheduleSource | "demo";
  connected_account_id?: string;
  media_asset_id?: string | null;
  post_type?: "text" | "image" | "video";
  scheduled_at?: string;
  platform_settings?: Record<string, unknown>;
};

export type ScheduleFormErrors = Partial<Record<keyof ScheduleFormValues, string>> & {
  global?: string;
  scheduled_at?: string;
};

export type ScheduleDestinationDraft = {
  id: string;
  label: string;
  identifier: string;
  platform: SchedulerPlatform;
  isDemo: boolean;
};

export type DemoDestination = Omit<ScheduleDestinationDraft, "isDemo">;

export type ValidationItem = {
  id: string;
  label: string;
  severity: "action-required" | "warning" | "backend-required" | "ready-locally";
  message: string;
};

export type ConflictDetail = {
  destinationId: string;
  destinationLabel: string;
  conflictWithId: string;
  conflictWithTitle: string;
};

export type LocalSchedule = {
  id: string;
  title: string;
  caption: string;
  mediaName: string | null;
  mediaType: "none" | "image" | "video";
  destinationIds: string[];
  destinations: ScheduleDestinationDraft[];
  platforms: SchedulerPlatform[];
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  status: ScheduleStatus;
  source: ScheduleSource | "demo";
  createdAt: number;
  createdAtIso: string;
  updatedAt: number;
  updatedAtIso: string;
  notes: string;
  isDemo: boolean;
};

export type GroupedSchedules = {
  key: string;
  label: string;
  items: LocalSchedule[];
};
