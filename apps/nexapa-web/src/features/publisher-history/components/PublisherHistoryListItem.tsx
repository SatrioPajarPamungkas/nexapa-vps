import { Film } from "lucide-react";
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

export function PublisherHistoryListItem({ record, isSelected, onToggleSelect, onClick }: Props) {
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
        "grid w-full cursor-pointer grid-cols-[80px_1fr_auto] gap-3 rounded-2xl border p-3 text-left shadow-[0_14px_40px_rgba(2,6,23,0.10)] backdrop-blur-2xl transition-all hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        isSelected ? "border-blue-400/50 bg-blue-500/12 ring-2 ring-blue-400/20" : "border-white/20 bg-white/10"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/10">
        <div className="absolute left-1 top-1 z-10">
          <SelectionCheckbox
            checked={isSelected}
            onChange={onToggleSelect}
            ariaLabel={`${isSelected ? "Deselect" : "Select"} ${getMediaDisplayName()}`}
          />
        </div>
        {record.thumbnail_url ? (
          <AuthenticatedMediaThumbnail
            thumbnailUrl={record.thumbnail_url}
            alt=""
            className=""
          />
        ) : record.content_url && record.media_type === "video" ? (
          <video
            src={record.content_url}
            className="h-full w-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-950/10">
            <Film className="h-6 w-6 text-white/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/6 px-1.5 py-0.5 backdrop-blur-xl">
            <PlatformLogo platform={record.platform} className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium capitalize text-slate-600">{record.platform}</span>
          </div>
          <span className="text-[10px] text-white/30">&middot;</span>
          <span
            className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", STATUS_TONE[record.status])}
          >
            {STATUS_DISPLAY[record.status]}
          </span>
        </div>

        {(() => {
          const meaningfulCaption = getMeaningfulCaption();
          const mediaDisplayName = getMediaDisplayName();

          if (meaningfulCaption) {
            return (
              <p className="line-clamp-1 text-[12px] text-slate-950" title={record.caption || ""}>
                {meaningfulCaption}
              </p>
            );
          }

          if (mediaDisplayName && mediaDisplayName !== "Published video") {
            return (
              <p className="truncate text-[12px] font-medium text-slate-700" title={mediaDisplayName}>
                {mediaDisplayName}
              </p>
            );
          }

          return (
            <p className="text-[12px] text-slate-600">Published video</p>
          );
        })()}

        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <PublisherHistoryAvatar name={record.destination_name} src={record.destination_avatar} className="h-5 w-5" />
          <span className="truncate" title={record.destination_name}>{record.destination_name}</span>
          <span className="text-white/30">&middot;</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Arrow */}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center rounded-lg border border-white/10 bg-white/6 px-2 py-1 text-slate-500 backdrop-blur-xl hover:bg-white/12 hover:text-slate-700"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
