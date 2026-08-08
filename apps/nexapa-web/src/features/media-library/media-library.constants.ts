import type { MediaSource, MediaAssetStatus, MediaType } from "./media-library.types";

export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
};

export const MEDIA_SOURCE_LABEL: Record<MediaSource, string> = {
  "local-import": "Local Import",
  downloader: "Downloader",
};

export const MEDIA_SOURCE_TONE: Record<MediaSource, string> = {
  "local-import": "bg-slate-100 text-slate-600",
  downloader: "bg-blue-50 text-blue-600",
};

export const STATUS_LABEL: Record<MediaAssetStatus, string> = {
  "local-preview": "Local preview",
  "metadata-ready": "Metadata ready",
  "limited-metadata": "Limited metadata",
  "ready-to-publish": "Ready to Publish",
  archived: "Archived",
  uploading: "Uploading",
  processing: "Processing",
  available: "Available",
  failed: "Failed",
};

export const STATUS_TONE: Record<MediaAssetStatus, string> = {
  "local-preview": "bg-blue-50 text-blue-600 border-blue-200",
  "metadata-ready": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "limited-metadata": "bg-amber-50 text-amber-600 border-amber-200",
  "ready-to-publish": "bg-cyan-50 text-cyan-600 border-cyan-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  uploading: "bg-blue-50 text-blue-600 border-blue-200",
  processing: "bg-amber-50 text-amber-600 border-amber-200",
  available: "bg-emerald-50 text-emerald-600 border-emerald-200",
  failed: "bg-rose-50 text-rose-600 border-rose-200",
};

export const BUILTIN_COLLECTIONS = [
  { id: "__all__", key: "all", name: "All Media" },
  { id: "__ready__", key: "ready", name: "Ready to Publish" },
  { id: "__published__", key: "published", name: "Published" },
  { id: "__archive__", key: "archive", name: "Archive" },
] as const;

export type BuiltInCollectionKey = (typeof BUILTIN_COLLECTIONS)[number]["key"];

export const EMPTY_PRIMARY = {
  title: "Your media library is empty",
  description:
    "Upload media from your computer to prepare content for publishing.",
  facts: [
    "uploaded media is stored permanently",
    "media can be reused across connected platforms",
    "Downloader results are not added automatically",
  ],
};

export const EMPTY_FILTERED = {
  title: "No media matches these filters",
  description: "Adjust the search or filters to display other assets.",
};

export const EMPTY_COLLECTION: Record<string, { title: string; description: string }> = {
  ready: {
    title: "No media ready to publish",
    description: "Mark assets as Ready to Publish to see them here.",
  },
  published: {
    title: "No published media",
    description: "Published media will appear here after backend confirmation.",
  },
  archive: {
    title: "No archived media",
    description: "Archived media is hidden from primary workflows.",
  },
};
