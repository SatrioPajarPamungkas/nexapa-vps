import type { YouTubeSettings } from "../publisher.types";
import { YOUTUBE_CATEGORIES } from "../publisher.constants";
import { cn } from "@/lib/cn";

type Props = { settings: YouTubeSettings; onChange: (next: YouTubeSettings) => void; caption: string };

export function YouTubePublishSettings({ settings, onChange, caption }: Props) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="yt-title" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Video title <span className="text-rose-500">*</span>
        </label>
        <input
          id="yt-title"
          value={settings.title}
          onChange={(e) => onChange({ ...settings, title: e.target.value })}
          placeholder="YouTube video title"
          maxLength={100}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
        />
        <p className="mt-1 text-[10px] text-slate-400">{settings.title.length}/100 characters</p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="yt-desc" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</label>
        <textarea
          id="yt-desc"
          value={settings.description}
          onChange={(e) => onChange({ ...settings, description: e.target.value })}
          placeholder="Video description. May include links and hashtags."
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
        />
        <p className="mt-1 text-[10px] text-slate-400">{settings.description.length} chars &middot; Shared caption {caption.length} chars</p>
      </div>

      {/* Visibility */}
      <fieldset className="space-y-2">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Visibility</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {(["private", "unlisted", "public"] as const).map((v) => (
            <label
              key={v}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-medium transition-all",
                settings.visibility === v
                  ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name="yt-vis"
                value={v}
                checked={settings.visibility === v}
                onChange={() => onChange({ ...settings, visibility: v })}
                className="sr-only"
              />
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">Default: Private</p>
      </fieldset>

      {/* Category + Made for kids */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="yt-category" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</label>
          <select
            id="yt-category"
            value={settings.category}
            onChange={(e) => onChange({ ...settings, category: e.target.value })}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
          >
            {YOUTUBE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Made for kids</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {(["no", "yes"] as const).map((v) => (
              <label
                key={v}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-[12px] font-medium transition-all",
                  settings.madeForKids === v
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <input
                  type="radio"
                  name="yt-kids"
                  value={v}
                  checked={settings.madeForKids === v}
                  onChange={() => onChange({ ...settings, madeForKids: v })}
                  className="sr-only"
                />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="yt-tags" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tags</label>
        <input
          id="yt-tags"
          value={settings.tags}
          onChange={(e) => onChange({ ...settings, tags: e.target.value })}
          placeholder="nexapa, content, tutorial"
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
        />
        <p className="mt-1 text-[10px] text-slate-400">Comma-separated</p>
      </div>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700 ring-1 ring-amber-200">
        Video required for YouTube. Image not supported. Final validation before publishing.
      </p>

      {/* Caption override */}
      <div className="border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
          <input
            type="checkbox"
            checked={settings.captionOverrideEnabled}
            onChange={(e) => onChange({ ...settings, captionOverrideEnabled: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          Platform-specific caption override
        </label>
        {settings.captionOverrideEnabled && (
          <textarea
            value={settings.captionOverride}
            onChange={(e) => onChange({ ...settings, captionOverride: e.target.value })}
            placeholder={`Override for YouTube. Shared: ${caption.slice(0, 60)}...`}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
          />
        )}
      </div>
    </div>
  );
}
