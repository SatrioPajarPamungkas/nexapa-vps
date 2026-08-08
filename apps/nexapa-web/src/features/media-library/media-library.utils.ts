import type { UnifiedMediaAsset, MediaType, MediaCollection, MediaOrigin } from "./media-library.types";
import { ALL_SUPPORTED_MIMES, MAX_COLLECTIONS, MAX_COLLECTION_NAME_LENGTH } from "./media-library.types";
import type { ApiMediaAsset } from "@/lib/api/response.types";

let idSeq = 0;
export function generateMediaId(): string {
  idSeq += 1;
  return `ml_${Date.now().toString(36)}_${idSeq.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

let collectionIdSeq = 0;
export function generateCollectionId(): string {
  collectionIdSeq += 1;
  return `col_${Date.now().toString(36)}_${collectionIdSeq.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getMediaTypeFromMime(mime: string): MediaType | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

export function getMediaTypeFromApi(apiType: string): MediaType {
  const lower = apiType.toLowerCase();
  if (lower === "image") return "image";
  if (lower === "video") return "video";
  if (lower === "audio") return "audio";
  return "video";
}

export function isSupportedMime(mime: string): boolean {
  return ALL_SUPPORTED_MIMES.includes(mime);
}

export function makeDuplicateKey(f: File): string {
  return `${f.name}::${f.size}::${f.type}::${f.lastModified}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "Unavailable";
  const s = Math.round(seconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function formatDimensions(w: number | null, h: number | null): string {
  if (w === null || h === null) return "Unavailable";
  return `${w} \u00d7 ${h}`;
}

export function formatLastModified(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export function formatAddedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type ImageMeta = { width: number; height: number };
type VideoMeta = { width: number | null; height: number | null; duration: number | null };
type AudioMeta = { duration: number | null };

export function extractImageMetadata(
  url: string,
  timeoutMs = 5000,
): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      img.src = "";
      reject(new Error("timeout"));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

export function extractVideoMetadata(
  url: string,
  timeoutMs = 7000,
): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      teardown();
      reject(new Error("timeout"));
    }, timeoutMs);

    const teardown = () => {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = "";
      video.load();
    };

    video.onloadedmetadata = () => {
      if (done) return;
      done = true;
      const meta: VideoMeta = {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
      };
      teardown();
      resolve(meta);
    };

    video.onerror = () => {
      if (done) return;
      done = true;
      teardown();
      reject(new Error("video metadata failed"));
    };

    video.src = url;
  });
}

export function extractAudioMetadata(
  url: string,
  timeoutMs = 5000,
): Promise<AudioMeta> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      teardown();
      reject(new Error("timeout"));
    }, timeoutMs);

    const teardown = () => {
      window.clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.src = "";
      audio.load();
    };

    audio.onloadedmetadata = () => {
      if (done) return;
      done = true;
      const meta: AudioMeta = {
        duration: Number.isFinite(audio.duration) ? audio.duration : null,
      };
      teardown();
      resolve(meta);
    };

    audio.onerror = () => {
      if (done) return;
      done = true;
      teardown();
      reject(new Error("audio metadata failed"));
    };

    audio.src = url;
  });
}

export function mapApiMediaAssetToUnified(api: ApiMediaAsset): UnifiedMediaAsset {
  const mediaType = getMediaTypeFromApi(api.media_type);
  const createdAtMs = new Date(api.created_at).getTime();

  let status: UnifiedMediaAsset["status"] = "limited-metadata";
  if (api.status === "available") {
    status = "available";
  } else if (api.status === "archived") {
    status = "archived";
  } else if (api.status === "pending") {
    status = "processing";
  }

  return {
    key: `api-${api.id}`,
    origin: "api" as MediaOrigin,
    apiId: api.id,
    file: null,
    originalName: api.original_name,
    displayName: api.display_name,
    mediaType,
    mimeType: api.mime_type,
    size: api.size_bytes,
    width: api.width,
    height: api.height,
    duration: api.duration_seconds,
    previewUrl: api.content_url ?? "",
    downloadUrl: api.download_url,
    thumbnailUrl: api.thumbnail_url,
    sourcePlatform: api.source_platform,
    sourceUrl: api.source_url,
    createdAt: api.created_at,
    createdAtMs,
    status,
    collectionIds: [],
    tags: [],
    isInUse: api.is_in_use ?? (api.usage_count ?? 0) > 0,
    usageCount: api.usage_count ?? 0,
    selected: false,
    archived: api.status === "archived",
    isDemo: false,
  };
}

export function sortAssets(
  assets: UnifiedMediaAsset[],
  sort: string,
): UnifiedMediaAsset[] {
  const copy = [...assets];
  switch (sort) {
    case "recent":
      return copy.sort((a, b) => b.createdAtMs - a.createdAtMs);
    case "oldest":
      return copy.sort((a, b) => a.createdAtMs - b.createdAtMs);
    case "name-asc":
      return copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case "name-desc":
      return copy.sort((a, b) => b.displayName.localeCompare(a.displayName));
    case "largest":
      return copy.sort((a, b) => b.size - a.size);
    case "smallest":
      return copy.sort((a, b) => a.size - b.size);
    case "longest":
      return copy.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
    case "shortest":
      return copy.sort((a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity));
    default:
      return copy;
  }
}

export function filterAssets(
  assets: UnifiedMediaAsset[],
  search: string,
  type: string,
  status: string,
  collectionId?: string,
  showArchived?: boolean,
): UnifiedMediaAsset[] {
  const term = search.trim().toLowerCase();
  return assets.filter((a) => {
    // Special handling for archive collection - only show archived assets
    if (collectionId === "__archive__") {
      if (!a.archived) return false;
    } else {
      // For all other views, hide archived assets by default
      if (!showArchived && a.archived) return false;
    }
    
    if (type !== "all" && a.mediaType !== type) return false;
    if (status !== "all" && a.status !== status) return false;
    if (collectionId && collectionId !== "__archive__" && !a.collectionIds.includes(collectionId)) return false;
    if (term) {
      const hay = `${a.displayName} ${a.originalName} ${a.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

export function buildMetadataCopy(asset: UnifiedMediaAsset): string {
  const lines = [
    `Filename: ${asset.originalName}`,
    `Type: ${asset.mediaType === "image" ? "Image" : asset.mediaType === "video" ? "Video" : "Audio"}`,
    `Size: ${formatFileSize(asset.size)}`,
  ];
  if (asset.mediaType !== "audio") {
    lines.push(`Dimensions: ${formatDimensions(asset.width, asset.height)}`);
  }
  if (asset.duration !== null) {
    lines.push(`Duration: ${formatDuration(asset.duration)}`);
  }
  if (asset.sourcePlatform) {
    lines.push(`Platform: ${asset.sourcePlatform}`);
  }
  if (asset.tags.length > 0) {
    lines.push(`Tags: ${asset.tags.join(", ")}`);
  }
  return lines.join("\n");
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function isValidCollectionName(name: string, existing: MediaCollection[], excludeId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Collection name is required";
  if (trimmed.length > MAX_COLLECTION_NAME_LENGTH) return `Maximum ${MAX_COLLECTION_NAME_LENGTH} characters`;
  const lower = trimmed.toLowerCase();
  const duplicate = existing.find((c) => c.name.toLowerCase() === lower && c.id !== excludeId);
  if (duplicate) return "A collection with this name already exists";
  return null;
}

export function canCreateCollection(existing: MediaCollection[]): string | null {
  if (existing.length >= MAX_COLLECTIONS) return `Maximum ${MAX_COLLECTIONS} collections reached`;
  return null;
}
