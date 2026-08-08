import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { X, AlertCircle, Calendar, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ConnectedAccount } from "@/features/scheduler/scheduler.types";
import { BulkVideoUploader, type SchedulerMediaAsset } from "./BulkVideoUploader";
import { createBatchSchedule } from "@/lib/api/scheduler";

type UploadItem = {
  file: File;
  mediaAsset: SchedulerMediaAsset | null;
  status: "pending" | "uploading" | "ready" | "failed";
  progress: number;
  error: string | null;
  caption: string;
  scheduledAt: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: ConnectedAccount[];
  onSuccess: (count: number) => void;
};

const INTERVAL_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

export function FacebookBulkScheduleComposer({ open, onClose, accounts, onSuccess }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, setTimezone] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
  );
  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  const prevFocusRef = useRef<HTMLElement | null>(null);

  const facebookAccounts = useMemo(
    () => accounts.filter((a) => a.platform === "facebook" && a.status === "connected" && a.is_publishable && a.account_type === "facebook_page"),
    [accounts]
  );

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setScheduledTime("10:00");

      if (facebookAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(facebookAccounts[0].id);
      }
    }
  }, [open, facebookAccounts, selectedAccountId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = useCallback(() => {
    setSelectedAccountId("");
    setScheduledDate("");
    setScheduledTime("");
    setIsSubmitting(false);
    setError(null);
    setUploadItems([]);
    onClose();
    setTimeout(() => prevFocusRef.current?.focus(), 0);
  }, [onClose]);

  const handleItemsChange = useCallback((items: UploadItem[]) => {
    setUploadItems(items);
  }, []);

  const readyItems = useMemo(() => uploadItems.filter((i): i is UploadItem & { mediaAsset: SchedulerMediaAsset } => i.status === "ready" && Boolean(i.mediaAsset?.id)), [uploadItems]);
  const failedItems = useMemo(() => uploadItems.filter((i) => i.status === "failed"), [uploadItems]);

  const generateScheduleTimes = useCallback(() => {
    if (!scheduledDate || !scheduledTime) return [];

    const startDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const now = new Date();
    const minStartTime = new Date(now.getTime() + 5 * 60 * 1000);

    if (startDateTime < minStartTime) {
      setError("Start time must be at least 5 minutes in the future");
      return [];
    }

    return readyItems.map((item, index) => {
      const scheduledAt = new Date(startDateTime.getTime() + index * intervalMinutes * 60 * 1000);
      return {
        ...item,
        scheduledAt: scheduledAt.toISOString(),
      };
    });
  }, [scheduledDate, scheduledTime, readyItems, intervalMinutes]);

  const scheduledItems = useMemo(() => generateScheduleTimes(), [generateScheduleTimes]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAccountId) {
      setError("Please select a Facebook Page");
      return;
    }

    if (scheduledItems.length === 0) {
      setError("No videos ready for scheduling");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const items = scheduledItems.map((item) => ({
        media_asset_id: item.mediaAsset.id,
        caption: item.caption || "",
        scheduled_at: item.scheduledAt,
        post_type: "video" as const,
        platform_settings: {
          post_type: "video",
        },
      }));

      const result = await createBatchSchedule({
        platform: "facebook",
        connected_account_id: selectedAccountId,
        timezone,
        items,
      });

      onSuccess(result.created_count);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAccountId, scheduledItems, timezone, onSuccess, handleClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900">Facebook Video Scheduler</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Schedule up to 50 videos with sequential timing</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Left Panel - Settings */}
          <div className="w-80 border-r border-slate-200 p-5 overflow-y-auto">
            <div className="space-y-5">
              {/* Destination */}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                  Facebook Page
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select a Page</option>
                  {facebookAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.display_name || account.name || "Unnamed Account"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                  Start Date & Time
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                </select>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                  <Settings className="inline h-3.5 w-3.5 mr-1" />
                  Interval Between Videos
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-600 mb-1">Schedule Preview</p>
                <p className="text-[10px] text-slate-500">
                  {readyItems.length} videos will be scheduled
                </p>
                {scheduledDate && scheduledTime && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Starting: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Upload */}
          <div className="flex-1 p-5 overflow-y-auto">
            <BulkVideoUploader onItemsChange={handleItemsChange} disabled={isSubmitting} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-[12px] text-slate-600">
            <span className="font-medium text-emerald-600">{readyItems.length}</span> ready
            {failedItems.length > 0 && (
              <span className="ml-2">
                <span className="font-medium text-rose-600">{failedItems.length}</span> failed
              </span>
            )}
            <span className="ml-2">
              <span className="font-medium">{uploadItems.length}</span> total
            </span>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2 text-[11px] text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || readyItems.length === 0}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-colors",
                isSubmitting || readyItems.length === 0
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isSubmitting ? "Scheduling..." : `Schedule ${readyItems.length} Videos`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
