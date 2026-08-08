import { Globe2, Image as ImageIcon, Play } from "lucide-react";
import { useState } from "react";
import type { DestinationAccount, FacebookPostType, LocalMediaAsset } from "../publisher.types";

type Props = { page: DestinationAccount | null; postType: FacebookPostType; message: string; media: LocalMediaAsset | null };

export function FacebookPostPreview({ page, postType, message, media }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const showAvatar = page?.platform === "facebook" && page.avatarUrl && !imageFailed;
  const initials = page?.label.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "P";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="border-b border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl"><h3 className="text-[13px] font-semibold text-slate-900">Facebook Preview</h3></div>
      <div className="bg-transparent p-4 sm:p-5">
        <div className="overflow-hidden rounded-xl border border-white/15 bg-white/8 backdrop-blur-xl">
          <div className="flex items-center gap-3 p-3">
            {showAvatar && page.avatarUrl ? <img src={page.avatarUrl} alt="" className="h-9 w-9 rounded-full border border-white/25 object-cover" loading="lazy" onError={() => setImageFailed(true)} /> : <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/20 font-semibold text-slate-700 backdrop-blur-xl">{initials}</div>}
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-slate-900">{page?.label || "Facebook Page"}</p><p className="text-[10px] text-slate-500">Publish now</p></div>
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/25 bg-blue-500/12 px-2 py-1 text-[10px] font-medium text-blue-800 backdrop-blur-xl"><Globe2 className="h-3 w-3" /> Facebook</span>
          </div>
          <p className="whitespace-pre-wrap bg-white/5 px-3 pb-3 text-[12px] leading-5 text-slate-700">{message || (postType === "text" ? "Your post message will appear here." : "Caption is optional.")}</p>
          {postType === "image" && <div className="flex min-h-40 items-center justify-center bg-slate-950/15">{media?.kind === "image" ? <img src={media.previewUrl} alt={media.fileName} className="max-h-80 w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-white/40" />}</div>}
          {postType === "video" && <div className="relative flex aspect-video items-center justify-center bg-slate-950/15">{media?.kind === "video" ? <video src={media.previewUrl} muted controls className="h-full w-full object-contain" /> : <Play className="h-9 w-9 text-white/50" />}</div>}
        </div>
      </div>
    </section>
  );
}
