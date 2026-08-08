import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2, Copy, Image as ImageIcon, Video, Music } from "lucide-react";
import type { UnifiedMediaAsset } from "../media-library.types";
import { formatFileSize, formatDimensions, formatDuration } from "../media-library.utils";
import { STATUS_LABEL } from "../media-library.constants";
import { StatusBadge } from "@/components/common/StatusBadge";

type Props = {
  asset: UnifiedMediaAsset | null;
  open: boolean;
  onClose: () => void;
  onRemove: (key: string) => void;
  onUpdateDisplayName: (key: string, name: string) => boolean;
  onCopy: (text: string) => Promise<boolean>;
};

export function MediaDetailsDialog({ asset, open, onClose, onRemove, onUpdateDisplayName, onCopy }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editError, setEditError] = useState<string>("");
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [initializedKey, setInitializedKey] = useState<string | null>(null);

  const isNewAsset = asset && asset.key !== initializedKey;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const timeout = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-dialog-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div ref={dialogRef} className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-[0_25px_80px_rgba(2,6,23,0.40)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 id="media-dialog-title" className="truncate text-[15px] font-semibold text-white">
            {asset.displayName}
          </h2>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/60 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {/* Preview */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25 backdrop-blur-sm">
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
                    className="max-h-[320px] w-full object-contain bg-black/50"
                    onError={() => setPreviewError(true)}
                    aria-label={`${asset.displayName} video preview`}
                  />
                ) : (
                  <div className="flex h-[180px] items-center justify-center bg-white/5">
                    <Music className="h-10 w-10 text-white/30" />
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
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <label htmlFor="dialog-display-name" className="block text-[12px] font-medium text-white/80">
                Display name
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="dialog-display-name"
                  value={derivedEditName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (initializedKey !== asset.key) setInitializedKey(asset.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                  }}
                  className="h-9 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 text-[13px] text-white backdrop-blur-xl placeholder:text-white/40 focus:border-white/25 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
                  maxLength={120}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-white/15 px-4 text-[12px] font-medium text-white backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Save
                </button>
              </div>
              {editError && <p className="mt-1 text-[11px] text-rose-300">{editError}</p>}
              <p className="mt-2 text-[11px] text-white/50">
                This temporary label does not rename the file on your device. Max 120 chars.
              </p>
              <p className="mt-1 text-[11px] text-white/40">Original: {asset.originalName}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <h3 className="text-[13px] font-semibold text-white">Metadata</h3>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                <div>
                  <dt className="text-white/50">Media type</dt>
                  <dd className="font-medium text-white">
                    {asset.mediaType === "image" ? "Image" : asset.mediaType === "video" ? "Video" : "Audio"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50">MIME type</dt>
                  <dd className="font-medium text-white">{asset.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-white/50">File size</dt>
                  <dd className="font-medium text-white">{formatFileSize(asset.size)}</dd>
                </div>
                {asset.mediaType !== "audio" && (
                  <div>
                    <dt className="text-white/50">Dimensions</dt>
                    <dd className="font-medium text-white">
                      {formatDimensions(asset.width, asset.height)}
                    </dd>
                  </div>
                )}
                {asset.duration !== null && (
                  <div>
                    <dt className="text-white/50">Duration</dt>
                    <dd className="font-medium text-white">
                      {formatDuration(asset.duration)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-white/50">Origin</dt>
                  <dd className="font-medium text-white">{asset.origin === "api" ? "Downloader" : "Local Import"}</dd>
                </div>
                {asset.sourcePlatform && (
                  <div>
                    <dt className="text-white/50">Platform</dt>
                    <dd className="font-medium text-white capitalize">{asset.sourcePlatform}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-white/50">Added</dt>
                  <dd className="font-medium text-white">
                    {new Date(asset.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-white/50">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      label={STATUS_LABEL[asset.status] ?? asset.status}
                      tone={
                        asset.status === "metadata-ready"
                          ? "green"
                          : asset.status === "limited-metadata"
                            ? "amber"
                            : asset.status === "ready-to-publish"
                              ? "cyan"
                              : "blue"
                      }
                    />
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {asset.downloadUrl && (
                  <a
                    href={asset.downloadUrl}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-blue-500/15 px-3 py-1.5 text-[12px] font-medium text-blue-200 backdrop-blur-xl transition hover:bg-blue-500/25"
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void onCopy(asset.originalName)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy filename
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${asset.displayName} from library`}
                  onClick={() => {
                    onRemove(asset.key);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-500/15 px-3 py-1.5 text-[12px] font-medium text-red-300 backdrop-blur-xl transition hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove from library
                </button>
              </div>
            </div>

<p className="text-[11px] text-white/40">
  Uploaded to Nexapa and stored permanently for publishing.
</p>
          </div>
        </div>
      </div>
    </div>
  );
}
