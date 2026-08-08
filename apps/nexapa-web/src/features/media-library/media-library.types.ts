export type MediaType = "image" | "video" | "audio";

export type MediaSource = "local-import" | "downloader";

export type MediaAssetStatus =
  | "local-preview"
  | "metadata-ready"
  | "limited-metadata"
  | "ready-to-publish"
  | "archived"
  | "uploading"
  | "processing"
  | "available"
  | "failed";

export type MediaViewMode = "grid" | "list";

export type MediaSort =
  | "recent"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "largest"
  | "smallest"
  | "longest"
  | "shortest";

export type MediaFilter = {
  search: string;
  type: "all" | MediaType;
  status: "all" | MediaAssetStatus;
};

export type MediaCollection = {
  id: string;
  name: string;
  createdAt: number;
  createdAtIso: string;
  sourceType?: string;
  downloadJobId?: string;
  profileUrl?: string;
  sourcePlatform?: string;
  mediaCount?: number;
};

export type MediaOrigin = "local" | "api";

export type UnifiedMediaAsset = {
  key: string;
  origin: MediaOrigin;
  apiId: string | null;
  file: File | null;
  originalName: string;
  displayName: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  previewUrl: string;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
  sourcePlatform: string | null;
  sourceUrl: string | null;
  createdAt: string;
  createdAtMs: number;
  status: MediaAssetStatus;
  collectionIds: string[];
  tags: string[];
  isInUse: boolean;
  usageCount: number;
  selected: boolean;
  archived: boolean;
  isDemo: boolean;
};

export type ImportResult = {
  added: UnifiedMediaAsset[];
  unsupported: Array<{ name: string; reason: string }>;
  zeroByte: string[];
  duplicates: string[];
  overLimit: number;
};

export const MAX_ASSETS = 100;

export const MAX_COLLECTIONS = 30;

export const MAX_COLLECTION_NAME_LENGTH = 60;

export const MAX_TAGS_PER_ASSET = 20;

export const MAX_TAG_LENGTH = 40;

export const SUPPORTED_MIMES = {
  images: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  videos: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/ogg", "audio/webm"],
} as const;

export const ALL_SUPPORTED_MIMES: string[] = [
  ...SUPPORTED_MIMES.images,
  ...SUPPORTED_MIMES.videos,
  ...SUPPORTED_MIMES.audio,
];
