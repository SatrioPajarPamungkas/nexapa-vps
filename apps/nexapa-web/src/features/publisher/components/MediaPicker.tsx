import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon, Video, X, Replace, Library } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LocalMediaAsset, PublisherMediaKind } from "../publisher.types";
import { formatFileSize, formatDimensions, formatDuration } from "../publisher.utils";
import type { MediaUploadState } from "../hooks/usePublisherWorkspaceWithBackend";
import type { MediaAsset } from "@/lib/api/media-upload";

type Props = {
  media: LocalMediaAsset | null;
  uploadedAsset: MediaAsset | null;
  onFiles: (files: FileList | File[]) => Promise<{ added: boolean; reason?: string }>;
  onClear: () => void;
  onOpenLibrary: () => void;
  uploadState: MediaUploadState;
  uploadError: string | null;
  onRetry: () => void;
  expectedMediaKind: PublisherMediaKind;
};

const ACCEPT_BY_MEDIA_KIND: Record<PublisherMediaKind, string> = {
  image: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
  video: ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm",
};

export function MediaPicker({ media, uploadedAsset, onFiles, onClear, onOpenLibrary, uploadState, uploadError, onRetry, expectedMediaKind }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const isUploading = uploadState === "uploading";

  const openFilePicker = useCallback(() => {
    if (isUploading || !fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }, [isUploading]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError("");
      const result = await onFiles(files);
      if (!result.added) {
        setError(result.reason ?? "Unable to add media");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (isUploading) return;
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles, isUploading],
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  }, [openFilePicker]);

  return (
    <div className="space-y-3 bg-transparent">
      <div className="flex items-center justify-between bg-transparent">
        <h3 className="text-[13px] font-semibold text-slate-900">Media</h3>
        {media && <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[11px] text-slate-500 backdrop-blur-xl">{formatFileSize(uploadedAsset?.size_bytes ?? media.fileSize)} &middot; {media.mimeType}</span>}
      </div>

      {!media ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Select ${expectedMediaKind}, click or drag and drop`}
          aria-disabled={isUploading}
          onKeyDown={onKeyDown}
          onClick={openFilePicker}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn("group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-xl p-8 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600", dragOver ? "border-blue-400/55 bg-white/15" : "border-white/20 bg-white/8 hover:border-blue-400/45 hover:bg-white/12")}
        >
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border bg-white/20 backdrop-blur-xl transition-all duration-300", dragOver ? "border-blue-400/40 bg-blue-500/20 text-blue-700 shadow-lg" : "border-white/20 text-slate-500 group-hover:bg-blue-500/15 group-hover:text-blue-700 group-hover:border-blue-400/30")}>
            <Upload className="h-5 w-5" aria-hidden="true" />
          </div>

          <button type="button" disabled={isUploading} onClick={(event) => { event.stopPropagation(); openFilePicker(); }} className="mt-3 text-[13px] font-medium text-slate-900 disabled:cursor-wait">Add media to your post</button>
          <p className="mt-1 max-w-[360px] text-[11px] leading-4 text-slate-600">Choose a {expectedMediaKind} from your device or continue from Media Library.</p>

          <div className="mt-4 flex items-center gap-2">
            {expectedMediaKind === "image" && <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-xl"><ImageIcon className="h-3 w-3" aria-hidden="true" /> Image</span>}
            {expectedMediaKind === "video" && <button type="button" disabled={isUploading} onClick={(event) => { event.stopPropagation(); openFilePicker(); }} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-xl disabled:cursor-wait"><Video className="h-3 w-3" aria-hidden="true" /> Video</button>}
          </div>

          {dragOver && <p className="mt-3 text-[12px] font-medium text-blue-700">Drop file to add</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-white/15 bg-white/8 p-3 shadow-sm backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950/15">
              {media.kind === "image" ? <img src={media.previewUrl} alt={media.fileName} className="h-full w-full object-cover" /> : <video src={media.previewUrl} muted preload="metadata" className="h-full w-full object-cover" aria-label={`${media.fileName} preview`} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-900" title={media.fileName}>{media.fileName}</p>
              <p className="text-[11px] text-slate-600">{formatFileSize(uploadedAsset?.size_bytes ?? media.fileSize)} &middot; {formatDimensions(media.width, media.height)}{media.duration !== null ? ` &middot; ${formatDuration(media.duration)}` : ""}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{media.mimeType}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label={`Replace ${media.fileName}`} disabled={isUploading} onClick={openFilePicker} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/12 text-slate-600 backdrop-blur-xl transition hover:bg-white/20 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-wait disabled:opacity-50">
                <Replace className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" aria-label={`Remove ${media.fileName}`} onClick={onClear} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-700 backdrop-blur-xl transition hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_BY_MEDIA_KIND[expectedMediaKind]}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />

      {error && <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-800 backdrop-blur-xl" role="alert">{error}</p>}

      {uploadState === "failed" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-800 backdrop-blur-xl" role="alert">
          <span>{uploadError || "Upload failed. Retry or select another file."}</span>
          <button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-red-400/20 bg-white/12 px-2 py-1 font-medium backdrop-blur-xl hover:bg-red-500/15">Retry</button>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-3 py-2 backdrop-blur-xl">
        <p className="flex-1 text-[10px] leading-4 text-slate-600">Media remains local in this browser until Nexapa storage is connected.</p>
        <button type="button" onClick={onOpenLibrary} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/15">
          <Library className="h-3 w-3" aria-hidden="true" /> Library
        </button>
      </div>
    </div>
  );
}
