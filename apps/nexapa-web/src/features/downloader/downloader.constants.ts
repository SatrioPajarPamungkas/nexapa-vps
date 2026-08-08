export const MAX_QUEUE = 50;

export const DEMO_LABEL = "DEMO";

export const POLL_INTERVAL_MS = 2000;

export const JOB_STATUS_LABEL: Record<string, string> = {
  queued: "Waiting in queue",
  analyzing: "Analyzing source",
  awaiting_selection: "Select media",
  ready: "Ready for worker",
  claimed: "Worker assigned",
  processing: "Processing",
  completed: "Completed",
  partially_completed: "Partially completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const CONNECTION_LABEL: Record<string, string> = {
  connecting: "Connecting",
  connected: "API Connected",
  unreachable: "API Unreachable",
  auth_required: "Authentication Required",
};

export const CONNECTION_TONE: Record<string, string> = {
  connecting: "amber",
  connected: "green",
  unreachable: "red",
  auth_required: "amber",
};

export const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  generic: "Generic Web",
};
