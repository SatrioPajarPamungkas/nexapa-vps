import { useState } from "react";
import { Trash2, Expand, Image as ImageIcon, Video, Music } from "lucide-react";
import type { UnifiedMediaAsset } from "../media-library.types";
import { formatFileSize, formatDimensions, formatDuration } from "../media-library.utils";
import { STATUS_LABEL } from "../media-library.constants";
import { cn } from "@/lib/cn";
import { AuthenticatedMediaThumbnail } from "@/components/media/AuthenticatedMediaThumbnail";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  asset: UnifiedMediaAsset;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onOpen: (key: string) => void;
};

function AudioWaveformMini() {
  return (
    <svg width="100%" height="32" viewBox="0 0 120 32" fill="none" className="text-blue-300" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => {
        const h = 4 + Math.sin(i * 0.8) * 10 + Math.cos(i * 1.5) * 5;
        return (
          <rect
            key={i}
            x={i * 5}
            y={16 - h / 2}
            width={3}
            height={h}
            rx={1.5}
            fill="currentColor"
            opacity={0.5 + Math.sin(i * 0.6) * 0.3}
          />
        );
      })}
    </svg>
  );
}

export function MediaAssetCard({ asset, onToggle, onRemove, onOpen }: Props) {
  const [previewError, setPreviewError] = useState(false);

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${asset.displayName}, ${asset.selected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggle(asset.key);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggle(asset.key);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        asset.selected
          ? "border-blue-400/60 bg-blue-400/15 ring-2 ring-blue-400/20 shadow-[0_18px_55px_rgba(2,6,23,0.16)]"
          : "border-white/20 bg-white/10 shadow-[0_14px_40px_rgba(2,6,23,0.14)] hover:-translate-y-0.5 hover:bg-white/16 hover:shadow-[0_20px_55px_rgba(2,6,23,0.20)]",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950/10">
        {asset.origin === "api" && asset.thumbnailUrl ? (
          <AuthenticatedMediaThumbnail
            thumbnailUrl={asset.thumbnailUrl}
            alt={asset.displayName}
            className="rounded-none"
          />
        ) : !previewError ? (
          asset.mediaType === "image" ? (
            <img
              src={asset.previewUrl}
              alt={asset.displayName}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setPreviewError(true)}
            />
          ) : asset.mediaType === "video" ? (
            <div className="relative h-full w-full">
              <video
                src={asset.previewUrl}
                muted
                preload="metadata"
                playsInline
                className="h-full w-full object-cover"
                onError={() => setPreviewError(true)}
                aria-label={`${asset.displayName} local video preview`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/35 text-white backdrop-blur-sm">
                  <Video className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/5 backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/20 backdrop-blur-xl shadow-sm">
                <Music className="h-6 w-6 text-blue-700" aria-hidden="true" />
              </div>
              <div className="w-3/4">
                <AudioWaveformMini />
              </div>
            </div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-950/10 text-slate-500">
            {asset.mediaType === "image" ? <ImageIcon className="h-8 w-8" /> : asset.mediaType === "video" ? <Video className="h-8 w-8" /> : <Music className="h-8 w-8" />}
          </div>
        )}

        <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
          <SelectionCheckbox
            checked={asset.selected}
            onChange={() => onToggle(asset.key)}
            ariaLabel={`${asset.selected ? "Deselect" : "Select"} ${asset.displayName}`}
          />
        </div>

        <div className="absolute right-2 top-2 flex items-center gap-1">
          <span className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none backdrop-blur-xl",
            asset.mediaType === "image"
              ? "border-blue-200/40 bg-blue-500/12 text-blue-800"
              : asset.mediaType === "video"
                ? "border-violet-200/40 bg-violet-500/12 text-violet-800"
                : "border-cyan-200/40 bg-cyan-500/12 text-cyan-800",
          )}>
            {asset.mediaType === "image" ? "Image" : asset.mediaType === "video" ? "Video" : "Audio"}
          </span>
          {asset.archived && (
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur-xl">
              Archived
            </span>
          )}
        </div>

        {(asset.mediaType === "video" || asset.mediaType === "audio") && asset.duration !== null && (
          <div className="absolute bottom-2 right-2">
            <span className="rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {formatDuration(asset.duration)}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            aria-label={`Open details for ${asset.displayName}`}
            onClick={() => onOpen(asset.key)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/70 text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Expand className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${asset.displayName}`}
            onClick={() => onRemove(asset.key)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/70 text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-rose-500/20 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-white/10 bg-white/5 p-3 backdrop-blur-xl">
        <p className="truncate text-[13px] font-medium text-slate-950" title={asset.originalName}>
          {asset.displayName}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-xl",
            asset.status === "metadata-ready"
              ? "border-emerald-200/40 bg-emerald-500/10 text-emerald-800"
              : asset.status === "limited-metadata"
                ? "border-amber-200/40 bg-amber-500/10 text-amber-800"
                : asset.status === "ready-to-publish"
                  ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-800"
                  : "border-blue-200/40 bg-blue-500/10 text-blue-800",
          )}>
            {STATUS_LABEL[asset.status]}
          </span>
          <span className="text-[10px] text-slate-700">
            {formatFileSize(asset.size)}
            {asset.mediaType !== "audio" && ` \u2022 ${formatDimensions(asset.width, asset.height)}`}
          </span>
        </div>
        {asset.isInUse && (
          <p className="text-[10px] font-medium text-amber-700">
            Used by {asset.usageCount} posts
          </p>
        )}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-blue-200/30 bg-blue-500/8 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                {tag}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-[10px] text-slate-600">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
