import type { LocalMediaAsset } from "../publisher.types";
import { formatFileSize, formatDimensions, formatDuration } from "../publisher.utils";

type Props = { media: LocalMediaAsset | null };

export function MediaPreview({ media }: Props) {
  if (!media) {
    return <div className="flex h-[220px] items-center justify-center rounded-xl border border-white/15 bg-white/8 text-[12px] text-slate-500 backdrop-blur-xl">No media selected – preview appears here</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/15 backdrop-blur-xl">
      <div className="relative flex max-h-[360px] w-full items-center justify-center bg-slate-950/15">
        {media.kind === "image" ? <img src={media.previewUrl} alt={media.fileName} className="max-h-[360px] w-full object-contain" /> : <video src={media.previewUrl} muted controls preload="metadata" className="max-h-[360px] w-full object-contain" aria-label={`${media.fileName} preview`} />}
      </div>
      <div className="flex flex-wrap items-center gap-2 bg-white/5 px-3 py-2 text-[11px] text-slate-600">
        <span className="rounded-full border border-white/15 bg-white/8 px-2 py-1 backdrop-blur-xl">{media.fileName}</span>
        <span className="rounded-full border border-white/15 bg-white/8 px-2 py-1 backdrop-blur-xl">{formatFileSize(media.fileSize)}</span>
        <span className="rounded-full border border-white/15 bg-white/8 px-2 py-1 backdrop-blur-xl">{formatDimensions(media.width, media.height)}</span>
        {media.duration !== null && <span className="rounded-full border border-white/15 bg-white/8 px-2 py-1 backdrop-blur-xl">{formatDuration(media.duration)}</span>}
      </div>
      <p className="px-3 pb-2 text-[11px] text-slate-500">Media remains local in this browser until Nexapa storage is connected.</p>
    </div>
  );
}
