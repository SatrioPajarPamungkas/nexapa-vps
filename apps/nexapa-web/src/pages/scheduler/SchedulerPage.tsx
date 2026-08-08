import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SchedulerStatusBadge } from "@/features/scheduler/components/SchedulerStatusBadge";
import { SchedulerComingSoon } from "@/features/scheduler/components/SchedulerComingSoon";
import { ScheduleDetailModal } from "@/features/scheduler/components/ScheduleDetailModal";
import { RescheduleModal } from "@/features/scheduler/components/RescheduleModal";
import { CancelScheduleDialog } from "@/features/scheduler/components/CancelScheduleDialog";
import { SchedulerPlatformComposer } from "@/features/scheduler/components/SchedulerPlatformComposer";
import { PlatformLogo } from "@/features/connected-accounts/components/PlatformLogo";
import type {
  PublisherPost,
  SchedulerStatus as SchedulerStatusType,
} from "@/features/scheduler/scheduler.types";
import {
  fetchSchedulerPosts,
  fetchSchedulerPost,
  fetchSchedulerStatus,
  fetchConnectedAccounts,
  cancelBatchSchedules,
} from "@/lib/api/scheduler";
import { apiFetchBlob } from "@/lib/api/client";
import { Calendar, AlertCircle, CheckSquare, Square, Film, MoreHorizontal, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

const thumbnailBlobCache = new Map<string, Blob>();
const thumbnailRequestCache = new Map<string, Promise<Blob>>();

async function fetchThumbnailBlob(url: string): Promise<Blob> {
  if (thumbnailBlobCache.has(url)) {
    const cachedBlob = thumbnailBlobCache.get(url)!;
    if (cachedBlob.size > 0) {
      return cachedBlob;
    }
    thumbnailBlobCache.delete(url);
  }

  if (thumbnailRequestCache.has(url)) {
    return thumbnailRequestCache.get(url)!;
  }

  const requestPromise = (async () => {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    const blob = await apiFetchBlob(path);

    thumbnailBlobCache.set(url, blob);
    return blob;
  })();

  thumbnailRequestCache.set(url, requestPromise);

  void requestPromise.then(
    () => {
      thumbnailRequestCache.delete(url);
    },
    () => {
      thumbnailRequestCache.delete(url);
    },
  );

  return requestPromise;
}

type ThumbnailImageProps = {
  src: string;
  alt?: string;
};

function ThumbnailImage({ src, alt }: ThumbnailImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setObjectUrl(null);
      setLoading(false);
      setFailed(true);
      return;
    }

    setObjectUrl(null);
    setLoading(true);
    setFailed(false);

    let cancelled = false;
    let localObjectUrl: string | null = null;

    const loadThumbnail = async () => {
      try {
        const blob = await fetchThumbnailBlob(src);

        if (cancelled) {
          return;
        }

        localObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(localObjectUrl);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      cancelled = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [src]);

  const handleImageError = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setFailed(true);
  }, [objectUrl]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950/10">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (failed || !objectUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950/10">
        <div className="text-center">
          <Film className="h-8 w-8 text-white/30 mx-auto mb-1" />
          <span className="text-[10px] text-white/40">Thumbnail unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt || ""}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={handleImageError}
    />
  );
}

function getMediaDisplayName(mediaAsset: { storage_path?: string; original_name?: string; original_filename?: string; display_name?: string; media_type?: string }): string {
  if (!mediaAsset) return "Scheduled video";

  const filename = mediaAsset.original_filename || mediaAsset.original_name || mediaAsset.display_name;
  if (filename && filename.trim() !== "") {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt && nameWithoutExt.trim() !== "") {
      return nameWithoutExt;
    }
  }

  const path = mediaAsset.storage_path;
  if (path) {
    const pathFilename = path.split('/').pop() || path;
    const nameWithoutExt = pathFilename.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt && nameWithoutExt.trim() !== "") {
      return nameWithoutExt;
    }
  }

  return "Scheduled video";
}

function getMeaningfulCaption(caption: string | null, mediaAsset?: { storage_path?: string }): string | null {
  if (caption && caption.trim().length > 0 && !/^\d+$/.test(caption.trim())) {
    return caption.length > 100 ? caption.slice(0, 100) + "..." : caption;
  }

  const displayName = getMediaDisplayName(mediaAsset || {});
  if (displayName !== "Scheduled video") {
    return null;
  }

  return null;
}

type SchedulerPlatformSelector =
  | "all"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "shopee";

const ACTIVE_SCHEDULER_STATUSES: PublisherPost["status"][] = [
  "scheduled",
  "queued",
  "uploading",
  "processing",
  "publishing",
];

const PLATFORM_OPTIONS: { id: SchedulerPlatformSelector; label: string; logo: "facebook" | "tiktok" | "youtube" | "shopee" }[] = [
  { id: "all", label: "All", logo: "facebook" },
  { id: "facebook", label: "Facebook", logo: "facebook" },
  { id: "tiktok", label: "TikTok", logo: "tiktok" },
  { id: "youtube", label: "YouTube", logo: "youtube" },
  { id: "shopee", label: "Shopee", logo: "shopee" },
];

type CardActionsProps = {
  post: PublisherPost;
  onViewDetails: (post: PublisherPost) => void;
  onViewError: (post: PublisherPost) => void;
  onReschedule: (post: PublisherPost) => void;
  onCancel: (post: PublisherPost) => void;
};

function CardActions({ post, onViewDetails, onViewError, onReschedule, onCancel }: CardActionsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canModify = post.status === "scheduled" || post.status === "queued";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const runAction = (action: (post: PublisherPost) => void) => {
    setOpen(false);
    action(post);
  };

  return (
    <div ref={menuRef} className="absolute right-3 top-3 z-20" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Open post actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/12 text-slate-700 backdrop-blur-xl hover:bg-white/22 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 py-1 shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
          <button type="button" role="menuitem" onClick={() => runAction(onViewDetails)} className="block w-full px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/10 hover:text-white">
            View Details
          </button>
          {canModify && (
            <>
              <button type="button" role="menuitem" onClick={() => runAction(onReschedule)} className="block w-full px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/10 hover:text-white">
                Reschedule
              </button>
              <button type="button" role="menuitem" onClick={() => runAction(onCancel)} className="block w-full px-3 py-2 text-left text-[12px] text-red-300 hover:bg-red-500/15 hover:text-red-200">
                Cancel Schedule
              </button>
            </>
          )}
          {post.status === "failed" && (
            <button type="button" role="menuitem" onClick={() => runAction(onViewError)} className="block w-full px-3 py-2 text-left text-[12px] text-red-300 hover:bg-red-500/15 hover:text-red-200">
              View Error
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: PublisherPost["status"] }) {
  const mapping: Record<string, string> = {
    scheduled: "bg-blue-500/12 border-blue-400/25 text-blue-800",
    queued: "bg-indigo-500/12 border-indigo-400/25 text-indigo-800",
    uploading: "bg-cyan-500/12 border-cyan-400/25 text-cyan-800",
    processing: "bg-cyan-500/12 border-cyan-400/25 text-cyan-800",
    publishing: "bg-violet-500/12 border-violet-400/25 text-violet-800",
    failed: "bg-red-500/12 border-red-400/25 text-red-800",
  };
  const cls = mapping[status] || "bg-white/10 border-white/20 text-slate-700";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur-xl", cls)}>
      {status}
    </span>
  );
}

function AccountAvatar({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return <img src={src} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" onError={() => setFailed(true)} />;
  }
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-semibold text-slate-700 ring-1 ring-white/20">
      {initials}
    </span>
  );
}

export function SchedulerPage() {
  const [activePlatform, setActivePlatform] = useState<SchedulerPlatformSelector>("facebook");
  const [posts, setPosts] = useState<PublisherPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatusType | null>(null);
  const [accounts, setAccounts] = useState<NonNullable<PublisherPost["connected_account"]>[]>([]);

  // Dialogs
  const [showComposer, setShowComposer] = useState<{ open: boolean; platform: "facebook" | "tiktok" | "youtube" | "shopee" }>({ open: false, platform: "facebook" });
  const [showComingSoon, setShowComingSoon] = useState<{ open: boolean; platform: "youtube" | "shopee" }>({ open: false, platform: "youtube" });
  const [selectedPost, setSelectedPost] = useState<PublisherPost | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const detailsRequestRef = useRef(0);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkCancel, setShowBulkCancel] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const filteredPosts = useMemo(() => {
    if (activePlatform === "all") return posts;
    return posts.filter((p) => p.platform === activePlatform);
  }, [posts, activePlatform]);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof fetchSchedulerPosts>[0] = {
        action: "schedule",
        active: true, // Only fetch active posts
      };
      if (activePlatform !== "all") {
        params.platform = activePlatform;
      }

      const result = await fetchSchedulerPosts(params);
      setPosts(result.data.filter((post) => ACTIVE_SCHEDULER_STATUSES.includes(post.status)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  }, [activePlatform]);

  const getTitleInfo = useMemo(() => {
    switch (activePlatform) {
      case "facebook":
        return { eyebrow: "Scheduler / Facebook", title: "Facebook Video Scheduler", subtitle: "Manage scheduled Facebook video posts" };
      case "tiktok":
        return { eyebrow: "Scheduler / TikTok", title: "TikTok Video Scheduler", subtitle: "Manage scheduled TikTok video posts" };
      case "youtube":
        return { eyebrow: "Scheduler / YouTube", title: "YouTube Scheduler", subtitle: "YouTube scheduling coming soon" };
      case "shopee":
        return { eyebrow: "Scheduler / Shopee", title: "Shopee Scheduler", subtitle: "Shopee scheduling coming soon" };
      case "all":
      default:
        return { eyebrow: "Scheduler", title: "All Scheduled Posts", subtitle: "Manage scheduled posts across all platforms" };
    }
  }, [activePlatform]);

  const getButtonLabel = useMemo(() => {
    switch (activePlatform) {
      case "facebook":
        return "+ Schedule Facebook Videos";
      case "tiktok":
        return "+ Schedule TikTok Videos";
      case "youtube":
      case "shopee":
        return "Coming Soon";
      case "all":
      default:
        return "+ Create Schedule";
    }
  }, [activePlatform]);

  const loadStatus = useCallback(async () => {
    try {
      const status = await fetchSchedulerStatus();
      setSchedulerStatus(status);
    } catch (err) {
      console.error("Failed to load scheduler status", err);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const allAccounts = await fetchConnectedAccounts();
      setAccounts(allAccounts);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    loadStatus();

    const interval = setInterval(loadStatus, 60000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const handleBatchSuccess = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      setToast({ message: `${customEvent.detail.count} videos scheduled successfully.`, type: "success" });
      loadPosts();
      setShowComposer({ open: false, platform: "facebook" });
      setTimeout(() => setToast(null), 3000);
    };

    window.addEventListener("scheduler:batch-success", handleBatchSuccess);
    return () => {
      window.removeEventListener("scheduler:batch-success", handleBatchSuccess);
    };
  }, [loadPosts]);

  const handleCreateClick = useCallback(() => {
    if (activePlatform === "facebook" || activePlatform === "tiktok" || activePlatform === "youtube" || activePlatform === "shopee") {
      setShowComposer({ open: true, platform: activePlatform });
    } else {
      setShowComingSoon({ open: true, platform: "youtube" });
    }
  }, [activePlatform]);

  const handleViewDetails = useCallback(async (post: PublisherPost) => {
    const requestId = ++detailsRequestRef.current;
    setSelectedPost(post);
    setDetailsLoading(true);
    try {
      const latestPost = await fetchSchedulerPost(post.id);
      const detailAccount = latestPost.connected_account;
      const fallbackAccount = post.connected_account;
      const destinationName = detailAccount?.display_name
        || detailAccount?.name
        || fallbackAccount?.display_name
        || fallbackAccount?.name;

      if (detailsRequestRef.current === requestId) {
        setSelectedPost({
          ...post,
          ...latestPost,
          connected_account: detailAccount || fallbackAccount
            ? {
                ...fallbackAccount,
                ...detailAccount,
                display_name: destinationName || "",
                avatar_url: detailAccount?.avatar_url || fallbackAccount?.avatar_url,
              } as NonNullable<PublisherPost["connected_account"]>
            : undefined,
        });
      }
    } catch {
      if (detailsRequestRef.current !== requestId) return;
      setToast({ message: "Latest post details could not be loaded. Showing available details.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      if (detailsRequestRef.current === requestId) setDetailsLoading(false);
    }
  }, []);

  const handleCloseDetails = useCallback(() => {
    detailsRequestRef.current += 1;
    setDetailsLoading(false);
    setSelectedPost(null);
  }, []);

  const handleReschedule = useCallback((post: PublisherPost) => {
    setSelectedPost(post);
    setShowReschedule(true);
  }, []);

  const handleCancel = useCallback((post: PublisherPost) => {
    setSelectedPost(post);
    setShowCancel(true);
  }, []);

  const handleRescheduleSuccess = useCallback(() => {
    loadPosts();
    setToast({ message: "Schedule updated successfully.", type: "success" });
    setTimeout(() => setToast(null), 3000);
    setShowReschedule(false);
    setSelectedPost(null);
  }, [loadPosts]);

  const handleCancelSuccess = useCallback(() => {
    loadPosts();
    setToast({ message: "Schedule cancelled successfully.", type: "success" });
    setTimeout(() => setToast(null), 3000);
    setShowCancel(false);
    setSelectedPost(null);
  }, [loadPosts]);

  const handleSelectAll = useCallback(() => {
    const scheduledPosts = filteredPosts.filter((p) => p.status === "scheduled");
    if (selectedIds.length === scheduledPosts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(scheduledPosts.map((p) => p.id));
    }
  }, [filteredPosts, selectedIds.length]);

  const handleSelectPost = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleBulkCancel = useCallback(async () => {
    if (selectedIds.length === 0) return;

    try {
      await cancelBatchSchedules(selectedIds);
      setToast({ message: `${selectedIds.length} schedules cancelled.`, type: "success" });
      setSelectedIds([]);
      setShowBulkCancel(false);
      loadPosts();
    } catch {
      setToast({ message: "Failed to cancel schedules", type: "error" });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  }, [selectedIds, loadPosts]);

  const statusGroups = useMemo(() => {
    const groups: Record<string, PublisherPost[]> = {
      scheduled: [],
      queued: [],
      uploading: [],
      processing: [],
      publishing: [],
    };

    filteredPosts.forEach((post) => {
      if (groups[post.status]) {
        groups[post.status].push(post);
      }
    });

    return groups;
  }, [filteredPosts]);

  const statusOrder = ["scheduled", "queued", "processing", "uploading", "publishing"];

  return (
    <div className="min-w-0 bg-transparent">
      <PageHeader
        eyebrow={getTitleInfo.eyebrow}
        title={getTitleInfo.title}
        description={getTitleInfo.subtitle}
        actions={
          <>
            <SchedulerStatusBadge status={schedulerStatus} />
            {selectedIds.length > 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-1.5 backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.16)]">
                <span className="px-2 text-[12px] font-medium text-slate-700">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setShowBulkCancel(true)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-[13px] font-medium text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
                >
                  Cancel Selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/20 bg-white/12 px-3 text-[13px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreateClick}
                disabled={activePlatform === "youtube" || activePlatform === "shopee"}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-xl px-4 text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(2,6,23,0.18)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  activePlatform === "youtube" || activePlatform === "shopee"
                    ? "bg-slate-400/80 cursor-not-allowed backdrop-blur-xl"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {getButtonLabel}
              </button>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-[1440px] space-y-4 bg-transparent px-4 py-5 sm:px-6 lg:px-8">
        {/* Platform Filter */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-white/8 p-1.5 backdrop-blur-xl w-fit shadow-[0_10px_30px_rgba(2,6,23,0.08)]">
          {PLATFORM_OPTIONS.map((option) => {
            const isActive = activePlatform === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActivePlatform(option.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all border",
                  isActive
                    ? option.id === "all"
                      ? "bg-white/20 border-white/25 text-slate-950 shadow-sm"
                      : "bg-blue-500/15 border-blue-400/40 text-slate-900 shadow-sm"
                    : "bg-transparent border-transparent text-slate-700 hover:bg-white/10 hover:text-slate-900"
                )}
              >
                {option.id !== "all" ? (
                  <PlatformLogo platform={option.logo} className="h-4 w-4" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-red-800">Failed to load schedules</p>
                <p className="text-[12px] text-red-700/80 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={loadPosts}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700 backdrop-blur-xl"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-2xl">
                <div className="mb-3 h-4 w-24 rounded bg-white/10" />
                <div className="mb-3 aspect-video rounded-xl bg-white/10" />
                <div className="h-3 w-full rounded bg-white/10" />
                <div className="mt-2 h-3 w-2/3 rounded bg-white/8" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredPosts.length === 0 && (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-10 text-center shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/20 backdrop-blur-xl">
              <Calendar className="h-5 w-5 text-slate-700" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-slate-950">
              No scheduled posts
            </h3>
            <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-5 text-slate-600">
              {activePlatform === "all"
                ? "Create your first scheduled post to see it here."
                : `No scheduled ${activePlatform} posts. Create one to get started.`
              }
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleCreateClick}
                disabled={activePlatform === "youtube" || activePlatform === "shopee"}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-xl px-4 text-[13px] font-semibold text-white shadow-sm transition-colors",
                  activePlatform === "youtube" || activePlatform === "shopee"
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {getButtonLabel}
              </button>
            </div>
          </div>
        )}

        {/* Posts List */}
        {!isLoading && !error && filteredPosts.length > 0 && (
          <div className="space-y-7 bg-transparent">
            {statusOrder.map((status) => {
              const groupPosts = statusGroups[status];
              if (!groupPosts || groupPosts.length === 0) return null;

              const statusLabels: Record<string, string> = {
                scheduled: "Scheduled",
                queued: "Queued",
                uploading: "Uploading",
                processing: "Processing",
                publishing: "Publishing",
              };

              const canSelect = status === "scheduled";
              const allInGroupSelected = canSelect && groupPosts.every((p) => selectedIds.includes(p.id));

              return (
                <div key={status} className="bg-transparent">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-xl">
                      {statusLabels[status]} ({groupPosts.length})
                    </h3>
                    {canSelect && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/15 hover:text-slate-900"
                      >
                        {allInGroupSelected ? (
                          <>
                            <CheckSquare className="h-3.5 w-3.5" />
                            Deselect all
                          </>
                        ) : (
                          <>
                            <Square className="h-3.5 w-3.5" />
                            Select all
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groupPosts.map((post) => {
                      const isSelected = selectedIds.includes(post.id);
                      const canSelectThis = status === "scheduled";

                      return (
                        <div
                          key={post.id}
                          role={canSelectThis ? "group" : undefined}
                          tabIndex={canSelectThis ? 0 : undefined}
                          aria-label={canSelectThis ? `${post.caption || "Scheduled post"}, ${isSelected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.` : undefined}
                          onClick={canSelectThis ? (event) => {
                            if (!isInteractiveSelectionTarget(event.target)) handleSelectPost(post.id);
                          } : undefined}
                          onKeyDown={canSelectThis ? (event) => {
                            if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
                              event.preventDefault();
                              handleSelectPost(post.id);
                            }
                          } : undefined}
                          className={cn(
                            "group relative overflow-hidden rounded-2xl border bg-white/10 p-4 text-left shadow-[0_14px_40px_rgba(2,6,23,0.14)] backdrop-blur-2xl ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/15 hover:shadow-[0_20px_55px_rgba(2,6,23,0.20)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                            canSelectThis && "cursor-pointer",
                            isSelected && "border-blue-400/60 ring-2 ring-blue-400/20"
                          )}
                        >
                          <CardActions
                            post={post}
                            onViewDetails={handleViewDetails}
                            onViewError={handleViewDetails}
                            onReschedule={handleReschedule}
                            onCancel={handleCancel}
                          />
                          <div className="flex items-start gap-2">
                            {canSelectThis ? (
                              <SelectionCheckbox
                                checked={isSelected}
                                onChange={() => handleSelectPost(post.id)}
                                ariaLabel={`${isSelected ? "Deselect" : "Select"} scheduled post`}
                                className="mt-0.5"
                              />
                            ) : (
                              <div className="w-5" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleViewDetails(post)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="mb-3 flex items-start justify-between gap-2 pr-8">
                                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-2 py-1 backdrop-blur-xl">
                                  <PlatformLogo
                                    platform={post.platform as "facebook" | "tiktok" | "youtube" | "shopee"}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-[11px] font-medium text-slate-700 capitalize">
                                    {post.platform}
                                  </span>
                                </div>
                                <StatusPill status={post.status} />
                              </div>

                              {post.media_asset && (
                                <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/10 backdrop-blur-xl">
                                  <div className="aspect-video w-full overflow-hidden">
                                    {post.media_asset.thumbnail_url ? (
                                      <ThumbnailImage src={post.media_asset.thumbnail_url} alt="" />
                                    ) : post.media_asset.content_url && post.media_asset.media_type === "video" ? (
                                      <video
                                        src={post.media_asset.content_url}
                                        className="h-full w-full object-cover"
                                        preload="metadata"
                                        muted
                                        playsInline
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center bg-slate-950/10">
                                        <div className="text-center">
                                          <Film className="h-8 w-8 text-white/20 mx-auto mb-1" />
                                          <span className="text-[10px] text-white/30">Thumbnail unavailable</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xl">
                                {(() => {
                                  const meaningfulCaption = getMeaningfulCaption(post.caption, post.media_asset);
                                  const mediaDisplayName = post.media_asset ? getMediaDisplayName(post.media_asset) : null;

                                  if (meaningfulCaption) {
                                    return (
                                      <p className="line-clamp-2 text-[12px] leading-5 text-slate-700" title={post.caption || ""}>
                                        {meaningfulCaption}
                                      </p>
                                    );
                                  }

                                  if (mediaDisplayName && mediaDisplayName !== "Scheduled video") {
                                    return (
                                      <p className="truncate text-[12px] font-medium text-slate-950" title={mediaDisplayName}>
                                        {mediaDisplayName}
                                      </p>
                                    );
                                  }

                                  return (
                                    <p className="text-[12px] text-slate-600">
                                      Scheduled video
                                    </p>
                                  );
                                })()}
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-2 py-1 backdrop-blur-xl">
                                  <AccountAvatar name={post.connected_account?.display_name || post.connected_account?.name || "Unknown"} src={post.connected_account?.avatar_url} />
                                  <span className="max-w-[110px] truncate text-[11px] font-medium text-slate-700" title={post.connected_account?.display_name}>
                                    {post.connected_account?.display_name || post.connected_account?.name || "Unknown"}
                                  </span>
                                </div>
                                {post.scheduled_at && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/12 bg-white/8 px-2 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-xl">
                                    <Clock className="h-3 w-3 text-slate-500" />
                                    {new Date(post.scheduled_at).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer Modal */}
      <SchedulerPlatformComposer
        open={showComposer.open}
        onClose={() => setShowComposer({ open: false, platform: "facebook" })}
        platform={showComposer.platform}
        accounts={accounts}
      />

      {/* Coming Soon Modal */}
      <SchedulerComingSoon
        open={showComingSoon.open}
        onClose={() => setShowComingSoon({ open: false, platform: "youtube" })}
        platform={showComingSoon.platform}
      />

      <ScheduleDetailModal
        open={!!selectedPost && !showReschedule && !showCancel}
        post={selectedPost}
        onClose={handleCloseDetails}
        loading={detailsLoading}
        preview={selectedPost?.media_asset?.thumbnail_url ? (
          <ThumbnailImage src={selectedPost.media_asset.thumbnail_url} alt="Scheduled media preview" />
        ) : undefined}
        onReschedule={selectedPost && (selectedPost.status === "scheduled" || selectedPost.status === "queued") ? () => handleReschedule(selectedPost) : undefined}
        onCancel={selectedPost && (selectedPost.status === "scheduled" || selectedPost.status === "queued") ? () => handleCancel(selectedPost) : undefined}
      />

      <RescheduleModal
        open={showReschedule}
        post={selectedPost}
        onClose={() => {
          setShowReschedule(false);
          setSelectedPost(null);
        }}
        onSuccess={handleRescheduleSuccess}
      />

      <CancelScheduleDialog
        open={showCancel}
        post={selectedPost}
        onClose={() => {
          setShowCancel(false);
          setSelectedPost(null);
        }}
        onSuccess={handleCancelSuccess}
      />

      {/* Bulk Cancel Confirmation */}
      {showBulkCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
            <h3 className="text-[15px] font-semibold text-white">
              Cancel {selectedIds.length} Schedule{selectedIds.length > 1 ? "s" : ""}?
            </h3>
            <p className="mt-2 text-[13px] text-white/70">
              This will cancel the selected scheduled posts. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkCancel(false)}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-xl hover:bg-white/15"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleBulkCancel}
                className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-rose-700"
              >
                Cancel {selectedIds.length} Schedule{selectedIds.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-[13px] font-medium text-white shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
          {toast.message}
        </div>
      )}
    </div>
  );
}
