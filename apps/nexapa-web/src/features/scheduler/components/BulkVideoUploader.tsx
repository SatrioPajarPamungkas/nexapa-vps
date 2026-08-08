import { useCallback, useState, useRef, useEffect } from "react";
import { Upload, X, AlertCircle, CheckCircle, Loader2, Film } from "lucide-react";
import { cn } from "@/lib/cn";
import { uploadMediaFile, type MediaAsset } from "@/lib/api/media-upload";

export type SchedulerMediaAsset = MediaAsset;

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
  onItemsChange: (items: UploadItem[]) => void;
  maxItems?: number;
  disabled?: boolean;
};

const MAX_ITEMS = 50;
const MAX_CONCURRENT_UPLOADS = 3;

export function BulkVideoUploader({ onItemsChange, maxItems = MAX_ITEMS, disabled = false }: Props) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const pendingItems = items.filter((i) => i.status === "pending" && uploadingCount < MAX_CONCURRENT_UPLOADS);

  useEffect(() => {
    onItemsChange(items);
  }, [items, onItemsChange]);

  useEffect(() => {
    if (pendingItems.length > 0 && uploadingCount < MAX_CONCURRENT_UPLOADS && !disabled) {
      pendingItems.forEach((item) => {
        handleUploadItem(item);
      });
    }
  }, [items, disabled]);

  const handleUploadItem = useCallback(async (item: UploadItem) => {
    const index = items.findIndex((i) => i.file === item.file);
    if (index === -1) return;

    setItems((prev) =>
      prev.map((i) => (i.file === item.file ? { ...i, status: "uploading", progress: 0 } : i))
    );

    try {
      const mediaAsset = await uploadMediaFile(item.file, "video", (progress) => {
        setItems((prev) =>
          prev.map((i) => (i.file === item.file ? { ...i, progress: progress.percent } : i))
        );
      });

      setItems((prev) =>
        prev.map((i) =>
          i.file === item.file ? { ...i, mediaAsset, status: "ready", progress: 100, error: null } : i
        )
      );
    } catch (error) {
      setItems((prev) =>
        prev.map((i) =>
          i.file === item.file
            ? { ...i, status: "failed", error: error instanceof Error ? error.message : "Upload failed" }
            : i
        )
      );
    }
  }, [items]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => {
        const validTypes = ["video/mp4", "video/mov", "video/webm"];
        return validTypes.includes(file.type);
      });

      const remainingSlots = maxItems - items.length;
      const filesToAdd = validFiles.slice(0, remainingSlots);

      if (validFiles.length > remainingSlots) {
        alert(`Maximum ${maxItems} videos allowed. ${remainingSlots} slot(s) remaining.`);
      }

      const newItems: UploadItem[] = filesToAdd.map((file) => ({
        file,
        mediaAsset: null,
        status: "pending",
        progress: 0,
        error: null,
        caption: "",
        scheduledAt: null,
      }));

      setItems((prev) => [...prev, ...newItems]);
    },
    [items.length, maxItems]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, disabled]
  );

  const handleSelectFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleRemoveItem = useCallback((file: File) => {
    setItems((prev) => prev.filter((i) => i.file !== file));
  }, []);

  const handleRetryFailed = useCallback(() => {
    setItems((prev) =>
      prev.map((i) => (i.status === "failed" ? { ...i, status: "pending", progress: 0, error: null } : i))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setItems([]);
  }, []);

  const handleCaptionChange = useCallback((file: File, caption: string) => {
    setItems((prev) => prev.map((i) => (i.file === file ? { ...i, caption } : i)));
  }, []);

  const readyCount = items.filter((i) => i.status === "ready").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const uploadingCount2 = items.filter((i) => i.status === "uploading").length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : disabled
            ? "border-slate-200 bg-slate-50 cursor-not-allowed"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mov,video/webm"
          multiple
          onChange={handleSelectFiles}
          className="hidden"
          disabled={disabled}
        />
        <Upload className={cn("h-10 w-10 mb-3", disabled ? "text-slate-400" : "text-slate-500")} />
        <p className="text-[13px] font-medium text-slate-700">
          {disabled ? "Upload disabled" : "Drag and drop videos here"}
        </p>
        <p className="text-[12px] text-slate-500 mt-1">
          MP4, MOV, WebM up to {maxItems} videos
        </p>
        {items.length > 0 && (
          <p className="text-[11px] text-slate-500 mt-2">
            {items.length} / {maxItems} videos
          </p>
        )}
      </div>

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-slate-600">
            <span className="font-medium">{readyCount}</span> ready
            {uploadingCount2 > 0 && (
              <span className="ml-2">
                <span className="font-medium">{uploadingCount2}</span> uploading
              </span>
            )}
            {failedCount > 0 && (
              <span className="ml-2">
                <span className="font-medium">{failedCount}</span> failed
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {failedCount > 0 && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                Retry Failed
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-700"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Video List */}
      {items.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={item.file.name + index}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              {/* Thumbnail/Icon */}
              <div className="relative h-16 w-24 rounded bg-slate-100 flex items-center justify-center shrink-0">
                {item.status === "uploading" ? (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                ) : item.status === "failed" ? (
                  <AlertCircle className="h-6 w-6 text-rose-500" />
                ) : item.status === "ready" ? (
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                ) : (
                  <Film className="h-6 w-6 text-slate-400" />
                )}
                {item.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded text-[10px] font-medium text-white">
                    {item.progress}%
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-medium text-slate-700 truncate">
                    {index + 1}. {item.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.file)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </p>

                {/* Caption */}
                <input
                  type="text"
                  value={item.caption}
                  onChange={(e) => handleCaptionChange(item.file, e.target.value)}
                  placeholder="Add caption..."
                  disabled={item.status !== "ready"}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                />

                {/* Scheduled Time */}
                {item.scheduledAt && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                  </p>
                )}

                {/* Error */}
                {item.error && (
                  <p className="text-[10px] text-rose-600 mt-1">{item.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
