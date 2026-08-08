import { useEffect, useRef } from "react";
import { ExternalLink, Calendar as CalendarIcon, Clock, X } from "lucide-react";
import type { PublisherHistoryRecord } from "../publisher-history.types";
import { STATUS_DISPLAY, STATUS_TONE } from "../publisher-history.constants";
import { PlatformLogo } from "@/features/connected-accounts/components/PlatformLogo";
import { AuthenticatedMediaThumbnail } from "@/components/media/AuthenticatedMediaThumbnail";
import { cn } from "@/lib/cn";
import { PublisherHistoryAvatar } from "./PublisherHistoryAvatar";

type Props = {
  record: PublisherHistoryRecord | null;
  onClose: () => void;
};

export function PublisherHistoryDetailsDrawer({ record, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (record) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => dialogRef.current?.focus(), 0);
    } else {
      window.setTimeout(() => prevFocusRef.current?.focus(), 0);
    }
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [record, onClose]);

  if (!record) return null;

  const publishedDate = record.published_at ? new Date(record.published_at) : new Date(record.created_at);
  const scheduledDate = record.scheduled_at ? new Date(record.scheduled_at) : null;

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMediaDisplayName = () => {
    if (record.media_name && record.media_name.trim() !== "") {
      const nameWithoutExt = record.media_name.replace(/\.[^/.]+$/, "");
      if (nameWithoutExt && nameWithoutExt.trim() !== "") {
        return nameWithoutExt;
      }
    }
    return "Published video";
  };

  const handleOpenPermalink = () => {
    if (record.permalink) {
      window.open(record.permalink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex p-4" role="dialog" aria-modal="true" aria-labelledby="publisher-history-detail-title">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="ml-auto flex h-full w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <PlatformLogo platform={record.platform} className="h-4 w-4" />
              <h2 id="publisher-history-detail-title" className="truncate text-[15px] font-semibold capitalize text-white">
                {record.platform} Publishing History
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-xl", STATUS_TONE[record.status])}>
                {STATUS_DISPLAY[record.status]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 backdrop-blur-xl transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Thumbnail Preview */}
          {record.thumbnail_url ? (
            <div className="mb-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/10">
              <AuthenticatedMediaThumbnail
                thumbnailUrl={record.thumbnail_url}
                alt="Published media"
                className=""
              />
            </div>
          ) : record.content_url && record.media_type === "video" ? (
            <div className="mb-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/10">
              <video
                src={record.content_url}
                className="h-full w-full object-cover"
                preload="metadata"
                muted
                playsInline
              />
            </div>
          ) : null}

          <div className="space-y-4">
            {/* Caption / Media Name */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Content</span>
              {record.caption && record.caption.trim().length > 0 ? (
                <p className="whitespace-pre-wrap text-[13px] leading-5 text-white/80">{record.caption}</p>
              ) : (
                <p className="text-[13px] text-white/80">{getMediaDisplayName()}</p>
              )}
            </div>

            {/* Destination */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Published To</span>
              <div className="flex items-center gap-2">
                <PublisherHistoryAvatar name={record.destination_name} src={record.destination_avatar} className="h-8 w-8" />
                <p className="min-w-0 truncate text-[13px] text-white">{record.destination_name}</p>
              </div>
            </div>

            {/* Published Date */}
            <div className="rounded-xl border border-white/12 bg-white/8 p-3 backdrop-blur-xl">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Published</span>
              <div className="flex items-center gap-3 text-[13px] text-white/75">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-white/40" />
                  <span>{formatDate(publishedDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-white/40" />
                  <span>{formatTime(publishedDate)}</span>
                </div>
              </div>
            </div>

            {/* Scheduled Date (if available) */}
            {scheduledDate && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Scheduled</span>
                <div className="flex items-center gap-3 text-[13px] text-white/70">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-white/40" />
                    <span>{formatDate(scheduledDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-white/40" />
                    <span>{formatTime(scheduledDate)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Info */}
            {record.provider_publish_id && (
              <InfoRow label="Post ID" value={record.provider_publish_id} />
            )}

            {record.provider_status && (
              <InfoRow label="Provider Status" value={record.provider_status} />
            )}

            {/* Permalink */}
            {record.permalink && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/45">Link</span>
                <button
                  type="button"
                  onClick={handleOpenPermalink}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/15"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open on {record.platform === "facebook" ? "Facebook" : record.platform}
                </button>
              </div>
            )}

            {/* Timestamps */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <div className="space-y-2">
                <InfoRow label="Created" value={formatDateTime(new Date(record.created_at))} />
                <InfoRow label="Updated" value={formatDateTime(new Date(record.updated_at))} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/15">
            Close
          </button>
          {record.permalink && (
            <button
              type="button"
              onClick={handleOpenPermalink}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Post
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <p className="mt-0.5 break-all text-[13px] text-white/75">{value}</p>
    </div>
  );
}
