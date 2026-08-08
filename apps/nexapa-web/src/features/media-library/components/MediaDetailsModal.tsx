import { X, Image as ImageIcon, Video, Music, Calendar, HardDrive, Clock, Link as LinkIcon } from "lucide-react";
import type { UnifiedMediaAsset } from "../media-library.types";
import { formatFileSize, formatDimensions, formatDuration, formatLastModified } from "../media-library.utils";
import { STATUS_LABEL } from "../media-library.constants";
import { cn } from "@/lib/cn";
import { AuthenticatedMediaThumbnail } from "@/components/media/AuthenticatedMediaThumbnail";

type MediaDetailsModalProps = {
  asset: UnifiedMediaAsset | null;
  open: boolean;
  onClose: () => void;
  usageCount?: number;
  activeUsageCount?: number;
};

export function MediaDetailsModal({
  asset,
  open,
  onClose,
  usageCount,
  activeUsageCount,
}: MediaDetailsModalProps) {
  if (!open || !asset) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="relative flex h-[min(80vh,720px)] w-[calc(100vw-32px)] max-w-[700px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75 backdrop-blur-2xl shadow-[0_25px_80px_rgba(2,6,23,0.40)] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
            <h2 className="text-[16px] font-semibold text-white">Media Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/60 transition hover:bg-white/15 hover:text-white/80"
              aria-label="Close dialog"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
                {asset.origin === "api" && asset.thumbnailUrl ? (
                  <AuthenticatedMediaThumbnail
                    thumbnailUrl={asset.thumbnailUrl}
                    alt={asset.displayName}
                    className="aspect-video w-full"
                  />
                ) : asset.mediaType === "video" ? (
                  <video
                    src={asset.previewUrl}
                    controls
                    className="aspect-video w-full bg-black/50"
                  />
                ) : asset.mediaType === "image" ? (
                  <img
                    src={asset.previewUrl}
                    alt={asset.displayName}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-white/5">
                    <Music className="h-12 w-12 text-white/30" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-white/50">Name</label>
                  <p className="mt-1 text-[13px] font-medium text-white">{asset.displayName}</p>
                  <p className="text-[11px] text-white/40">Original: {asset.originalName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-white/50">Type</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      {asset.mediaType === "image" ? (
                        <ImageIcon className="h-4 w-4 text-blue-300" />
                      ) : asset.mediaType === "video" ? (
                        <Video className="h-4 w-4 text-violet-300" />
                      ) : (
                        <Music className="h-4 w-4 text-cyan-300" />
                      )}
                      <span className="text-[12px] font-medium text-white capitalize">
                        {asset.mediaType}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-white/50">Status</label>
                    <p className={cn(
                      "mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm",
                      asset.status === "available"
                        ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
                        : asset.status === "processing"
                          ? "bg-amber-500/15 text-amber-200 border-amber-400/20"
                          : "bg-white/10 text-white/60 border-white/10"
                    )}>
                      {STATUS_LABEL[asset.status]}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-white/50">Size</label>
                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-white/80">
                      <HardDrive className="h-3.5 w-3.5 text-white/40" />
                      {formatFileSize(asset.size)}
                    </div>
                  </div>

                  {(asset.mediaType === "video" || asset.mediaType === "audio") && (
                    <div>
                      <label className="text-[11px] font-medium text-white/50">Duration</label>
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-white/80">
                        <Clock className="h-3.5 w-3.5 text-white/40" />
                        {formatDuration(asset.duration)}
                      </div>
                    </div>
                  )}
                </div>

                {asset.mediaType !== "audio" && asset.width && asset.height && (
                  <div>
                    <label className="text-[11px] font-medium text-white/50">Resolution</label>
                    <p className="mt-1 text-[12px] text-white/80">
                      {formatDimensions(asset.width, asset.height)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-white/50">Added</label>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-white/80">
                    <Calendar className="h-3.5 w-3.5 text-white/40" />
                    {formatLastModified(asset.createdAtMs)}
                  </div>
                </div>

                {asset.sourcePlatform && (
                  <div>
                    <label className="text-[11px] font-medium text-white/50">Source Platform</label>
                    <p className="mt-1 text-[12px] text-white/80 capitalize">{asset.sourcePlatform}</p>
                  </div>
                )}

                {asset.sourceUrl && (
                  <div>
                    <label className="text-[11px] font-medium text-white/50">Source URL</label>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-300">
                      <LinkIcon className="h-3.5 w-3.5" />
                      <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-200">
                        {asset.sourceUrl}
                      </a>
                    </div>
                  </div>
                )}

                {(usageCount !== undefined || activeUsageCount !== undefined) && (
                  <div className="border-t border-white/10 pt-3">
                    <label className="text-[11px] font-medium text-white/50">Usage</label>
                    <div className="mt-2 space-y-1">
                      {activeUsageCount !== undefined && activeUsageCount > 0 && (
                        <p className="text-[12px] text-amber-200/80">
                          {activeUsageCount} active schedule{activeUsageCount !== 1 ? "s" : ""}
                        </p>
                      )}
                      {usageCount !== undefined && usageCount > 0 && (
                        <p className="text-[12px] text-white/60">
                          {usageCount} total post{usageCount !== 1 ? "s" : ""}
                        </p>
                      )}
                      {usageCount === 0 && activeUsageCount === 0 && (
                        <p className="text-[12px] text-white/40">Not used in any posts</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
