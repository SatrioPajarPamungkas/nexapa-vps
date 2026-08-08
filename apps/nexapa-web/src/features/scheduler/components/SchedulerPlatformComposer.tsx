import { useCallback, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertCircle, ExternalLink, Clock, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ConnectedAccount } from "@/features/scheduler/scheduler.types";
import type { FacebookPostType, SchedulerUploadItem } from "../lib/upload-helpers";
import { FacebookSchedulerContentType } from "./FacebookSchedulerContentType";
import { SchedulerMediaUploader } from "./SchedulerMediaUploader";
import { getBrowserTimezone } from "../scheduler.utils";
import { createBatchSchedule } from "@/lib/api/scheduler";

type SchedulerDestination = {
  id: string;
  platform: string;
  accountType?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
  isPublishable?: boolean;
  isDefault?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  platform: "facebook" | "tiktok" | "youtube" | "shopee";
  accounts: ConnectedAccount[];
};

type TikTokSettings = {
  privacy: "public" | "friends" | "private";
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
};

type ScheduleTimeConfig = {
  startDate: string;
  startTime: string;
  timezone: string;
  interval: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

type ReviewItem = {
  platform: string;
  destination: string;
  filename: string;
  caption: string;
  scheduledTime: string;
  timezone: string;
  tiktokSettings?: TikTokSettings;
};

export function SchedulerPlatformComposer({ open, onClose, platform, accounts }: Props) {
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => prevFocusRef.current?.focus(), 0);
  }, [onClose]);

  const getTitle = () => {
    switch (platform) {
      case "facebook":
        return "Facebook Scheduler";
      case "tiktok":
        return "TikTok Scheduler";
      case "youtube":
        return "YouTube Scheduler";
      case "shopee":
        return "Shopee Scheduler";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="ml-auto h-full w-full max-w-[640px] overflow-hidden bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {getTitle()}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Create scheduled post for {platform}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {platform === "facebook" && (
            <FacebookComposerSection accounts={accounts} />
          )}
          {platform === "tiktok" && (
            <TikTokComposerSection accounts={accounts} />
          )}
          {platform === "youtube" && (
            <YouTubeComposerSection />
          )}
          {platform === "shopee" && (
            <ShopeeComposerSection />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg bg-slate-400 px-4 py-1.5 text-[12px] font-medium text-white cursor-not-allowed opacity-60"
            title="Upload functionality coming soon"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function parseIntervalToMinutes(interval: string): number {
  switch (interval) {
    case "5 minutes":
      return 5;
    case "10 minutes":
      return 10;
    case "15 minutes":
      return 15;
    case "30 minutes":
      return 30;
    case "1 hour":
      return 60;
    case "2 hours":
      return 120;
    default:
      return 5;
  }
}

function formatScheduleDateTime(date: Date, timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    const parts = fmt.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
      partMap[part.type] = part.value;
    }
    return `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute} ${timezone}`;
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ") + " " + timezone;
  }
}

function getMinimumDateTime(): { startDate: string; startTime: string } {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  const startDate = now.toISOString().slice(0, 10);
  const startTime = now.toTimeString().slice(0, 5);
  return { startDate, startTime };
}

function ScheduleTimeCard({
  scheduleTime,
  setScheduleTime,
  itemCount,
  platform,
}: {
  scheduleTime: ScheduleTimeConfig;
  setScheduleTime: React.Dispatch<React.SetStateAction<ScheduleTimeConfig>>;
  itemCount: number;
  platform: "facebook" | "tiktok";
}) {
  const minDateTime = getMinimumDateTime();

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScheduleTime((prev) => ({ ...prev, startDate: e.target.value }));
  }, [setScheduleTime]);

  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScheduleTime((prev) => ({ ...prev, startTime: e.target.value }));
  }, [setScheduleTime]);

  const handleTimezoneChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setScheduleTime((prev) => ({ ...prev, timezone: e.target.value }));
  }, [setScheduleTime]);

  const handleIntervalChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setScheduleTime((prev) => ({ ...prev, interval: e.target.value }));
  }, [setScheduleTime]);

  const getScheduleTime = (index: number): string => {
    if (!scheduleTime.startDate || !scheduleTime.startTime) return "";
    const [h, m] = scheduleTime.startTime.split(":").map(Number);
    const baseDate = new Date(`${scheduleTime.startDate}T00:00:00`);
    baseDate.setHours(h, m, 0, 0);

    const intervalMinutes = parseIntervalToMinutes(scheduleTime.interval);
    baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes * index);

    return formatScheduleDateTime(baseDate, scheduleTime.timezone);
  };

  const showInterval = platform === "tiktok" || (platform === "facebook" && itemCount > 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        <h4 className="text-[13px] font-semibold text-slate-900">Schedule Time</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={scheduleTime.startDate}
            onChange={handleStartDateChange}
            min={minDateTime.startDate}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Start Time
          </label>
          <input
            type="time"
            value={scheduleTime.startTime}
            onChange={handleStartTimeChange}
            min={scheduleTime.startDate === minDateTime.startDate ? minDateTime.startTime : undefined}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Timezone
        </label>
        <select
          value={scheduleTime.timezone}
          onChange={handleTimezoneChange}
          className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
        >
          <option value={scheduleTime.timezone}>{scheduleTime.timezone}</option>
          <option value="Asia/Jakarta">Asia/Jakarta</option>
          <option value="Asia/Makassar">Asia/Makassar</option>
          <option value="Asia/Jayapura">Asia/Jayapura</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Asia/Singapore">Asia/Singapore</option>
        </select>
      </div>

      {showInterval && itemCount > 1 && (
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Interval
          </label>
          <select
            value={scheduleTime.interval}
            onChange={handleIntervalChange}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="5 minutes">5 minutes</option>
            <option value="10 minutes">10 minutes</option>
            <option value="15 minutes">15 minutes</option>
            <option value="30 minutes">30 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="2 hours">2 hours</option>
          </select>
        </div>
      )}

      {itemCount > 0 && scheduleTime.startDate && scheduleTime.startTime && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Generated Schedule Preview
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Array.from({ length: Math.min(itemCount, 5) }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-600">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>Video {idx + 1}: {getScheduleTime(idx)}</span>
              </div>
            ))}
            {itemCount > 5 && (
              <p className="text-[10px] text-slate-400 italic">+ {itemCount - 5} more...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FacebookComposerSection({ accounts }: { accounts: ConnectedAccount[] }) {
  const navigate = useNavigate();
  const [postType, setPostType] = useState<FacebookPostType>("video");
  const [imageItems, setImageItems] = useState<SchedulerUploadItem[]>([]);
  const [videoItems, setVideoItems] = useState<SchedulerUploadItem[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<ScheduleTimeConfig>({
    startDate: "",
    startTime: "",
    timezone: getBrowserTimezone(),
    interval: "5 minutes",
  });
  const [view, setView] = useState<"compose" | "review">("compose");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const facebookAccounts = accounts.filter(
    (a) => a.platform === "facebook" && a.account_type === "facebook_page" && a.status === "connected" && a.is_publishable
  );

  const destinations: SchedulerDestination[] = facebookAccounts.map((a) => ({
    id: a.id,
    platform: a.platform,
    accountType: a.account_type,
    displayName: a.display_name || a.name || "Unnamed",
    avatarUrl: undefined,
    status: a.status,
    isPublishable: a.is_publishable,
    isDefault: a.is_default,
  }));

  useEffect(() => {
    const defaultDest = destinations.find((d) => d.isDefault);
    if (defaultDest) {
      setSelectedDestinationId(defaultDest.id);
    } else if (destinations.length > 0 && !selectedDestinationId) {
      setSelectedDestinationId(destinations[0].id);
    }
  }, [destinations]);

  useEffect(() => {
    setSelectedDestinationId("");
    setImageItems([]);
    setVideoItems([]);
    setCaption("");
    setView("compose");
  }, [postType]);

  const handleDestinationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDestinationId(e.target.value);
  }, []);

  const handleImageChange = useCallback((items: SchedulerUploadItem[]) => {
    setImageItems(items);
  }, []);

  const handleVideoChange = useCallback((items: SchedulerUploadItem[]) => {
    setVideoItems(items);
  }, []);

  const handleOpenAccounts = useCallback(() => {
    navigate("/accounts");
  }, [navigate]);

  const readyVideoItems = videoItems.filter((i) => i.status === "ready" && i.mediaAssetId);

  const updateVideoCaption = useCallback((id: string, value: string) => {
    setVideoItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, caption: value } : i))
    );
  }, []);

  const getScheduleTime = (index: number): string => {
    if (!scheduleTime.startDate || !scheduleTime.startTime) return "";
    const [h, m] = scheduleTime.startTime.split(":").map(Number);
    const baseDate = new Date(`${scheduleTime.startDate}T00:00:00`);
    baseDate.setHours(h, m, 0, 0);

    const intervalMinutes = parseIntervalToMinutes(scheduleTime.interval);
    baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes * index);

    return formatScheduleDateTime(baseDate, scheduleTime.timezone);
  };

  const getScheduleTimeISO = (index: number): string => {
    if (!scheduleTime.startDate || !scheduleTime.startTime) return "";
    const [h, m] = scheduleTime.startTime.split(":").map(Number);
    const baseDate = new Date(`${scheduleTime.startDate}T00:00:00`);
    baseDate.setHours(h, m, 0, 0);

    const intervalMinutes = parseIntervalToMinutes(scheduleTime.interval);
    baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes * index);

    const offset = baseDate.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offset / 60));
    const offsetMinutes = Math.abs(offset % 60);
    const offsetSign = offset <= 0 ? "+" : "-";
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

    const local = baseDate.toISOString().slice(0, 19);
    return `${local}${offsetStr}`;
  };

  const firstSchedule = getScheduleTime(0);
  const lastSchedule = readyVideoItems.length > 0 ? getScheduleTime(readyVideoItems.length - 1) : "";

  const handleReview = useCallback(() => {
    setView("review");
  }, []);

  const handleBack = useCallback(() => {
    setView("compose");
  }, []);

  const selectedDestination = destinations.find((d) => d.id === selectedDestinationId);

  const handleSubmitBatch = useCallback(async () => {
    if (!selectedDestinationId || readyVideoItems.length === 0) return;

    setSubmitState("submitting");
    setSubmitError(null);

    try {
      const items = readyVideoItems.map((item, index) => ({
        media_asset_id: item.mediaAssetId!,
        caption: item.caption || "",
        scheduled_at: getScheduleTimeISO(index),
        post_type: "video" as const,
        platform_settings: {
          post_type: "video",
        },
      }));

      await createBatchSchedule({
        platform: "facebook",
        connected_account_id: selectedDestinationId,
        timezone: scheduleTime.timezone,
        items,
      });

      setSubmitState("success");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("scheduler:batch-success", {
          detail: { count: readyVideoItems.length },
        }));
        setVideoItems([]);
        setCaption("");
        setView("compose");
        setSubmitState("idle");
      }, 500);
    } catch (err) {
      setSubmitState("error");
      setSubmitError(err instanceof Error ? err.message : "Failed to schedule videos");
    }
  }, [selectedDestinationId, readyVideoItems, scheduleTime.timezone, getScheduleTimeISO]);

  const scheduleDateTime = scheduleTime.startDate && scheduleTime.startTime
    ? new Date(`${scheduleTime.startDate}T${scheduleTime.startTime}`)
    : null;
  const isWithin5Minutes = scheduleDateTime
    ? scheduleDateTime.getTime() - Date.now() < 5 * 60 * 1000
    : true;

  const canSubmitVideo =
    selectedDestinationId &&
    readyVideoItems.length > 0 &&
    scheduleTime.startDate &&
    scheduleTime.startTime &&
    !isWithin5Minutes;

  if (view === "review") {
    const reviewItems: ReviewItem[] = [];
    if (postType === "video") {
      readyVideoItems.forEach((item, index) => {
        reviewItems.push({
          platform: "Facebook",
          destination: selectedDestination?.displayName || "",
          filename: item.name,
          caption: item.caption || "",
          scheduledTime: getScheduleTime(index),
          timezone: scheduleTime.timezone,
        });
      });
    } else if (postType === "image" && imageItems.length > 0 && imageItems[0].status === "ready") {
      reviewItems.push({
        platform: "Facebook",
        destination: selectedDestination?.displayName || "",
        filename: imageItems[0].name,
        caption: caption,
        scheduledTime: scheduleTime.startDate && scheduleTime.startTime ? `${scheduleTime.startDate} ${scheduleTime.startTime} ${scheduleTime.timezone}` : "",
        timezone: scheduleTime.timezone,
      });
    } else if (postType === "text") {
      reviewItems.push({
        platform: "Facebook",
        destination: selectedDestination?.displayName || "",
        filename: "Text Post",
        caption: caption,
        scheduledTime: scheduleTime.startDate && scheduleTime.startTime ? `${scheduleTime.startDate} ${scheduleTime.startTime} ${scheduleTime.timezone}` : "",
        timezone: scheduleTime.timezone,
      });
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-slate-900">Review Schedule</h3>
            <button
              type="button"
              onClick={handleBack}
              className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
            >
              Back
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Schedule Summary</p>
            <div className="space-y-1">
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Platform:</span> Facebook
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Destination:</span> {selectedDestination?.displayName}
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Post Type:</span> {postType.charAt(0).toUpperCase() + postType.slice(1)}
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Total Items:</span> {reviewItems.length}
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Timezone:</span> {scheduleTime.timezone}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Scheduled Items</p>
            {reviewItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-slate-700">
                    {idx + 1}. {item.filename}
                  </p>
                  <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
                    📘 Facebook
                  </span>
                </div>
                {item.caption && (
                  <p className="text-[11px] text-slate-600 line-clamp-2">{item.caption}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{item.scheduledTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          {postType === "video" ? (
            <>
              {submitState === "error" && submitError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-rose-700">{submitError}</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleSubmitBatch}
                disabled={!canSubmitVideo || submitState === "submitting"}
                className={cn(
                  "w-full rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-colors",
                  !canSubmitVideo || submitState === "submitting"
                    ? "bg-slate-400 cursor-not-allowed opacity-60"
                    : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {submitState === "submitting" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scheduling {readyVideoItems.length} videos...
                  </span>
                ) : (
                  `Schedule ${readyVideoItems.length} Videos`
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled
              className="w-full rounded-lg bg-slate-400 px-4 py-2 text-[13px] font-medium text-white cursor-not-allowed opacity-60"
              title="Text and image scheduling will be connected next"
            >
              Confirm Schedule
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Post Type */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Post Type
        </p>
        <FacebookSchedulerContentType
          value={postType}
          onChange={setPostType}
        />
      </div>

      {/* Destination */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Destination
        </label>
        {facebookAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-[13px] font-medium text-slate-700">
              No Facebook Pages available.
            </p>
            <p className="text-[12px] text-slate-500 mt-1">
              Connect or sync a Facebook Page first.
            </p>
            <button
              type="button"
              onClick={handleOpenAccounts}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Connected Accounts
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedDestinationId}
              onChange={handleDestinationChange}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.displayName}
                  {dest.isDefault ? " (Default)" : ""}
                </option>
              ))}
            </select>
            {destinations.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-semibold text-blue-700">
                  {destinations.find((d) => d.id === selectedDestinationId)?.displayName.charAt(0).toUpperCase() || "F"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-700 truncate">
                    {destinations.find((d) => d.id === selectedDestinationId)?.displayName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
                      <span>📘</span> Facebook Page
                    </span>
                    {destinations.find((d) => d.id === selectedDestinationId)?.isDefault && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <span className="inline-flex h-5 items-center rounded-full bg-emerald-100 px-2 text-[9px] font-medium text-emerald-700">
                  Connected
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text Post */}
      {postType === "text" && (
        <>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Post Message
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder="What's on your mind?"
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-5 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Text posts do not require media.
            </p>
          </div>
          <ScheduleTimeCard
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            itemCount={caption.trim() ? 1 : 0}
            platform="facebook"
          />
        </>
      )}

      {/* Image Post */}
      {postType === "image" && (
        <>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Upload Facebook Image
            </label>
            <SchedulerMediaUploader
              mode="image-single"
              onFilesChange={handleImageChange}
              accept="image/jpeg,image/png,image/webp"
              acceptLabel="JPG, JPEG, PNG, WebP"
              dropLabel="Click to upload image"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Write a caption for your image..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-5 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <ScheduleTimeCard
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            itemCount={imageItems.filter((i) => i.status === "ready").length}
            platform="facebook"
          />
        </>
      )}

      {/* Video Post */}
      {postType === "video" && (
        <>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Bulk Upload Facebook Videos
            </label>
            <SchedulerMediaUploader
              mode="video-multiple"
              onFilesChange={handleVideoChange}
              maxCount={50}
              accept="video/mp4,video/quicktime,video/webm"
              acceptLabel="MP4, MOV, WebM"
              dropLabel="Drag and drop videos here"
            />
          </div>

          {readyVideoItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Video Descriptions ({readyVideoItems.length})
              </p>
              {readyVideoItems.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-slate-700 truncate">
                      {index + 1}. {item.name}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {getScheduleTime(index)}
                    </span>
                  </div>
                  <textarea
                    value={item.caption || ""}
                    onChange={(e) => updateVideoCaption(item.id, e.target.value)}
                    rows={2}
                    placeholder="Write a description for this video..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] leading-4 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              ))}
            </div>
          )}

          <ScheduleTimeCard
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            itemCount={readyVideoItems.length}
            platform="facebook"
          />
        </>
      )}

      {/* Footer Actions */}
      <div className="border-t border-slate-100 pt-4">
        {postType === "video" && readyVideoItems.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-600">
                Ready videos: <span className="font-medium text-slate-900">{readyVideoItems.length}</span>
              </p>
              {firstSchedule && (
                <p className="text-[10px] text-slate-500">
                  First schedule: <span className="font-medium">{firstSchedule}</span>
                </p>
              )}
              {lastSchedule && lastSchedule !== firstSchedule && (
                <p className="text-[10px] text-slate-500">
                  Last schedule: <span className="font-medium">{lastSchedule}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleReview}
              className="rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Review {readyVideoItems.length} Videos
            </button>
          </div>
        )}
        {postType === "image" && imageItems.filter((i) => i.status === "ready").length > 0 && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-600">
                Ready images: <span className="font-medium text-slate-900">{imageItems.filter((i) => i.status === "ready").length}</span>
              </p>
              {scheduleTime.startDate && scheduleTime.startTime && (
                <p className="text-[10px] text-slate-500">
                  Schedule: <span className="font-medium">{scheduleTime.startDate} {scheduleTime.startTime} {scheduleTime.timezone}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleReview}
              className="rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Review Image
            </button>
          </div>
        )}
        {postType === "text" && caption.trim() && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-600">
                Text post ready
              </p>
              {scheduleTime.startDate && scheduleTime.startTime && (
                <p className="text-[10px] text-slate-500">
                  Schedule: <span className="font-medium">{scheduleTime.startDate} {scheduleTime.startTime} {scheduleTime.timezone}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleReview}
              className="rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Review Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TikTokComposerSection({ accounts }: { accounts: ConnectedAccount[] }) {
  const navigate = useNavigate();
  const [videoItems, setVideoItems] = useState<SchedulerUploadItem[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const [tiktokSettings, setTiktokSettings] = useState<TikTokSettings>({
    privacy: "public",
    allowComments: true,
    allowDuet: true,
    allowStitch: true,
  });
  const [scheduleTime, setScheduleTime] = useState<ScheduleTimeConfig>({
    startDate: "",
    startTime: "",
    timezone: getBrowserTimezone(),
    interval: "5 minutes",
  });
  const [view, setView] = useState<"compose" | "review">("compose");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tiktokAccounts = accounts.filter(
    (a) => a.platform === "tiktok" && a.status === "connected"
  );

  const destinations: SchedulerDestination[] = tiktokAccounts.map((a) => ({
    id: a.id,
    platform: a.platform,
    accountType: a.account_type,
    displayName: a.display_name || a.name || "Unnamed",
    avatarUrl: undefined,
    status: a.status,
    isPublishable: undefined,
    isDefault: a.is_default,
  }));

  useEffect(() => {
    const defaultDest = destinations.find((d) => d.isDefault);
    if (defaultDest) {
      setSelectedDestinationId(defaultDest.id);
    } else if (destinations.length > 0 && !selectedDestinationId) {
      setSelectedDestinationId(destinations[0].id);
    }
  }, [destinations]);

  useEffect(() => {
    setSelectedDestinationId("");
    setVideoItems([]);
    setView("compose");
  }, []);

  const handleDestinationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDestinationId(e.target.value);
  }, []);

  const handleVideoChange = useCallback((items: SchedulerUploadItem[]) => {
    setVideoItems(items);
  }, []);

  const handleOpenAccounts = useCallback(() => {
    navigate("/accounts");
  }, [navigate]);

  const readyVideoItems = videoItems.filter((i) => i.status === "ready" && i.mediaAssetId);

  const updateVideoCaption = useCallback((id: string, value: string) => {
    setVideoItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, caption: value } : i))
    );
  }, []);

  const getScheduleTime = (index: number): string => {
    if (!scheduleTime.startDate || !scheduleTime.startTime) return "";
    const [h, m] = scheduleTime.startTime.split(":").map(Number);
    const baseDate = new Date(`${scheduleTime.startDate}T00:00:00`);
    baseDate.setHours(h, m, 0, 0);

    const intervalMinutes = parseIntervalToMinutes(scheduleTime.interval);
    baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes * index);

    return formatScheduleDateTime(baseDate, scheduleTime.timezone);
  };

  const getScheduleTimeISO = (index: number): string => {
    if (!scheduleTime.startDate || !scheduleTime.startTime) return "";
    const [h, m] = scheduleTime.startTime.split(":").map(Number);
    const baseDate = new Date(`${scheduleTime.startDate}T00:00:00`);
    baseDate.setHours(h, m, 0, 0);

    const intervalMinutes = parseIntervalToMinutes(scheduleTime.interval);
    baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes * index);

    const offset = baseDate.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offset / 60));
    const offsetMinutes = Math.abs(offset % 60);
    const offsetSign = offset <= 0 ? "+" : "-";
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

    const local = baseDate.toISOString().slice(0, 19);
    return `${local}${offsetStr}`;
  };

  const firstSchedule = getScheduleTime(0);
  const lastSchedule = readyVideoItems.length > 0 ? getScheduleTime(readyVideoItems.length - 1) : "";

  const handleReview = useCallback(() => {
    setView("review");
  }, []);

  const handleBack = useCallback(() => {
    setView("compose");
  }, []);

  const selectedDestination = destinations.find((d) => d.id === selectedDestinationId);

  const handleSubmitBatch = useCallback(async () => {
    if (!selectedDestinationId || readyVideoItems.length === 0) return;

    setSubmitState("submitting");
    setSubmitError(null);

    try {
      const items = readyVideoItems.map((item, index) => ({
        media_asset_id: item.mediaAssetId!,
        caption: item.caption || "",
        scheduled_at: getScheduleTimeISO(index),
        post_type: "video" as const,
        platform_settings: {
          privacy_level: tiktokSettings.privacy,
          disable_comment: !tiktokSettings.allowComments,
          disable_duet: !tiktokSettings.allowDuet,
          disable_stitch: !tiktokSettings.allowStitch,
        },
      }));

      await createBatchSchedule({
        platform: "tiktok",
        connected_account_id: selectedDestinationId,
        timezone: scheduleTime.timezone,
        items,
      });

      setSubmitState("success");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("scheduler:batch-success", {
          detail: { count: readyVideoItems.length },
        }));
        setVideoItems([]);
        setView("compose");
        setSubmitState("idle");
      }, 500);
    } catch (err) {
      setSubmitState("error");
      setSubmitError(err instanceof Error ? err.message : "Failed to schedule videos");
    }
  }, [selectedDestinationId, readyVideoItems, scheduleTime.timezone, tiktokSettings, getScheduleTimeISO]);

  const scheduleDateTime = scheduleTime.startDate && scheduleTime.startTime
    ? new Date(`${scheduleTime.startDate}T${scheduleTime.startTime}`)
    : null;
  const isWithin5Minutes = scheduleDateTime
    ? scheduleDateTime.getTime() - Date.now() < 5 * 60 * 1000
    : true;

  const canSubmitVideo =
    selectedDestinationId &&
    readyVideoItems.length > 0 &&
    scheduleTime.startDate &&
    scheduleTime.startTime &&
    !isWithin5Minutes;

  if (view === "review") {
    const reviewItems: ReviewItem[] = [];
    readyVideoItems.forEach((item, index) => {
      reviewItems.push({
        platform: "TikTok",
        destination: selectedDestination?.displayName || "",
        filename: item.name,
        caption: item.caption || "",
        scheduledTime: getScheduleTime(index),
        timezone: scheduleTime.timezone,
        tiktokSettings,
      });
    });

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-slate-900">Review Schedule</h3>
            <button
              type="button"
              onClick={handleBack}
              className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
            >
              Back
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Schedule Summary</p>
            <div className="space-y-1">
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Platform:</span> TikTok
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Destination:</span> {selectedDestination?.displayName}
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Total Videos:</span> {reviewItems.length}
              </p>
              <p className="text-[12px] text-slate-700">
                <span className="font-medium">Timezone:</span> {scheduleTime.timezone}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">TikTok Settings</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Privacy:</span>
                <span className="font-medium text-slate-900 capitalize">{tiktokSettings.privacy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Comments:</span>
                <span className={`font-medium ${tiktokSettings.allowComments ? "text-emerald-600" : "text-slate-400"}`}>
                  {tiktokSettings.allowComments ? "Allowed" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Duet:</span>
                <span className={`font-medium ${tiktokSettings.allowDuet ? "text-emerald-600" : "text-slate-400"}`}>
                  {tiktokSettings.allowDuet ? "Allowed" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Stitch:</span>
                <span className={`font-medium ${tiktokSettings.allowStitch ? "text-emerald-600" : "text-slate-400"}`}>
                  {tiktokSettings.allowStitch ? "Allowed" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Scheduled Videos</p>
            {reviewItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-slate-700">
                    {idx + 1}. {item.filename}
                  </p>
                  <span className="inline-flex items-center rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white">
                    🎵 TikTok
                  </span>
                </div>
                {item.caption && (
                  <p className="text-[11px] text-slate-600 line-clamp-2">{item.caption}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{item.scheduledTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          {submitState === "error" && submitError && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-rose-700">{submitError}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmitBatch}
            disabled={!canSubmitVideo || submitState === "submitting"}
            className={cn(
              "w-full rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-colors",
              !canSubmitVideo || submitState === "submitting"
                ? "bg-slate-400 cursor-not-allowed opacity-60"
                : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {submitState === "submitting" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scheduling {readyVideoItems.length} videos...
              </span>
            ) : (
              `Schedule ${readyVideoItems.length} Videos`
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Destination */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Destination
        </label>
        {tiktokAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-[13px] font-medium text-slate-700">
              No TikTok accounts available.
            </p>
            <p className="text-[12px] text-slate-500 mt-1">
              Connect a TikTok account first.
            </p>
            <button
              type="button"
              onClick={handleOpenAccounts}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Connected Accounts
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedDestinationId}
              onChange={handleDestinationChange}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.displayName}
                  {dest.isDefault ? " (Default)" : ""}
                </option>
              ))}
            </select>
            {destinations.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-[11px] font-semibold text-white">
                  {destinations.find((d) => d.id === selectedDestinationId)?.displayName.charAt(0).toUpperCase() || "T"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-700 truncate">
                    {destinations.find((d) => d.id === selectedDestinationId)?.displayName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      <span>🎵</span> TikTok
                    </span>
                    {destinations.find((d) => d.id === selectedDestinationId)?.isDefault && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <span className="inline-flex h-5 items-center rounded-full bg-emerald-100 px-2 text-[9px] font-medium text-emerald-700">
                  Connected
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TikTok Settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-900">TikTok Settings</span>
          <span className="text-[10px] text-slate-500">(Apply to all videos)</span>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Privacy
          </label>
          <select
            value={tiktokSettings.privacy}
            onChange={(e) => setTiktokSettings((prev) => ({ ...prev, privacy: e.target.value as "public" | "friends" | "private" }))}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="public">Public</option>
            <option value="friends">Friends</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tiktokSettings.allowComments}
              onChange={(e) => setTiktokSettings((prev) => ({ ...prev, allowComments: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[12px] text-slate-700">Allow comments</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tiktokSettings.allowDuet}
              onChange={(e) => setTiktokSettings((prev) => ({ ...prev, allowDuet: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[12px] text-slate-700">Allow duet</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tiktokSettings.allowStitch}
              onChange={(e) => setTiktokSettings((prev) => ({ ...prev, allowStitch: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[12px] text-slate-700">Allow stitch</span>
          </label>
        </div>
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Bulk Upload TikTok Videos
        </label>
        <SchedulerMediaUploader
          mode="video-multiple"
          onFilesChange={handleVideoChange}
          maxCount={50}
          accept="video/mp4,video/quicktime,video/webm"
          acceptLabel="MP4, MOV, WebM"
          dropLabel="Drag and drop videos here"
        />
      </div>

      {readyVideoItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Captions ({readyVideoItems.length})
          </p>
          {readyVideoItems.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-slate-700 truncate">
                  {index + 1}. {item.name}
                </p>
                <span className="text-[10px] text-slate-500">
                  {getScheduleTime(index)}
                </span>
              </div>
              <textarea
                value={item.caption || ""}
                onChange={(e) => updateVideoCaption(item.id, e.target.value)}
                rows={2}
                placeholder="Write a caption for this video..."
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-[12px] leading-4 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          ))}
        </div>
      )}

      <ScheduleTimeCard
        scheduleTime={scheduleTime}
        setScheduleTime={setScheduleTime}
        itemCount={readyVideoItems.length}
        platform="tiktok"
      />

      {/* Footer Actions */}
      {readyVideoItems.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-600">
                Ready videos: <span className="font-medium text-slate-900">{readyVideoItems.length}</span>
              </p>
              {firstSchedule && (
                <p className="text-[10px] text-slate-500">
                  First schedule: <span className="font-medium">{firstSchedule}</span>
                </p>
              )}
              {lastSchedule && lastSchedule !== firstSchedule && (
                <p className="text-[10px] text-slate-500">
                  Last schedule: <span className="font-medium">{lastSchedule}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleReview}
              className="rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Review {readyVideoItems.length} Videos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function YouTubeComposerSection() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-2xl">▶️</span>
        <h3 className="text-[14px] font-semibold text-slate-900">YouTube Scheduler</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Coming Soon
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Video Upload
          </label>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="text-[12px] text-slate-400">Upload disabled</p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Thumbnail Upload
          </label>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="text-[12px] text-slate-400">Upload disabled</p>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-slate-500">
        YouTube scheduling adapter is not configured yet.
      </p>
    </div>
  );
}

function ShopeeComposerSection() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🛍️</span>
        <h3 className="text-[14px] font-semibold text-slate-900">Shopee Scheduler</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Coming Soon
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Product Video
          </label>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="text-[12px] text-slate-400">Upload disabled</p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Cover Image
          </label>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="text-[12px] text-slate-400">Upload disabled</p>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-slate-500">
        Shopee scheduling adapter is not configured yet.
      </p>
    </div>
  );
}
