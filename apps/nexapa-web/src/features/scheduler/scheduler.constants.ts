import type { DemoDestination, SchedulerPlatform, ScheduleStatus } from "./scheduler.types";

export const PLATFORMS: Array<{ id: SchedulerPlatform; label: string; short: string }> = [
  { id: "tiktok", label: "TikTok", short: "TT" },
  { id: "facebook", label: "Facebook", short: "FB" },
  { id: "instagram", label: "Instagram", short: "IG" },
  { id: "youtube", label: "YouTube", short: "YT" },
];

export const TIMEZONES: string[] = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Singapore",
];

export const DEFAULT_TIMEZONE_FALLBACK = "Asia/Jakarta";

export const STATUS_LABELS: Record<ScheduleStatus, string> = {
  "local-draft": "Local draft",
  "backend-required": "Backend required",
  "authorization-required": "Authorization required",
  "ready-locally": "Ready locally",
  paused: "Paused",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<ScheduleStatus, "neutral" | "blue" | "amber" | "green" | "red"> = {
  "local-draft": "neutral",
  "backend-required": "amber",
  "authorization-required": "amber",
  "ready-locally": "green",
  paused: "neutral",
  cancelled: "red",
};

export const VALIDATION_SEVERITY_TONE: Record<string, "red" | "amber" | "blue" | "green"> = {
  "action-required": "red",
  warning: "amber",
  "backend-required": "blue",
  "ready-locally": "green",
};

export const DEMO_DESTINATIONS: DemoDestination[] = [
  { id: "demo-dest-tt-1", label: "DEMO TikTok Channel A", identifier: "demo_tt_a", platform: "tiktok" },
  { id: "demo-dest-fb-1", label: "DEMO Facebook Page A", identifier: "demo_fb_a", platform: "facebook" },
  { id: "demo-dest-ig-1", label: "DEMO Instagram Account A", identifier: "demo_ig_a", platform: "instagram" },
  { id: "demo-dest-yt-1", label: "DEMO YouTube Channel A", identifier: "demo_yt_a", platform: "youtube" },
  { id: "demo-dest-tt-2", label: "DEMO TikTok Channel B", identifier: "demo_tt_b", platform: "tiktok" },
  { id: "demo-dest-fb-2", label: "DEMO Facebook Page B", identifier: "demo_fb_b", platform: "facebook" },
];

export const DEMO_TITLES: string[] = [
  "Product Showcase Draft",
  "Creator Video Draft",
  "Weekly Content Draft",
  "Campaign Teaser Draft",
  "Brand Story Draft",
  "Tutorial Preview Draft",
];

export const TITLE_MAX = 100;
export const CAPTION_ADVISORY_MAX = 2200;
export const NOTES_MAX = 300;

export const MAX_SCHEDULES = 100;

export const WEEKDAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAY_LABELS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAY_LABELS_NARROW = ["M", "T", "W", "T", "F", "S", "S"];

export const EMPTY_PRIMARY = {
  title: "No posts scheduled",
  description: "Choose a date or continue from Publisher to prepare your publishing calendar.",
};

export const EMPTY_FILTERED = {
  title: "No schedules match these filters",
  description: "Adjust the filters or clear the search to view other schedules.",
};

export const EMPTY_DAY = {
  title: "No posts planned for this day",
  description: "Create a schedule for the selected date.",
};

export const WEEK_HOURS: number[] = [];
for (let h = 6; h <= 23; h++) WEEK_HOURS.push(h);
