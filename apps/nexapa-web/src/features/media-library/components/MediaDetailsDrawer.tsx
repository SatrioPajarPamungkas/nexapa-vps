import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2, Copy, Image as ImageIcon, Video, Music, FolderPlus, Download, Send, Archive, RotateCcw, Plus, Tag } from "lucide-react";
import type { UnifiedMediaAsset, MediaCollection } from "../media-library.types";
import { formatFileSize, formatDimensions, formatDuration } from "../media-library.utils";
import { STATUS_LABEL } from "../media-library.constants";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/cn";
import { MAX_TAGS_PER_ASSET, MAX_TAG_LENGTH } from "../media-library.types";
import { normalizeTag } from "../media-library.utils";

type Props = {
  asset: UnifiedMediaAsset | null;
  open: boolean;
  onClose: () => void;
  onRemove: (key: string) => void;
  onUpdateDisplayName: (key: string, name: string) => boolean;
  onCopy: (text: string) => Promise<boolean>;
  onAddTag: (assetKey: string, tag: string) => boolean;
  onRemoveTag: (assetKey: string, tag: string) => void;
  collections: MediaCollection[];
  onMoveToCollection: (assetKey: string, collectionId: string) => void;
  onRemoveFromCollection: (assetKey: string, collectionId: string) => void;
  onArchive: (key: string) => void;
  onRestore: (key: string) => void;
  onSetReadyToPublish: (key: string) => void;
};

function AudioWaveformPlaceholder() {
  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" fill="none" className="text-white/20" aria-hidden="true">
      {Array.from({ length: 40 }).map((_, i) => {
        const h = 8 + Math.sin(i * 0.7) * 16 + Math.cos(i * 1.3) * 8;
        return (
          <rect
            key={i}
            x={i * 5}
            y={24 - h / 2}
            width={3}
            height={h}
            rx={1.5}
            fill="currentColor"
            opacity={0.5 + Math.sin(i * 0.5) * 0.3}
          />
        );
      })}
    </svg>
  );
}

export function MediaDetailsDrawer({
  asset,
  open,
  onClose,
  onRemove,
  onUpdateDisplayName,
  onCopy,
  onAddTag,
  onRemoveTag,
  collections,
  onMoveToCollection,
  onRemoveFromCollection,
  onArchive,
  onRestore,
  onSetReadyToPublish,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editError, setEditError] = useState<string>("");
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [initializedKey, setInitializedKey] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState("");
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);

  const isNewAsset = asset && asset.key !== initializedKey;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const timeout = window.setTimeout(() => {
      const focusable = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  const handleSaveName = useCallback(() => {
    if (!asset) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Display name cannot be empty");
      return;
    }
    if (trimmed.length > 120) {
      setEditError("Maximum 120 characters");
      return;
    }
    const ok = onUpdateDisplayName(asset.key, trimmed);
    if (ok) {
      setEditError("");
    } else {
      setEditError("Invalid name");
    }
  }, [asset, editName, onUpdateDisplayName]);

  function handleAddTag() {
    if (!asset) return;
    setTagError("");
    const normalized = normalizeTag(newTag);
    if (!normalized) {
      setTagError("Tag cannot be empty");
      return;
    }
    if (normalized.length > MAX_TAG_LENGTH) {
      setTagError(`Maximum ${MAX_TAG_LENGTH} characters`);
      return;
    }
    if (asset.tags.length >= MAX_TAGS_PER_ASSET) {
      setTagError(`Maximum ${MAX_TAGS_PER_ASSET} tags per asset`);
      return;
    }
    const ok = onAddTag(asset.key, normalized);
    if (!ok) {
      setTagError("Tag already exists");
      return;
    }
    setNewTag("");
  }

  if (!open || !asset) return null;

  const derivedEditName = isNewAsset ? asset.displayName : editName;
  if (isNewAsset && initializedKey !== asset.key) {
    queueMicrotask(() => {
      setEditName(asset.displayName);
      setInitializedKey(asset.key);
      setPreviewError(false);
      setEditError("");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-drawer-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="drawer-slide-in relative flex h-full w-full max-w-[520px] flex-col border-l border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-2xl shadow-[0_25px_80px_rgba(2,6,23,0.40)] sm:max-w-[520px]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="media-drawer-title"
              className="truncate text-[15px] font-semibold text-white"
            >
              {asset.displayName}
            </h2>
            <p className="text-[11px] text-white/50">
              {asset.origin === "api" ? "Uploaded to Nexapa" : "Local preview"} {"\u2022"} {asset.origin === "api" ? "Persistent" : "Session only"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={drawerRef} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {/* Preview */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
              {!previewError ? (
                asset.mediaType === "image" ? (
                  <img
                    src={asset.thumbnailUrl ?? asset.previewUrl}
                    alt={asset.displayName}
                    className="max-h-[320px] w-full object-contain"
                    onError={() => setPreviewError(true)}
                  />
                ) : asset.mediaType === "video" ? (
                  <video
                    src={asset.previewUrl}
                    controls
                    muted
                    preload="metadata"
                    playsInline
                    className="max-h-[320px] w-full object-contain bg-black/30"
                    onError={() => setPreviewError(true)}
                    aria-label={`${asset.displayName} video preview`}
                  />
                ) : (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                        <Music className="h-6 w-6 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">{asset.displayName}</p>
                        <p className="text-[11px] text-white/50">{formatFileSize(asset.size)} {"\u2022"} {asset.mimeType}</p>
                      </div>
                    </div>
                    <AudioWaveformPlaceholder />
                    <audio
                      src={asset.previewUrl}
                      controls
                      className="mt-3 w-full"
                      aria-label={`${asset.displayName} audio preview`}
                    />
                  </div>
                )
              ) : (
                <div className="flex h-[180px] items-center justify-center text-white/30">
                  {asset.mediaType === "image" ? (
                    <ImageIcon className="h-10 w-10" />
                  ) : asset.mediaType === "video" ? (
                    <Video className="h-10 w-10" />
                  ) : (
                    <Music className="h-10 w-10" />
                  )}
                </div>
              )}
            </div>

            {/* Display name */}
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <label htmlFor="drawer-display-name" className="block text-[12px] font-medium text-white/70">
                Display name
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="drawer-display-name"
                  value={derivedEditName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (initializedKey !== asset.key) setInitializedKey(asset.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                  }}
                  className="h-9 min-h-[36px] flex-1 rounded-lg border border-white/15 bg-white/10 px-3 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/20"
                  maxLength={120}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="inline-flex h-9 min-h-[36px] items-center justify-center rounded-lg border border-white/10 bg-white/10 px-4 text-[12px] font-medium text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Save
                </button>
              </div>
              {editError && <p className="mt-1 text-[11px] text-red-300">{editError}</p>}
              <p className="mt-1.5 text-[11px] text-white/40">
                Changes only the display label. Original: {asset.originalName}
              </p>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-medium text-white/70">Tags</h3>
                <span className="text-[11px] text-white/40">{asset.tags.length}/{MAX_TAGS_PER_ASSET}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {asset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-200 backdrop-blur-sm"
                  >
                    <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() => onRemoveTag(asset.key, tag)}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-blue-300/60 hover:bg-blue-500/20 hover:text-blue-200"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                {asset.tags.length === 0 && (
                  <p className="text-[11px] text-white/40">No tags added yet</p>
                )}
              </div>
              <div className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => { setNewTag(e.target.value); setTagError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
                  placeholder="Add tag..."
                  className="h-8 min-h-[32px] flex-1 rounded-lg border border-white/15 bg-white/10 px-2.5 text-[12px] text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/20"
                  maxLength={MAX_TAG_LENGTH}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="inline-flex h-8 min-h-[32px] items-center justify-center rounded-lg border border-white/10 bg-white/10 px-3 text-[11px] font-medium text-white/80 hover:bg-white/15 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {tagError && <p className="mt-1 text-[11px] text-red-300">{tagError}</p>}
            </div>

            {/* Collections */}
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-medium text-white/70">Collections</h3>
                <button
                  type="button"
                  onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                  className="inline-flex min-h-[28px] items-center gap-1 text-[11px] font-medium text-blue-300 hover:text-blue-200"
                >
                  <FolderPlus className="h-3 w-3" /> Manage
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {asset.collectionIds.length > 0 ? (
                  asset.collectionIds.map((cid) => {
                    const col = collections.find((c) => c.id === cid);
                    return (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70"
                      >
                        {col?.name ?? cid}
                        <button
                          type="button"
                          aria-label={`Remove from ${col?.name ?? cid}`}
                          onClick={() => onRemoveFromCollection(asset.key, cid)}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/70"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-white/40">Not in any collection</p>
                )}
              </div>
              {showCollectionMenu && (
                <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                  {collections.map((col) => {
                    const inCollection = asset.collectionIds.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          if (inCollection) {
                            onRemoveFromCollection(asset.key, col.id);
                          } else {
                            onMoveToCollection(asset.key, col.id);
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition min-h-[32px]",
                          inCollection
                            ? "bg-blue-500/15 text-blue-200 border border-blue-400/20"
                            : "text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent",
                        )}
                      >
                        <FolderPlus className="h-3 w-3" aria-hidden="true" />
                        {col.name}
                        {inCollection && <span className="ml-auto text-[10px]">Added</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <h3 className="text-[12px] font-medium text-white/70">Details</h3>
              <dl className="mt-3 space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">Type</dt>
                  <dd className="font-medium text-white/80">
                    {asset.mediaType === "image" ? "Image" : asset.mediaType === "video" ? "Video" : "Audio"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">MIME</dt>
                  <dd className="font-medium text-white/80">{asset.mimeType}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">Size</dt>
                  <dd className="font-medium text-white/80">{formatFileSize(asset.size)}</dd>
                </div>
                {asset.mediaType !== "audio" && (
                  <div className="flex items-center justify-between">
                    <dt className="text-white/40">Dimensions</dt>
                    <dd className="font-medium text-white/80">{formatDimensions(asset.width, asset.height)}</dd>
                  </div>
                )}
                {asset.duration !== null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-white/40">Duration</dt>
                    <dd className="font-medium text-white/80">{formatDuration(asset.duration)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">Origin</dt>
                  <dd className="font-medium text-white/80">{asset.origin === "api" ? "Downloader" : "Local Import"}</dd>
                </div>
                {asset.sourcePlatform && (
                  <div className="flex items-center justify-between">
                    <dt className="text-white/40">Platform</dt>
                    <dd className="font-medium text-white/80 capitalize">{asset.sourcePlatform}</dd>
                  </div>
                )}
                {asset.sourceUrl && (
                  <div className="flex items-center justify-between">
                    <dt className="text-white/40">Source URL</dt>
                    <dd className="min-w-0 truncate font-medium text-blue-300" title={asset.sourceUrl}>
                      {asset.sourceUrl}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">Added</dt>
                  <dd className="font-medium text-white/80">{new Date(asset.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">Status</dt>
                  <dd>
                    <StatusBadge
                      label={STATUS_LABEL[asset.status]}
                      tone={
                        asset.status === "metadata-ready" ? "green"
                          : asset.status === "limited-metadata" ? "amber"
                            : asset.status === "ready-to-publish" ? "cyan"
                              : asset.status === "archived" ? "neutral"
                                : "blue"
                      }
                    />
                  </dd>
                </div>
              </dl>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {asset.downloadUrl && (
                  <a
                    href={asset.downloadUrl}
                    download
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-blue-400/20 bg-blue-500/15 px-3 py-1.5 text-[12px] font-medium text-blue-200 hover:bg-blue-500/25"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void onCopy(asset.originalName)}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/15 hover:text-white/80"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy filename
                </button>
                <button
                  type="button"
                  onClick={() => onSetReadyToPublish(asset.key)}
                  disabled={asset.status === "ready-to-publish"}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-500/15 px-3 py-1.5 text-[12px] font-medium text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" /> Ready to Publish
                </button>
                {asset.archived ? (
                  <button
                    type="button"
                    onClick={() => onRestore(asset.key)}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/15 hover:text-white/80"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onArchive(asset.key)}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/15 hover:text-white/80"
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-label={`Remove ${asset.displayName} from library`}
                onClick={() => {
                  onRemove(asset.key);
                  onClose();
                }}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-500/15 px-3 py-1.5 text-[12px] font-medium text-red-200 hover:bg-red-500/25"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove from library
              </button>
            </div>

            <p className="text-[11px] text-white/35">
              {asset.origin === "api"
                ? "This file was uploaded to Nexapa and persists across sessions."
                : "This file exists only in the current browser session. No upload, no cloud, no backend request."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
