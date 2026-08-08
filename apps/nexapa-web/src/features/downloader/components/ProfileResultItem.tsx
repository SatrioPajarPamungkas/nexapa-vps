import { Trash2, Calendar, Film, FileText, Repeat } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProfileResultItem } from "../downloader.types";
import { PlatformBadge } from "./PlatformBadge";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  item: ProfileResultItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  viewMode: "grid" | "list";
  isSubmitting: boolean;
  isProcessed: boolean;
};

function SourceTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "video":
      return <Film className="h-3 w-3" aria-hidden="true" />;
    case "post":
      return <FileText className="h-3 w-3" aria-hidden="true" />;
    default:
      return <Repeat className="h-3 w-3" aria-hidden="true" />;
  }
}

function getMediaTypeBadge(mediaType: string | null): { label: string; color: string } {
  if (!mediaType) return { label: "Media", color: "border border-white/15 bg-white/8 text-slate-600" };

  switch (mediaType) {
    case "video":
      return { label: "Video", color: "border border-blue-200/40 bg-blue-500/12 text-blue-700" };
    case "image":
      return { label: "Image", color: "border border-purple-200/40 bg-purple-500/12 text-purple-700" };
    case "gif":
      return { label: "GIF", color: "border border-pink-200/40 bg-pink-500/12 text-pink-700" };
    case "audio":
      return { label: "Audio", color: "border border-amber-200/40 bg-amber-500/12 text-amber-700" };
    case "carousel":
      return { label: "Carousel", color: "border border-cyan-200/40 bg-cyan-500/12 text-cyan-700" };
    default:
      return { label: "Media", color: "border border-white/15 bg-white/8 text-slate-600" };
  }
}

function ThumbnailPlaceholder({ index, isGrid }: { index: number; isGrid: boolean }) {
  const hue = (index * 47) % 360;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg",
        isGrid ? "h-32 w-full" : "h-14 w-20",
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 94%), hsl(${hue + 30}, 40%, 90%))`,
      }}
    >
      <Film className="h-6 w-6 text-slate-300" aria-hidden="true" />
    </div>
  );
}

function formatDurationShort(seconds: number | null): string | null {
  if (seconds === null) return null;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function ProfileResultItemRow({ item, onToggle, onRemove, onDownload, viewMode, isSubmitting, isProcessed }: Props) {
  const isGrid = viewMode === "grid";
  const thumbIndex = parseInt(item.id.split("-").pop() ?? "1", 10) || 1;
  const durationDisplay = formatDurationShort(item.durationSeconds);

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${item.title}, ${item.selected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggle(item.id);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggle(item.id);
        }
      }}
      className={cn(
        "group flex cursor-pointer rounded-xl border backdrop-blur-xl transition-all duration-150 hover:shadow-[0_10px_30px_rgba(2,6,23,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        item.selected ? "border-blue-300/50 bg-blue-500/10 ring-1 ring-blue-200/50" : "border-white/12 bg-white/8 hover:border-white/20 hover:bg-white/15",
        isGrid ? "flex-col" : "flex-row items-stretch",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-slate-950/10", isGrid ? "rounded-t-xl" : "rounded-l-xl")}>
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className={cn("object-cover", isGrid ? "h-32 w-full" : "h-14 w-20")}
            loading="lazy"
          />
        ) : (
          <ThumbnailPlaceholder index={thumbIndex} isGrid={isGrid} />
        )}
        {item.isDemo && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 backdrop-blur-sm">
            DEMO
          </span>
        )}
        {durationDisplay && (
          <span className="absolute bottom-1 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {durationDisplay}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SelectionCheckbox
              checked={item.selected}
              onChange={() => onToggle(item.id)}
              ariaLabel={`${item.selected ? "Deselect" : "Select"} ${item.title}`}
              className="h-3.5 w-3.5"
            />
            <PlatformBadge platform={item.platform} />
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-700 backdrop-blur-xl">
              <SourceTypeIcon type={item.sourceType} />
              <span className="capitalize">{item.sourceType}</span>
            </span>
            {item.mediaType && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-xl ${getMediaTypeBadge(item.mediaType).color}`}>
                {getMediaTypeBadge(item.mediaType).label}
              </span>
            )}
          </div>

          <p className="mt-1.5 line-clamp-2 text-[13px] font-medium text-slate-950" title={item.title}>
            {item.title}
          </p>

          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-600">
            {item.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className={cn("mt-2 flex items-center gap-1.5", isGrid ? "" : "justify-end")}>
          <button
            type="button"
            aria-label={isProcessed ? `Download ready: ${item.title}` : `Download ${item.title}`}
            onClick={() => onDownload(item.id)}
            disabled={isSubmitting || isProcessed || !item.originalUrl}
            className="inline-flex min-h-[28px] items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? "Preparing..." : isProcessed ? "Download ready" : "Download"}
          </button>
          <button
            type="button"
            aria-label={`Remove ${item.title} from preview`}
            onClick={() => onRemove(item.id)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-rose-500/15 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
