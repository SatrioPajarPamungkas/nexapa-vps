import type { PublisherMediaKind } from "@/features/publisher/publisher.types";

export type SchedulerUploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "local" | "uploading" | "ready" | "failed";
  progress: number;
  mediaAssetId?: string;
  error?: string;
  caption?: string;
  thumbnailUrl?: string | null;
  contentUrl?: string | null;
};

export type FacebookPostType = "text" | "image" | "video";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

export function isImageFile(file: File): boolean {
  const hasValidMime = IMAGE_MIME_TYPES.includes(file.type);
  const hasValidExt = IMAGE_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
  return hasValidMime || hasValidExt;
}

export function isVideoFile(file: File): boolean {
  const hasValidMime = VIDEO_MIME_TYPES.includes(file.type);
  const hasValidExt = VIDEO_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
  return hasValidMime || hasValidExt;
}

export function validateImageFile(file: File): string | null {
  if (!isImageFile(file)) {
    return "Select a JPG, PNG, or WebP image.";
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (!isVideoFile(file)) {
    return "Select MP4, MOV, or WebM videos.";
  }
  return null;
}

export function validateVideoBatch(files: File[], maxCount: number): string | null {
  if (files.length > maxCount) {
    return "Maximum 50 videos per batch.";
  }
  for (const file of files) {
    const error = validateVideoFile(file);
    if (error) return error;
  }
  return null;
}

export function generateUploadItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getExpectedMediaKind(mode: "image-single" | "video-multiple"): PublisherMediaKind {
  if (mode === "image-single") return "image";
  return "video";
}
