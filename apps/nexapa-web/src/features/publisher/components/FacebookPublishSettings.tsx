import type { FacebookSettings, FacebookPostType } from "../publisher.types";
import { cn } from "@/lib/cn";

type Props = { settings: FacebookSettings; onChange: (next: FacebookSettings) => void; caption: string; mediaKind?: "image" | "video" | "none" };

export function FacebookPublishSettings({ settings, onChange, caption, mediaKind }: Props) {
  const postTypeOptions: Array<{ value: FacebookPostType; label: string; disabled?: boolean }> = [
    { value: "text", label: "Text Post" },
    { value: "image", label: "Image Post", disabled: mediaKind === "video" || mediaKind === "none" },
    { value: "video", label: "Video Post", disabled: mediaKind === "image" || mediaKind === "none" },
  ];

  return (
    <div className="space-y-4 bg-transparent">
      <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Post Type</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {postTypeOptions.map(({ value, label, disabled }) => (
            <label key={value} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-medium backdrop-blur-xl transition-all", disabled ? "border-white/10 bg-white/5 text-slate-400 cursor-not-allowed" : settings.postType === value ? "border-blue-400/45 bg-blue-500/15 text-blue-800 ring-1 ring-blue-400/20" : "border-white/15 bg-white/8 text-slate-700 hover:border-white/25 hover:bg-white/12")}>
              <input type="radio" name="fb-post-type" value={value} checked={settings.postType === value} onChange={() => !disabled && onChange({ ...settings, postType: value })} disabled={disabled} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        {mediaKind === "none" && <p className="text-[10px] text-slate-500">Select media to enable Image/Video post types</p>}
      </fieldset>

      <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Destination</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {([{ value: "page_timeline" as const, label: "Page timeline" }, { value: "video_post" as const, label: "Video post" }]).map(({ value, label }) => (
            <label key={value} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-medium backdrop-blur-xl transition-all", settings.destination === value ? "border-blue-400/45 bg-blue-500/15 text-blue-800 ring-1 ring-blue-400/20" : "border-white/15 bg-white/8 text-slate-700 hover:border-white/25 hover:bg-white/12")}>
              <input type="radio" name="fb-dest" value={value} checked={settings.destination === value} onChange={() => onChange({ ...settings, destination: value })} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Visibility</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {([{ value: "published" as const, label: "Published" }, { value: "unpublished" as const, label: "Unpublished draft" }]).map(({ value, label }) => (
            <label key={value} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-medium backdrop-blur-xl transition-all", settings.visibility === value ? "border-blue-400/45 bg-blue-500/15 text-blue-800 ring-1 ring-blue-400/20" : "border-white/15 bg-white/8 text-slate-700 hover:border-white/25 hover:bg-white/12")}>
              <input type="radio" name="fb-vis" value={value} checked={settings.visibility === value} onChange={() => onChange({ ...settings, visibility: value })} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <label className="flex items-center gap-2 text-[12px] text-slate-800"><input type="checkbox" checked={settings.allowComments} onChange={(e) => onChange({ ...settings, allowComments: e.target.checked })} className="h-4 w-4 rounded border-white/30 text-blue-600 focus:ring-blue-600" /> Allow comments</label>
        <label className="flex items-center gap-2 text-[12px] text-slate-800"><input type="checkbox" checked={settings.includeLinkPreview} onChange={(e) => onChange({ ...settings, includeLinkPreview: e.target.checked })} className="h-4 w-4 rounded border-white/30 text-blue-600 focus:ring-blue-600" /> Include link preview when URL exists</label>
      </div>

      <p className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-[10px] leading-4 text-slate-600 backdrop-blur-xl">
        {settings.postType === "text" && "Text post akan dipublish ke Facebook Page feed tanpa media."}
        {settings.postType === "image" && "Image post akan dipublish ke Facebook Page photos."}
        {settings.postType === "video" && "Video post akan diupload ke Facebook Page videos."}
      </p>

      <div className="border-t border-white/10 pt-4">
        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700"><input type="checkbox" checked={settings.captionOverrideEnabled} onChange={(e) => onChange({ ...settings, captionOverrideEnabled: e.target.checked })} className="h-3.5 w-3.5 rounded border-white/30 text-blue-600 focus:ring-blue-600" /> Platform-specific caption override</label>
        {settings.captionOverrideEnabled && <textarea value={settings.captionOverride} onChange={(e) => onChange({ ...settings, captionOverride: e.target.value })} placeholder={`Override for Facebook. Shared: ${caption.slice(0, 60)}...`} rows={3} className="mt-2 w-full rounded-xl border border-white/20 bg-white/12 p-2.5 text-[11px] backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />}
        {settings.postType === "text" && <p className="mt-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-800 backdrop-blur-xl">Caption wajib diisi untuk Text Post</p>}
      </div>
    </div>
  );
}
