import { useRef } from "react";
import { Upload, Image as ImageIcon, Video, Music } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_ASSETS } from "../media-library.types";

type Props = {
  accept: string;
  onFilesSelected: (files: File[]) => void;
  totalCount: number;
};

export function MediaDropzone({ accept, onFilesSelected, totalCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragOver = false;

  function handleFiles(files: FileList | File[]) {
    if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) return;

    const fileList = Array.isArray(files) ? files : Array.from(files);
    onFilesSelected(fileList);

    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload media files, click or drag and drop"
        onKeyDown={onKeyDown}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          "group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center backdrop-blur-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:p-6",
            "border-white/25 bg-white/8 hover:border-white/30 hover:bg-white/15 shadow-[0_14px_40px_rgba(2,6,23,0.10)]",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-xl transition",
            dragOver ? "bg-blue-600 text-white border-white/20" : "bg-white/20 text-slate-900 border-white/20",
          )}
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-[13px] font-semibold text-slate-950">
          Click to select or drag and drop
        </p>
        <p className="mt-1 max-w-[480px] text-[11px] leading-5 text-slate-700">
          Supports JPEG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, M4A, WAV, OGG, WebM audio. {totalCount}/{MAX_ASSETS} used.
        </p>
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 backdrop-blur-xl">
            <ImageIcon className="h-2.5 w-2.5" aria-hidden="true" /> Images
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 backdrop-blur-xl">
            <Video className="h-2.5 w-2.5" aria-hidden="true" /> Videos
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 backdrop-blur-xl">
            <Music className="h-2.5 w-2.5" aria-hidden="true" /> Audio
          </span>
        </div>
        <p className="mt-2 text-[12px] font-medium text-blue-700">Drop to upload</p>
      </div>

      <input
        ref={inputRef}
        id="media-file-input"
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        aria-label="Select media files"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />


    </div>
  );
}
