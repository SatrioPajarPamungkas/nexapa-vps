import type { LucideIcon } from "lucide-react";

export type MetricCardData = {
  id: string;
  label: string;
  value: string;
  supporting: string;
  icon: LucideIcon;
  accent: "blue" | "cyan" | "blue-cyan";
};

export type ChartPeriod = "7d" | "30d" | "90d";

export type ActivitySeries = {
  label: string;
  color: string;
};

export type VolumeCategory = {
  label: string;
  value: number;
  color: string;
  depth: string;
};

export type AccountPlatform = {
  label: string;
  connected: boolean;
};

export type QuickAction = {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  accent: "blue" | "cyan";
};

export type ScheduleItem = {
  id: string;
  title: string;
  platform: string;
  time: string;
  status: "pending" | "draft";
};

export type ActivityEvent = {
  id: string;
  type: "download" | "media" | "publish" | "schedule" | "account";
  title: string;
  time: string;
};
