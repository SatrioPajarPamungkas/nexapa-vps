import { type ReactNode, useEffect, useMemo, useState } from "react";
import { X, Calendar, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PublisherPost } from "@/features/scheduler/scheduler.types";
import { PlatformLogo } from "@/features/connected-accounts/components/PlatformLogo";

type Props = {
  open: boolean;
  post: PublisherPost | null;
  onClose: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  loading?: boolean;
  preview?: ReactNode;
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-blue-500/12 border-blue-400/25 text-blue-200" },
  queued: { label: "Queued", cls: "bg-indigo-500/12 border-indigo-400/25 text-indigo-200" },
  uploading: { label: "Uploading", cls: "bg-cyan-500/12 border-cyan-400/25 text-cyan-200" },
  processing: { label: "Processing", cls: "bg-amber-500/12 border-amber-400/25 text-amber-200" },
  publishing: { label: "Publishing", cls: "bg-violet-500/12 border-violet-400/25 text-violet-200" },
  completed: { label: "Completed", cls: "bg-emerald-500/12 border-emerald-400/25 text-emerald-200" },
  published: { label: "Published", cls: "bg-emerald-500/12 border-emerald-400/25 text-emerald-200" },
  failed: { label: "Failed", cls: "bg-red-500/12 border-red-400/25 text-red-200" },
  cancelled: { label: "Cancelled", cls: "bg-white/10 border-white/15 text-white/70" },
  draft: { label: "Draft", cls: "bg-white/10 border-white/15 text-white/70" },
};

function DestinationAvatar({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/15"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-[10px] font-semibold text-white/80 ring-1 ring-white/15 backdrop-blur-xl">
      {initials}
    </span>
  );
}

export function ScheduleDetailModal({ open, post, onClose, onCancel, onReschedule, loading = false, preview }: Props) {
  const statusInfo = useMemo(() => {
    if (!post) return statusConfig.scheduled;
    return statusConfig[post.status] || statusConfig.scheduled;
  }, [post]);

  const scheduledDateTime = useMemo(() => {
    if (!post?.scheduled_at) return null;
    const date = new Date(post.scheduled_at);
    return {
      date: date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      time: date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    };
  }, [post?.scheduled_at]);

  const destinationName = post?.connected_account?.display_name
    || post?.connected_account?.name
    || "Destination unavailable";

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !post) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mx-4 flex max-h-[calc(100vh-2rem)] w-full max-w-[700px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Schedule Details</h2>
            <p className="mt-0.5 text-[11px] text-white/55">Post destination and publishing status</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 backdrop-blur-xl transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="mb-3 text-[11px] text-white/50">Refreshing details...</p>}
          {preview && <div className="mb-4 aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950/30">{preview}</div>}
          {/* Status Badge */}
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-xl mb-4", statusInfo.cls)}>
            <span className="text-[12px] font-semibold">{statusInfo.label}</span>
          </div>

          {/* Platform & Destination */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Platform</p>
              <div className="mt-2 flex items-center gap-2">
                <PlatformLogo platform={post.platform} className="h-6 w-6 shrink-0 object-contain" />
                <span className="text-[13px] font-medium capitalize text-white">{post.platform}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Destination</p>
              <div className="mt-2 flex items-center gap-2">
                <DestinationAvatar name={destinationName} src={post.connected_account?.avatar_url} />
                <p className="min-w-0 truncate text-[13px] font-medium text-white">{destinationName}</p>
              </div>
            </div>
          </div>

          {/* Caption */}
          {post.caption && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-2">Caption</p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <p className="text-[12px] leading-5 text-white/80 whitespace-pre-wrap line-clamp-6">{post.caption}</p>
              </div>
            </div>
          )}

          {!post.caption && post.media_asset && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-1">File</p>
              <p className="text-[12px] font-medium text-white/80">
                {post.media_asset.display_name || post.media_asset.original_filename || post.media_asset.original_name || "Scheduled media"}
              </p>
            </div>
          )}

          {/* Schedule Info */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-2">Schedule</p>
            <div className="rounded-xl border border-white/12 bg-white/8 p-3 backdrop-blur-xl space-y-2">
              {scheduledDateTime && (
                <div className="flex items-center gap-2 text-[12px] text-white/75">
                  <Calendar className="h-4 w-4 text-white/40" />
                  <span>{scheduledDateTime.date}</span>
                </div>
              )}
              {scheduledDateTime && (
                <div className="flex items-center gap-2 text-[12px] text-white/75">
                  <Clock className="h-4 w-4 text-white/40" />
                  <span>{scheduledDateTime.time}{post.timezone ? ` (${post.timezone})` : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Provider Info */}
          {post.provider_publish_id && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-1">Provider Post ID</p>
              <p className="text-[12px] font-mono text-white/70 break-all">{post.provider_publish_id}</p>
            </div>
          )}

          {post.provider_status && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-1">Provider Status</p>
              <p className="text-[12px] text-white/75">{post.provider_status}</p>
            </div>
          )}

          {post.published_at && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-1">Published</p>
              <p className="text-[12px] text-white/75">{new Date(post.published_at).toLocaleString()}</p>
            </div>
          )}

          {/* Failure Info */}
          {post.status === "failed" && (post.failure_message || post.failure_code) && (
            <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 backdrop-blur-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-red-200">Failure Details</p>
                  {post.failure_message && <p className="text-[12px] text-red-200/80 mt-1">{post.failure_message}</p>}
                  {post.failure_code && (
                    <p className="text-[10px] text-red-200/60 mt-1 font-mono">Code: {post.failure_code}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {post.status === "failed" && post.failed_at && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-1">Failed At</p>
              <p className="text-[12px] text-white/70">{new Date(post.failed_at).toLocaleString()}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-white/10 pt-4">
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xl">
                <p className="text-white/40">Created</p>
                <p className="text-white/70 mt-0.5">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xl">
                <p className="text-white/40">Updated</p>
                <p className="text-white/70 mt-0.5">
                  {new Date(post.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-white/5 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {(post.status === "scheduled" || post.status === "queued") && (
              <>
                {onReschedule && (
                  <button
                    type="button"
                    onClick={onReschedule}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-xl hover:bg-white/15 transition-colors"
                  >
                    Reschedule
                  </button>
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-1.5 text-[12px] font-medium text-red-200 hover:bg-red-500/25 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/12 px-4 py-1.5 text-[12px] font-medium text-white backdrop-blur-xl hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
