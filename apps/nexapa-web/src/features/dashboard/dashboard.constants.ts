import {
  Download,
  Image,
  Link2,
  Send,
  CalendarClock,
  Import,
} from "lucide-react";
import type {
  MetricCardData,
  QuickAction,
  AccountPlatform,
  VolumeCategory,
} from "./dashboard.types";

export const DASHBOARD_METRICS: MetricCardData[] = [
  {
    id: "downloads",
    label: "Total Downloads",
    value: "0",
    supporting: "No downloads yet",
    icon: Download,
    accent: "blue",
  },
  {
    id: "media",
    label: "Media Assets",
    value: "0",
    supporting: "No media uploaded",
    icon: Image,
    accent: "cyan",
  },
  {
    id: "accounts",
    label: "Connected Accounts",
    value: "0",
    supporting: "Not connected",
    icon: Link2,
    accent: "blue-cyan",
  },
  {
    id: "published",
    label: "Published Posts",
    value: "0",
    supporting: "No posts published",
    icon: Send,
    accent: "blue",
  },
  {
    id: "scheduled",
    label: "Scheduled Posts",
    value: "0",
    supporting: "No schedules set",
    icon: CalendarClock,
    accent: "cyan",
  },
];

export const DASHBOARD_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Download Media",
    description: "Prepare media URLs",
    icon: Download,
    href: "/downloader",
    accent: "blue",
  },
  {
    label: "Import Media",
    description: "Review local assets",
    icon: Import,
    href: "/library",
    accent: "cyan",
  },
  {
    label: "Create Post",
    description: "Compose and publish",
    icon: Send,
    href: "/publisher",
    accent: "blue",
  },
  {
    label: "Create Schedule",
    description: "Plan publishing times",
    icon: CalendarClock,
    href: "/scheduler",
    accent: "cyan",
  },
  {
    label: "Connect Account",
    description: "Manage destinations",
    icon: Link2,
    href: "/accounts",
    accent: "blue",
  },
];

export const ACCOUNT_PLATFORMS: AccountPlatform[] = [
  { label: "TikTok", connected: false },
  { label: "Facebook", connected: false },
  { label: "Instagram", connected: false },
  { label: "YouTube", connected: false },
  { label: "Shopee", connected: false },
];

export const VOLUME_CATEGORIES: VolumeCategory[] = [
  { label: "Download", value: 0, color: "#3b82f6", depth: "#2563eb" },
  { label: "Media", value: 0, color: "#06b6d4", depth: "#0891b2" },
  { label: "Publish", value: 0, color: "#3b82f6", depth: "#2563eb" },
  { label: "Schedule", value: 0, color: "#06b6d4", depth: "#0891b2" },
];

export const CHART_SERIES_COLORS = [
  { label: "Downloads", color: "#3b82f6" },
  { label: "Uploads", color: "#06b6d4" },
  { label: "Published", color: "#2563eb" },
  { label: "Scheduled", color: "#22d3ee" },
];

export const PERIOD_LABELS: Record<string, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export const DASHBOARD_EMPTY_SCHEDULE = {
  title: "No upcoming schedules",
  description: "Create a schedule to organize future publishing times.",
  actionLabel: "Open Scheduler",
  actionHref: "/scheduler",
};

export const DASHBOARD_EMPTY_ACTIVITY = {
  title: "No recent activity",
  description: "Downloads, media imports, publishing attempts, and schedule changes will appear here.",
  actionLabel: "Open History",
  actionHref: "/history",
};
