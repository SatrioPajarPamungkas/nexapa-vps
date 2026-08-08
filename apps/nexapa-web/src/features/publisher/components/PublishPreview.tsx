
import type { PublishPlatform, LocalMediaAsset } from "../publisher.types";
import { PLATFORM_DISPLAY } from "../publisher.constants";
import { cn } from "@/lib/cn";
import { Eye } from "lucide-react";

type Props = {
  selectedPlatforms: PublishPlatform[];
  media: LocalMediaAsset | null;
  caption: string;
  effectiveCaptions: Record<PublishPlatform, string>;
  previewPlatform: PublishPlatform;
  onPreviewPlatformChange: (p: PublishPlatform) => void;
  accountLabels: Record<PublishPlatform, string>;
  platformSettings: {
    tiktok: { privacy: string };
    instagram: { mode: string };
    facebook: { destination: string };
    youtube: { title: string; visibility: string; description: string };
  };
};

export function PublishPreview({ selectedPlatforms, media, caption, effectiveCaptions, previewPlatform, onPreviewPlatformChange, accountLabels, platformSettings }: Props) {
  if (selectedPlatforms.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-white/20 bg-white/8 p-5 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/20 backdrop-blur-xl"><Eye className="h-5 w-5 text-slate-400" aria-hidden="true" /></div>
        <p className="mt-3 text-[13px] font-medium text-slate-800">Preview appears after selecting a destination</p>
        <p className="mt-1 text-[11px] text-slate-600">Choose an account to review platform-specific output.</p>
      </div>
    );
  }

  const effectiveTab = selectedPlatforms.includes(previewPlatform) ? previewPlatform : selectedPlatforms[0];
  const effectiveCaption = effectiveCaptions[effectiveTab] ?? caption;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" aria-hidden="true" /><h3 className="text-[13px] font-semibold text-slate-900">Preview</h3></div>
      </div>
      <div className="border-b border-white/10 bg-white/8 px-4 backdrop-blur-xl sm:px-5">
        <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Preview platform selector">
          {selectedPlatforms.map((p) => (
            <button key={p} role="tab" aria-selected={effectiveTab === p} onClick={() => onPreviewPlatformChange(p)} className={cn("relative rounded-t-lg border px-3 py-2 text-[12px] font-medium backdrop-blur-xl transition-all whitespace-nowrap", effectiveTab === p ? "border-white/25 bg-white/20 text-slate-950 shadow-sm" : "border-transparent text-slate-600 hover:bg-white/10 hover:text-slate-800")}>{PLATFORM_DISPLAY[p]}</button>
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-5 bg-transparent">
        <div className="transition-all duration-200">
          {effectiveTab === "tiktok" && (
            <div className="space-y-3">
              <div className="mx-auto w-[240px] overflow-hidden rounded-2xl bg-slate-950 shadow-xl shadow-slate-900/20">
                <div className="relative aspect-[9/16] bg-slate-800">
                  {media ? (
                    media.kind === "image" ? (
                      <img src={media.previewUrl} alt={media.fileName} className="h-full w-full object-cover" />
                    ) : (
                      <video src={media.previewUrl} muted className="h-full w-full object-cover" aria-label={`${media.fileName} preview`} />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">No media</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
                    <p className="text-[10px] font-semibold text-white/90">{accountLabels.tiktok || "Demo Account"}</p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-white/95">{effectiveCaption || "Caption preview"}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/60">
                      <span className="rounded bg-white/20 px-1 py-0.5">{platformSettings.tiktok.privacy}</span>
                      <span>&middot;</span>
                      <span>No fake metrics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {effectiveTab === "instagram" && (
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/8 backdrop-blur-xl">
              <div className="flex items-center gap-2 bg-white/60 p-2.5 backdrop-blur-xl"><div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" aria-hidden="true" /><span className="text-[11px] font-semibold text-slate-900">{accountLabels.instagram || "Demo Account"}</span><span className="ml-auto text-[9px] text-slate-500">{platformSettings.instagram.mode}</span></div>
              <div className="aspect-square bg-slate-950/15"><div className="h-full w-full">{media ? media.kind === "image" ? <img src={media.previewUrl} alt={media.fileName} className="h-full w-full object-cover" /> : <video src={media.previewUrl} muted className="h-full w-full object-cover" aria-label={`${media.fileName} preview`} /> : <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">No media</div>}</div></div>
              <div className="bg-white/60 p-2.5 backdrop-blur-xl"><p className="line-clamp-2 text-[11px] leading-4 text-slate-700">{effectiveCaption || "Caption preview"}</p></div>
            </div>
          )}

          {effectiveTab === "facebook" && (
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/8 backdrop-blur-xl">
              <div className="flex items-center gap-2 bg-white/60 p-3 backdrop-blur-xl"><div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center" aria-hidden="true"><span className="text-[10px] font-bold text-white">f</span></div><div><p className="text-[11px] font-semibold text-slate-900">{accountLabels.facebook || "Demo Page"}</p><p className="text-[9px] text-slate-500">{platformSettings.facebook.destination}</p></div></div>
              <p className="bg-white/5 px-3 py-2 text-[11px] leading-4 text-slate-700">{effectiveCaption || "Caption preview"}</p>
              <div className="mt-2 mx-3 overflow-hidden rounded-lg border border-white/10 bg-slate-950/15"><div className="w-full">{media ? media.kind === "image" ? <img src={media.previewUrl} alt={media.fileName} className="max-h-[180px] w-full object-cover" /> : <video src={media.previewUrl} muted controls className="max-h-[180px] w-full object-cover" aria-label={`${media.fileName} preview`} /> : <div className="flex h-[120px] w-full items-center justify-center text-[11px] text-slate-500">No media</div>}</div></div>
            </div>
          )}

          {effectiveTab === "youtube" && (
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/8 backdrop-blur-xl">
              <div className="aspect-video bg-slate-950/15">
                {media ? (
                  media.kind === "video" ? (
                    <video src={media.previewUrl} muted controls className="h-full w-full object-contain" aria-label={`${media.fileName} preview`} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-white/60">Image not supported for YouTube</div>
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-white/60">No media</div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <p className="text-[13px] font-semibold text-slate-900 leading-tight">{platformSettings.youtube.title || "Video title"}</p>
                <p className="text-[10px] text-slate-500">{accountLabels.youtube || "Demo Channel"} &middot; {platformSettings.youtube.visibility}</p>
                <p className="line-clamp-2 text-[10px] leading-3 text-slate-500">{platformSettings.youtube.description || effectiveCaption || "Description"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
