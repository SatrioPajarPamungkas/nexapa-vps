import type { InstagramSettings } from "../publisher.types";
import { cn } from "@/lib/cn";

type Props = { settings: InstagramSettings; onChange: (next: InstagramSettings) => void; caption: string; mediaKind: "image" | "video" | "none" };

export function InstagramPublishSettings({ settings, onChange, caption, mediaKind }: Props) {
  return (
    <div className="space-y-4">
      {/* Mode */}
      <fieldset className="space-y-2">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mode</legend>
        {mediaKind === "video" ? (
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: "reel" as const, label: "Reel" },
              { value: "feed_video" as const, label: "Feed video" },
            ]).map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-medium transition-all",
                  settings.mode === value
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <input
                  type="radio"
                  name="ig-mode"
                  value={value}
                  checked={settings.mode === value}
                  onChange={() => onChange({ ...settings, mode: value })}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600 font-medium">
            Feed post {mediaKind === "none" ? " — select image to enable" : ""}
          </div>
        )}
      </fieldset>

      {/* Options */}
      <div className="space-y-2">
        {([
          { key: "shareToFeed" as const, label: "Share to feed" },
          { key: "disableComments" as const, label: "Disable comments" },
          { key: "addFirstCommentHashtags" as const, label: "Hashtags in first comment" },
        ]).map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-[12px] text-slate-700">
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => onChange({ ...settings, [key]: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            {label}
          </label>
        ))}
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500 ring-1 ring-slate-200">
        Instagram publishing requires a supported professional account and Meta authorization.
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
            placeholder={`Override for Instagram. Shared: ${caption.slice(0, 60)}...`}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
          />
        )}
      </div>
    </div>
  );
}
