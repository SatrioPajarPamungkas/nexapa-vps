import { Eye, Film } from "lucide-react";
import type { PublisherHistoryRecord } from "../publisher-history.types";
import { STATUS_DISPLAY, STATUS_TONE } from "../publisher-history.constants";
import { PlatformLogo } from "@/features/connected-accounts/components/PlatformLogo";
import { AuthenticatedMediaThumbnail } from "@/components/media/AuthenticatedMediaThumbnail";
import { cn } from "@/lib/cn";
import { PublisherHistoryAvatar } from "./PublisherHistoryAvatar";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  record: PublisherHistoryRecord;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
};

export function PublisherHistoryCard({ record, isSelected, onToggleSelect, onClick }: Props) {
  const publishedDate = record.published_at ? new Date(record.published_at) : new Date(record.created_at);

  const formattedDate = publishedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getMediaDisplayName = () => {
    if (record.media_name && record.media_name.trim() !== "") {
      const nameWithoutExt = record.media_name.replace(/\.[^/.]+$/, "");
      if (nameWithoutExt && nameWithoutExt.trim() !== "") {
        return nameWithoutExt;
      }
    }
    return "Published video";
  };

  const getMeaningfulCaption = () => {
    if (record.caption && record.caption.trim().length > 0 && !/^\d+$/.test(record.caption.trim())) {
      return record.caption.length > 100 ? record.caption.slice(0, 100) + "..." : record.caption;
    }
    const displayName = getMediaDisplayName();
    if (displayName !== "Published video") {
      return null;
    }
    return null;
  };

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${getMediaDisplayName()}, ${isSelected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggleSelect();
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggleSelect();
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/10 p-4 text-left shadow-[0_14px_40px_rgba(2,6,23,0.14)] backdrop-blur-2xl ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/15 hover:shadow-[0_20px_55px_rgba(2,6,23,0.20)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        isSelected ? "border-blue-400/50 bg-blue-500/12 ring-2 ring-blue-400/20" : "border-white/20"
      )}
    >
      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-2 py-1 backdrop-blur-xl">
            <PlatformLogo
              platform={record.platform}
              className="h-4 w-4"
            />
            <span className="text-[11px] font-medium capitalize text-slate-700">
              {record.platform}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SelectionCheckbox
              checked={isSelected}
              onChange={onToggleSelect}
              ariaLabel={`${isSelected ? "Deselect" : "Select"} ${getMediaDisplayName()}`}
            />
            <span
              className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[record.status])}
            >
              {STATUS_DISPLAY[record.status]}
            </span>
          </div>
        </div>

        {record.thumbnail_url ? (
          <div className="mb-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/10">
            <AuthenticatedMediaThumbnail
              thumbnailUrl={record.thumbnail_url}
              alt=""
              className=""
            />
          </div>
        ) : record.content_url && record.media_type === "video" ? (
          <div className="mb-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/10">
            <video
              src={record.content_url}
              className="h-full w-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
          </div>
        ) : (
          <div className="mb-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/10">
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <Film className="mx-auto mb-1 h-8 w-8 text-white/30" />
                <span className="text-[10px] text-white/40">Thumbnail unavailable</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xl">
          {(() => {
            const meaningfulCaption = getMeaningfulCaption();
            const mediaDisplayName = getMediaDisplayName();

            if (meaningfulCaption) {
              return (
                <p className="line-clamp-2 text-[12px] leading-5 text-slate-700" title={record.caption || ""}>
                  {meaningfulCaption}
                </p>
              );
            }

            if (mediaDisplayName && mediaDisplayName !== "Published video") {
              return (
                <p className="truncate text-[12px] font-medium text-slate-950" title={mediaDisplayName}>
                  {mediaDisplayName}
                </p>
              );
            }

            return (
              <p className="text-[12px] text-slate-600">
                Published video
              </p>
            );
          })()}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 max-w-[60%] items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-2 py-1 backdrop-blur-xl">
            <PublisherHistoryAvatar name={record.destination_name} src={record.destination_avatar} className="h-5 w-5" />
            <span className="truncate text-[11px] font-medium text-slate-700" title={record.destination_name}>{record.destination_name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="rounded-lg border border-white/12 bg-white/8 px-2 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-xl">
              {formattedDate}
            </span>
            <button
              type="button"
              onClick={onClick}
              aria-label="View details"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 bg-white/8 text-slate-600 backdrop-blur-xl hover:bg-white/15 hover:text-slate-800"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
