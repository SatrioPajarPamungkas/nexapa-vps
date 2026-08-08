import { useCallback, useEffect, useRef, useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { UploadQueueItem } from "@/lib/api/media-upload-queue";
import { createUploadQueue } from "@/lib/api/media-upload-queue";
import { cn } from "@/lib/cn";

type BulkUploadModalProps = {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (uploadedCount: number) => void;
  initialFiles?: File[];
};

const MAX_FILES = 50;

export function BulkUploadModal({ open, onClose, onUploadComplete, initialFiles }: BulkUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<ReturnType<typeof createUploadQueue> | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasPreloadedInitialFiles, setHasPreloadedInitialFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFiles = "video/mp4,video/quicktime,video/webm";

  const validateFiles = useCallback((fileList: FileList | File[]): File[] => {
    const validFiles: File[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("video/")) {
        continue;
      }

      if (validFiles.length >= MAX_FILES) {
        break;
      }

      validFiles.push(file);
    }

    return validFiles;
  }, []);

  // Preload initial files when modal opens or initialFiles changes
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0 && !hasPreloadedInitialFiles) {
      const validFiles = validateFiles(initialFiles);
      setFiles((prev) => {
        const combined = [...prev, ...validFiles];
        return combined.slice(0, MAX_FILES);
      });
      setHasPreloadedInitialFiles(true);
    }
  }, [open, initialFiles, validateFiles, hasPreloadedInitialFiles]);

  // Reset preload flag when modal closes
  useEffect(() => {
    if (!open) {
      setHasPreloadedInitialFiles(false);
    }
  }, [open]);

  const handleFilesSelected = useCallback((selectedFiles: FileList | File[]) => {
    const validFiles = validateFiles(selectedFiles);
    setFiles((prev) => {
      const combined = [...prev, ...validFiles];
      return combined.slice(0, MAX_FILES);
    });
  }, [validateFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    e.target.value = "";
  }, [handleFilesSelected]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const startUpload = useCallback(() => {
    if (files.length === 0) return;

    const uploadQueue = createUploadQueue(
      files,
      { concurrency: 3, expectedMediaKind: "video" },
      {
        onStatusChange: (items) => {
          setUploadItems([...items]);
        },
        onAllComplete: (items) => {
          setIsUploading(false);
          const successCount = items.filter((i) => i.status === "completed").length;
          if (successCount > 0) {
            onUploadComplete(successCount);
          }
        },
      }
    );

    setQueue(uploadQueue);
    setUploadItems(uploadQueue.getItems());
    setIsUploading(true);
    uploadQueue.start();
  }, [files, onUploadComplete]);

  const handleRetry = useCallback(() => {
    if (!queue) return;
    setIsUploading(true);
    queue.retryFailed();
  }, [queue]);

  const handleClose = useCallback(() => {
    if (isUploading && queue) {
      queue.cancel();
    }
    setFiles([]);
    setUploadItems([]);
    setQueue(null);
    setIsUploading(false);
    onClose();
  }, [isUploading, queue, onClose]);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setUploadItems([]);
      setQueue(null);
      setIsUploading(false);
    }
  }, [open]);

  if (!open) return null;

  const hasFailures = uploadItems.some((item) => item.status === "failed");
  const completedCount = uploadItems.filter((item) => item.status === "completed").length;
  const uploadingCount = uploadItems.filter((item) => item.status === "uploading").length;
  const queuedCount = uploadItems.filter((item) => item.status === "queued").length;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="relative flex h-[min(80vh,720px)] w-[calc(100vw-32px)] max-w-[700px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75 shadow-[0_25px_80px_rgba(2,6,23,0.40)] backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-[16px] font-semibold text-white">
                Upload Videos
              </h2>
              <p className="mt-0.5 text-[11px] text-white/70">
                {files.length > 0
                  ? `${files.length} video${files.length !== 1 ? "s" : ""} selected (max ${MAX_FILES})`
                  : "Upload up to 50 videos at once"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
              aria-label="Close dialog"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {!isUploading && files.length === 0 && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 backdrop-blur-xl transition-all",
                  isDragging
                    ? "border-blue-400/60 bg-white/15 ring-2 ring-blue-400/15"
                    : "border-white/25 bg-white/8 hover:bg-white/15"
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/20 backdrop-blur-xl shadow-sm">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-white">
                  Drag and drop videos here
                </h3>
                <p className="mt-1 text-center text-[12px] text-white/70">
                  or click to browse
                </p>
                <p className="mt-2 text-center text-[11px] text-white/50">
                  MP4, MOV, WebP • Max 50 videos
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
                >
                  Select Videos
                </button>
              </div>
            )}

            {!isUploading && files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-white/15 bg-white/8 px-3 py-2 backdrop-blur-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-white">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-white/60">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/50 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploading && uploadItems.length > 0 && (
              <div className="space-y-2">
                {uploadItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-3 backdrop-blur-xl transition",
                      item.status === "failed"
                        ? "border-red-400/25 bg-red-500/10"
                        : item.status === "completed"
                        ? "border-emerald-400/25 bg-emerald-500/10"
                        : "border-white/15 bg-white/8"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-white">
                          {item.file.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {item.status === "queued" && (
                            <span className="text-[10px] text-white/60">Queued</span>
                          )}
                          {item.status === "uploading" && (
                            <span className="flex items-center gap-1 text-[10px] text-blue-300">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {item.progress}%
                            </span>
                          )}
                          {item.status === "completed" && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                          {item.status === "failed" && (
                            <span className="flex items-center gap-1 text-[10px] text-rose-300">
                              <AlertCircle className="h-3 w-3" />
                              {item.error}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.status === "completed" && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      )}
                      {item.status === "failed" && (
                        <AlertCircle className="h-5 w-5 text-rose-400" />
                      )}
                    </div>
                    {item.status === "uploading" && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
            <div className="text-[11px] text-white/60">
              {!isUploading && files.length > 0 && (
                <span>
                  {files.length} video{files.length !== 1 ? "s" : ""} ready to upload
                </span>
              )}
              {isUploading && (
                <span className="flex items-center gap-2">
                  {completedCount > 0 && (
                    <span className="text-emerald-300">{completedCount} completed</span>
                  )}
                  {uploadingCount > 0 && (
                    <span className="text-blue-300">{uploadingCount} uploading</span>
                  )}
                  {queuedCount > 0 && (
                    <span className="text-white/60">{queuedCount} queued</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isUploading && files.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/15"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={startUpload}
                    disabled={files.length === 0}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    Upload {files.length > 0 ? `(${files.length})` : ""}
                  </button>
                </>
              )}
              {isUploading && hasFailures && queue?.isComplete() && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/15"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Failed
                </button>
              )}
              {isUploading && !hasFailures && !queue?.isComplete() && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/80 backdrop-blur-xl transition hover:bg-white/15"
                >
                  Cancel
                </button>
              )}
              {isUploading && queue?.isComplete() && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(37,99,235,0.28)] hover:bg-blue-700"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        id="bulk-video-upload"
        type="file"
        accept={acceptedFiles}
        multiple
        className="sr-only"
        onChange={handleFileInput}
      />
    </>
  );
}
