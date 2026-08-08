import type {
  DownloadPlatform,
  SourceType,
  DownloadJobStatus,
} from "./downloader.types";
import { JOB_STATUS_LABEL } from "./downloader.constants";

function hostIncludes(host: string, needle: string): boolean {
  return host.includes(needle);
}

export function detectPlatformFromUrl(input: string): DownloadPlatform {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "generic";
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostIncludes(hostname, "tiktok.com") ||
    hostIncludes(hostname, "vm.tiktok.com") ||
    hostIncludes(hostname, "vt.tiktok.com")
  ) return "tiktok";
  if (
    hostIncludes(hostname, "facebook.com") ||
    hostIncludes(hostname, "fb.watch") ||
    hostIncludes(hostname, "m.facebook.com")
  ) return "facebook";
  if (hostIncludes(hostname, "instagram.com")) return "instagram";
  if (
    hostIncludes(hostname, "youtube.com") ||
    hostIncludes(hostname, "youtu.be") ||
    hostIncludes(hostname, "m.youtube.com")
  ) return "youtube";
  return "generic";
}

export function detectSourceType(input: string, platform: DownloadPlatform): SourceType {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "unknown";
  }
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();

  if (platform === "youtube") {
    if (url.hostname.includes("youtu.be")) return "video";
    if (search.includes("list=") && path.includes("/playlist")) return "playlist";
    if (search.includes("list=")) {
      if (search.includes("v=")) return "video";
      return "playlist";
    }
    if (search.includes("v=") || path.includes("/shorts/") || path.includes("/embed/")) return "video";
    if (path.startsWith("/@") || path.includes("/channel/") || path.includes("/c/") || path.includes("/user/")) return "channel";
    return "unknown";
  }

  if (platform === "tiktok") {
    if (path.includes("/video/")) return "video";
    if (path.match(/^\/@[^/]+\/?$/)) return "profile";
    if (path.match(/^\/@[^/]+\/video\//)) return "video";
    if (path === "/" || path.trim() === "") return "profile";
    return "unknown";
  }

  if (platform === "instagram") {
    if (path.includes("/reel/") || path.includes("/reels/")) return "post";
    if (path.includes("/p/")) return "post";
    if (path.includes("/tv/")) return "video";
    if (/^\/[^/]+\/?$/.test(path) && !path.includes("/explore")) return "profile";
    return "unknown";
  }

  if (platform === "facebook") {
    if (path.includes("/watch") || path.includes("/videos/") || path.includes("/reel/") || url.hostname.includes("fb.watch")) return "video";
    if (path.includes("/posts/") || path.includes("/photos/")) return "post";
    if (/^\/[^/]+\/?$/.test(path) || path.includes("/profile.php") || path.includes("/pages/")) return "profile";
    return "unknown";
  }

  // generic
  if (search.includes("playlist") || path.includes("playlist")) return "playlist";
  if (path.includes("/channel") || path.includes("/creator") || path.includes("/user")) return "profile";
  if (path.length > 1) return "unknown";
  return "unknown";
}

export type ValidationResult =
  | { valid: true; normalizedUrl: string }
  | { valid: false; reason: string };

export function normalizeAndValidateUrl(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false, reason: "Empty value" };
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { valid: false, reason: "URL must start with http:// or https://" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: "Malformed URL" };
  }
  parsed.hash = "";
  const normalized = parsed.toString();
  return { valid: true, normalizedUrl: normalized };
}

export function shortenUrl(url: string, maxLen = 64): string {
  if (url.length <= maxLen) return url;
  return `${url.slice(0, 36)}…${url.slice(-24)}`;
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) return u.hostname;
    const parts = path.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    return decodeURIComponent(last).slice(0, 80) || u.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

export function isProfileLikeUrl(input: string, platform: DownloadPlatform, sourceType: SourceType): boolean {
  if (sourceType === "profile" || sourceType === "channel" || sourceType === "playlist" || sourceType === "collection") return true;
  if (platform === "youtube" && (input.includes("/@") || input.includes("/channel/") || input.includes("playlist?list="))) return true;
  if (platform === "tiktok" && input.match(/tiktok\.com\/@[^/]+\/?$/i)) return true;
  if (platform === "instagram" && input.match(/instagram\.com\/[^/]+\/?$/i)) return true;
  if (platform === "facebook" && (input.match(/facebook\.com\/[^/]+\/?$/i) || input.includes("/pages/"))) return true;
  return false;
}

export function getJobStatusLabel(status: DownloadJobStatus | string): string {
  return JOB_STATUS_LABEL[status] ?? status;
}

export function isJobActive(status: DownloadJobStatus | string): boolean {
  return ["queued", "analyzing", "ready", "claimed", "processing"].includes(status);
}

export function isJobTerminal(status: DownloadJobStatus | string): boolean {
  return ["completed", "partially_completed", "failed", "cancelled"].includes(status);
}

export function isJobAwaitingSelection(status: DownloadJobStatus | string): boolean {
  return status === "awaiting_selection";
}

export function canCancelDownloadJob(status: DownloadJobStatus | string): boolean {
  return ["queued", "analyzing", "awaiting_selection", "ready", "claimed"].includes(status);
}

export function canRetryDownloadJob(status: DownloadJobStatus | string): boolean {
  return ["failed", "partially_completed"].includes(status);
}

export function canDeleteDownloadJob(status: DownloadJobStatus | string): boolean {
  return ["queued", "awaiting_selection", "ready", "completed", "partially_completed", "failed", "cancelled"].includes(status);
}

export function isDemoId(id: string): boolean {
  return id.startsWith("demo-") || id.startsWith("local-");
}

export function formatProgress(progress: number | null, stage: string | null): string {
  if (progress === null && !stage) return "";
  if (progress !== null && stage) return `${stage} ${progress}%`;
  if (progress !== null) return `${progress}%`;
  return stage ?? "";
}

export function getProgressWidth(progress: number | null): number {
  if (progress === null) return 0;
  return Math.max(0, Math.min(100, progress));
}

export function createDemoProfileResults(count = 8) {
  const titles = [
    "Demo Media Clip 01",
    "Demo Product Showcase 02",
    "Demo Tutorial Segment 03",
    "Demo Event Highlight 04",
    "Demo Behind The Scenes 05",
    "Demo Creative Edit 06",
    "Demo Campaign Preview 07",
    "Demo Lifestyle Moment 08",
  ];

  return Array.from({ length: count }).map((_, idx) => ({
    id: `demo-${idx}`,
    jobId: "demo-job",
    title: `${titles[idx % titles.length]} — DEMO`,
    platform: "generic" as DownloadPlatform,
    sourceType: idx % 3 === 0 ? "video" : idx % 3 === 1 ? "post" : "unknown",
    originalUrl: null,
    thumbnailUrl: null,
    mediaType: idx % 2 === 0 ? "video" : "image",
    durationSeconds: idx % 2 === 0 ? 18 + idx : null,
    publishedAt: new Date(Date.now() - idx * 86400000).toISOString(),
    selected: false,
    isDemo: true,
  }));
}
