import { useState } from "react";
import { Trash2, Expand, Image as ImageIcon, Video, Music } from "lucide-react";
import type { UnifiedMediaAsset } from "../media-library.types";
import { formatFileSize, formatDimensions, formatDuration } from "../media-library.utils";
import { STATUS_LABEL } from "../media-library.constants";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  asset: UnifiedMediaAsset;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onOpen: (key: string) => void;
};

export function MediaAssetRow({ asset, onToggle, onRemove, onOpen }: Props) {
  const [err, setErr] = useState(false);

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
        "group flex cursor-pointer flex-col gap-3 rounded-xl border px-3 py-3 backdrop-blur-2xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:flex-row sm:items-center sm:px-4",
        asset.selected
          ? "border-blue-400/60 bg-blue-400/15 ring-2 ring-blue-400/20 shadow-[0_14px_40px_rgba(2,6,23,0.14)]"
          : "border-white/20 bg-white/10 shadow-[0_12px_32px_rgba(2,6,23,0.10)] hover:bg-white/16 hover:shadow-[0_18px_48px_rgba(2,6,23,0.16)]",
      )}
    >
      <div className="flex items-center gap-3 sm:w-[35%]">
        <SelectionCheckbox
          checked={asset.selected}
          onChange={() => onToggle(asset.key)}
          ariaLabel={`${asset.selected ? "Deselect" : "Select"} ${asset.displayName}`}
        />
        <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-950/10 ring-1 ring-white/15">
          {!err ? (
            asset.mediaType === "image" ? (
              <img
                src={asset.previewUrl}
                alt={asset.displayName}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setErr(true)}
              />
            ) : asset.mediaType === "video" ? (
              <video
                src={asset.previewUrl}
                muted
                preload="metadata"
                playsInline
                className="h-full w-full object-cover"
                onError={() => setErr(true)}
                aria-label={`${asset.displayName} preview`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/8 backdrop-blur-xl">
                <Music className="h-5 w-5 text-blue-600" />
              </div>
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              {asset.mediaType === "image" ? <ImageIcon className="h-5 w-5" /> : asset.mediaType === "video" ? <Video className="h-5 w-5" /> : <Music className="h-5 w-5" />}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-950" title={asset.originalName}>
            {asset.displayName}
          </p>
          <p className="truncate text-[11px] text-slate-600">
            {formatFileSize(asset.size)} {"\u2022"} {asset.mimeType}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 text-[11px] sm:justify-between">
        <span className={cn(
          "rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl",
          asset.mediaType === "image"
            ? "border-blue-200/40 bg-blue-500/12 text-blue-800"
            : asset.mediaType === "video"
              ? "border-violet-200/40 bg-violet-500/12 text-violet-800"
              : "border-cyan-200/40 bg-cyan-500/12 text-cyan-800",
        )}>
          {asset.mediaType === "image" ? "Image" : asset.mediaType === "video" ? "Video" : "Audio"}
        </span>
        {asset.mediaType !== "audio" && (
          <span className="text-slate-700">{formatDimensions(asset.width, asset.height)}</span>
        )}
        {asset.duration !== null && (
          <span className="text-slate-700">{formatDuration(asset.duration)}</span>
        )}
        <span className={cn(
          "rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl",
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
        <span className="text-slate-600">{asset.origin === "local" ? "Local Import" : "Downloader"}</span>
        {asset.isInUse && (
          <span className="font-medium text-amber-700">Used by {asset.usageCount} posts</span>
        )}
        {asset.tags.length > 0 && (
          <span className="text-slate-600">
            {asset.tags.slice(0, 2).join(", ")}
            {asset.tags.length > 2 && ` +${asset.tags.length - 2}`}
          </span>
        )}
        <span className="text-[10px] text-slate-600">{new Date(asset.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="flex items-center gap-1 sm:ml-auto">
        <button
          type="button"
          aria-label={`Open details for ${asset.displayName}`}
          onClick={() => onOpen(asset.key)}
          className="inline-flex h-7 min-h-[40px] w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-700 backdrop-blur-xl transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Expand className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Remove ${asset.displayName}`}
          onClick={() => onRemove(asset.key)}
          className="inline-flex h-7 min-h-[40px] w-7 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-700 backdrop-blur-xl transition hover:bg-rose-500/15 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
