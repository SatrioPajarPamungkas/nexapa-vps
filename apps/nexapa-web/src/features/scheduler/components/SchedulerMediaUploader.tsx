import { useCallback, useState, useRef, useEffect } from "react";
import { Upload, X, AlertCircle, Film, Image as ImageIcon, CheckCircle, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SchedulerUploadItem } from "../lib/upload-helpers";
import { generateUploadItemId, formatFileSize, isVideoFile, validateImageFile, getExpectedMediaKind } from "../lib/upload-helpers";
import { uploadMediaFile, type MediaAsset, type MediaUploadProgress } from "@/lib/api/media-upload";

type UploadMode = "image-single" | "video-multiple";

const MAX_CONCURRENT_UPLOADS = 3;

type Props = {
  mode: UploadMode;
  onFilesChange: (items: SchedulerUploadItem[]) => void;
  maxCount?: number;
  disabled?: boolean;
  accept?: string;
  dropLabel?: string;
  acceptLabel?: string;
};

export function SchedulerMediaUploader({
  mode,
  onFilesChange,
  maxCount = 1,
  disabled = false,
  accept,
  dropLabel,
  acceptLabel,
}: Props) {
  const [items, setItems] = useState<SchedulerUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const uploadingCountRef = useRef(0);

  useEffect(() => {
    onFilesChange(items);
  }, [items, onFilesChange]);

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach((controller) => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, []);

  const startUpload = useCallback(async (item: SchedulerUploadItem) => {
    const expectedMediaKind = getExpectedMediaKind(mode);
    const controller = new AbortController();
    abortControllersRef.current.set(item.id, controller);
    uploadingCountRef.current += 1;

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, status: "uploading", progress: 0, error: undefined }
          : i
      )
    );

    try {
      const asset: MediaAsset = await uploadMediaFile(
        item.file,
        expectedMediaKind,
        (progress: MediaUploadProgress) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, progress: progress.percent } : i
            )
          );
        },
        controller.signal
      );

      if (!asset.id) {
        throw new Error("Server returned an invalid media response.");
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "ready", progress: 100, mediaAssetId: asset.id }
            : i
        )
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "failed", error: err instanceof Error ? err.message : "Upload failed" }
            : i
        )
      );
    } finally {
      abortControllersRef.current.delete(item.id);
      uploadingCountRef.current -= 1;
      processQueue();
    }
  }, [mode]);

  const processQueue = useCallback(() => {
    setItems((prev) => {
      const waitingItems = prev.filter(
        (i) => i.status === "local" && !abortControllersRef.current.has(i.id)
      );
      const availableSlots = MAX_CONCURRENT_UPLOADS - uploadingCountRef.current;

      if (availableSlots <= 0 || waitingItems.length === 0) {
        return prev;
      }

      const toUpload = waitingItems.slice(0, availableSlots);
      toUpload.forEach((item) => {
        void startUpload(item);
      });

      return prev;
    });
  }, [startUpload]);

  useEffect(() => {
    processQueue();
  }, [items, processQueue]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      setError(null);

      if (mode === "image-single") {
        const file = fileArray[0];
        if (!file) return;

        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        const newItem: SchedulerUploadItem = {
          id: generateUploadItemId(),
          file,
          name: file.name,
          size: file.size,
          status: "local",
          progress: 0,
        };
        setItems([newItem]);
      } else {
        const validFiles = fileArray.filter((f) => isVideoFile(f));
        const remainingSlots = maxCount - items.length;
        const filesToAdd = validFiles.slice(0, remainingSlots);

        if (validFiles.length > remainingSlots) {
          setError("Maximum 50 videos per batch.");
        }

        const newItems: SchedulerUploadItem[] = filesToAdd.map((file) => ({
          id: generateUploadItemId(),
          file,
          name: file.name,
          size: file.size,
          status: "local",
          progress: 0,
        }));

        setItems((prev) => [...prev, ...newItems]);
      }
    },
    [items.length, maxCount, mode]
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

  const handleRemoveItem = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
      uploadingCountRef.current -= 1;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleRetryItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "local", error: undefined, progress: 0 } : i
      )
    );
  }, []);

  const handleRetryAllFailed = useCallback(() => {
    setItems((prev) =>
      prev.map((i) =>
        i.status === "failed" ? { ...i, status: "local", error: undefined, progress: 0 } : i
      )
    );
  }, []);

  const handleClearAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    uploadingCountRef.current = 0;
    setItems([]);
    setError(null);
  }, []);

  const handleRemoveSingle = useCallback(() => {
    const controller = abortControllersRef.current.get(items[0]?.id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(items[0].id);
      uploadingCountRef.current -= 1;
    }
    setItems([]);
    setError(null);
  }, [items]);

  const isMultiple = mode === "video-multiple";

  const readyCount = items.filter((i) => i.status === "ready").length;
  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const getStatusIcon = (item: SchedulerUploadItem) => {
    if (item.status === "ready") {
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    }
    if (item.status === "uploading") {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
    if (item.status === "failed") {
      return <AlertCircle className="h-4 w-4 text-rose-600" />;
    }
    return null;
  };

  const getStatusLabel = (item: SchedulerUploadItem) => {
    if (item.status === "ready") return "Ready";
    if (item.status === "uploading") return `${item.progress}%`;
    if (item.status === "failed") return "Failed";
    return "Local";
  };

  const getStatusColor = (item: SchedulerUploadItem) => {
    if (item.status === "ready") return "text-emerald-600";
    if (item.status === "uploading") return "text-blue-600";
    if (item.status === "failed") return "text-rose-600";
    return "text-slate-500";
  };

  return (
    <div className="space-y-3 bg-transparent">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 backdrop-blur-xl">
          <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-800">{error}</p>
        </div>
      )}

      {isMultiple && items.length === 0 ? (
        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => !disabled && fileInputRef.current?.click()} className={cn("flex flex-col items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-xl p-8 transition-all", isDragging ? "border-blue-400/55 bg-white/15" : disabled ? "border-white/10 bg-white/5 cursor-not-allowed" : "border-white/20 bg-white/8 hover:border-blue-400/55 hover:bg-white/12 cursor-pointer")}>
          <input ref={fileInputRef} type="file" accept={accept || "video/*"} multiple={isMultiple} onChange={handleSelectFiles} className="hidden" disabled={disabled} />
          <Film className={cn("h-10 w-10 mb-3 rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl", disabled ? "text-slate-400" : "text-slate-600")} />
          <p className="text-[13px] font-medium text-slate-900">{dropLabel || "Drag and drop videos here"}</p>
          <p className="text-[12px] text-slate-600 mt-1">{acceptLabel || "MP4, MOV, WebM"} {maxCount > 1 && `up to ${maxCount} videos`}</p>
        </div>
      ) : !isMultiple && items.length > 0 ? (
        <div className="rounded-xl border border-white/15 bg-white/8 p-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 rounded-xl border border-white/15 bg-slate-950/15 flex items-center justify-center shrink-0"><ImageIcon className="h-8 w-8 text-white/40" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-800 truncate">{items[0].name}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{formatFileSize(items[0].size)}</p>
              <div className="flex items-center gap-2 mt-1">{getStatusIcon(items[0])}<p className={cn("text-[10px] font-medium rounded-full border px-1.5 py-0.5 backdrop-blur-xl", getStatusColor(items[0]) === "text-emerald-600" ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-800" : getStatusColor(items[0]) === "text-blue-600" ? "border-blue-400/25 bg-blue-500/12 text-blue-800" : getStatusColor(items[0]) === "text-rose-600" ? "border-red-400/25 bg-red-500/10 text-red-800" : "border-white/15 bg-white/8 text-slate-600")}>{getStatusLabel(items[0])}{items[0].status === "uploading" && ` • ${items[0].progress}%`}</p></div>
              {items[0].status === "uploading" && <div className="mt-2 h-1.5 w-full rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${items[0].progress}%` }} /></div>}
            </div>
            <button type="button" onClick={handleRemoveSingle} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-500 backdrop-blur-xl hover:bg-white/15"><X className="h-4 w-4" /></button>
          </div>
          {items[0].status === "failed" && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 backdrop-blur-xl"><p className="text-[11px] text-red-800">{items[0].error || "Upload failed"}</p><button type="button" onClick={() => handleRetryItem(items[0].id)} className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 bg-white/12 px-2 py-1 text-[10px] font-medium text-red-800 backdrop-blur-xl hover:bg-red-500/15"><RefreshCw className="h-3 w-3" /> Retry</button></div>}
        </div>
      ) : (
        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => !disabled && fileInputRef.current?.click()} className={cn("flex flex-col items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-xl p-8 transition-all", isDragging ? "border-blue-400/55 bg-white/15" : disabled ? "border-white/10 bg-white/5 cursor-not-allowed" : "border-white/20 bg-white/8 hover:border-blue-400/55 hover:bg-white/12 cursor-pointer")}>
          <input ref={fileInputRef} type="file" accept={accept || "video/*"} multiple={isMultiple} onChange={handleSelectFiles} className="hidden" disabled={disabled} />
          <Upload className={cn("h-10 w-10 mb-3 rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl", disabled ? "text-slate-400" : "text-slate-600")} />
          <p className="text-[13px] font-medium text-slate-900">{dropLabel || "Click to upload"}</p>
          <p className="text-[12px] text-slate-600 mt-1">{acceptLabel || "Select files"} {maxCount > 1 && `(max ${maxCount})`}</p>
        </div>
      )}

      {isMultiple && items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <p className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[12px] text-slate-700 backdrop-blur-xl"><span className="font-medium">{items.length}</span> / {maxCount} videos</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl">
                <span className="text-[10px] text-slate-700">Ready: <span className="font-medium text-emerald-700">{readyCount}</span></span>
                <span className="text-[10px] text-slate-700">Uploading: <span className="font-medium text-blue-700">{uploadingCount}</span></span>
                <span className="text-[10px] text-slate-700">Failed: <span className="font-medium text-red-700">{failedCount}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {failedCount > 0 && <button type="button" onClick={handleRetryAllFailed} className="inline-flex items-center gap-1 rounded-xl border border-blue-400/25 bg-blue-500/12 px-2 py-1 text-[11px] font-medium text-blue-800 backdrop-blur-xl hover:bg-blue-500/18"><RefreshCw className="h-3 w-3" /> Retry all failed</button>}
              <button type="button" onClick={handleClearAll} className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/8 px-2 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/12"><Trash2 className="h-3 w-3" /> Clear all</button>
            </div>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <div className="h-12 w-16 rounded-lg border border-white/10 bg-slate-950/15 flex items-center justify-center shrink-0"><Film className="h-5 w-5 text-white/40" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-800 truncate">{index + 1}. {item.name}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{formatFileSize(item.size)}</p>
                  <div className="flex items-center gap-2 mt-1">{getStatusIcon(item)}<p className={cn("text-[10px] font-medium rounded-full border px-1.5 py-0.5 backdrop-blur-xl", getStatusColor(item) === "text-emerald-600" ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-800" : getStatusColor(item) === "text-blue-600" ? "border-blue-400/25 bg-blue-500/12 text-blue-800" : getStatusColor(item) === "text-rose-600" ? "border-red-400/25 bg-red-500/10 text-red-800" : "border-white/15 bg-white/8 text-slate-600")}>{getStatusLabel(item)}{item.status === "uploading" && ` • ${item.progress}%`}</p></div>
                  {item.status === "uploading" && <div className="mt-1.5 h-1 w-full rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} /></div>}
                  {item.status === "failed" && <div className="mt-2 flex items-center gap-2"><p className="text-[10px] text-red-700">{item.error || "Upload failed"}</p><button type="button" onClick={() => handleRetryItem(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 bg-white/12 px-1.5 py-0.5 text-[9px] font-medium text-red-800 backdrop-blur-xl hover:bg-red-500/15"><RefreshCw className="h-2.5 w-2.5" /> Retry</button></div>}
                </div>
                <button type="button" onClick={() => handleRemoveItem(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-500 backdrop-blur-xl hover:bg-white/15"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
