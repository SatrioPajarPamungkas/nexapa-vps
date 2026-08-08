import type { TikTokSettings } from "../publisher.types";
import { cn } from "@/lib/cn";

type Props = {
  settings: TikTokSettings;
  onChange: (next: TikTokSettings) => void;
  caption: string;
};

export function TikTokPublishSettings({ settings, onChange, caption }: Props) {
  const creatorInfo = settings.creatorInfo;
  const isLoading = settings.isLoadingCreatorInfo;

  const availablePrivacyOptions = creatorInfo?.privacy_level_options || [];

  const privacyOptions = [
    { value: "only_me" as const, label: "Only me", level: "SELF_ONLY" as const },
    { value: "public" as const, label: "Public", level: "PUBLIC_TO_EVERYONE" as const },
    { value: "friends" as const, label: "Friends", level: "MUTUAL_FOLLOW_FRIENDS" as const },
    { value: "followers" as const, label: "Followers", level: "FOLLOWER_OF_CREATOR" as const },
  ].filter((opt) => {
    if (!creatorInfo || availablePrivacyOptions.length === 0) return true;
    return availablePrivacyOptions.includes(opt.level);
  });

  return (
    <div className="space-y-4 bg-transparent">
      <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Privacy (Direct Post only)</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {privacyOptions.map((p) => (
            <label key={p.value} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-medium backdrop-blur-xl transition-all", settings.privacy === p.value ? "border-blue-400/45 bg-blue-500/15 text-blue-800 ring-1 ring-blue-400/20" : "border-white/15 bg-white/8 text-slate-700 hover:border-white/25 hover:bg-white/12")}>
              <input type="radio" name="tiktok-privacy" value={p.value} checked={settings.privacy === p.value} onChange={() => onChange({ ...settings, privacy: p.value })} className="sr-only" />
              {p.label}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">{isLoading ? "Loading privacy options..." : creatorInfo ? `Privacy options from TikTok: ${privacyOptions.map(o => o.label).join(", ")}` : "Privacy applies to Direct Post only. TikTok Draft ignores these settings."}</p>
        {creatorInfo && availablePrivacyOptions.length === 1 && availablePrivacyOptions[0] === "SELF_ONLY" && <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-800 backdrop-blur-xl">Note: Your TikTok app is unaudited. Only "Only me" privacy is available for Direct Post.</p>}
      </fieldset>

      <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Interaction permissions (Direct Post only)</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {([{ key: "allowComments", label: "Comments", disabled: creatorInfo?.comment_disabled }, { key: "allowDuet", label: "Duet", disabled: creatorInfo?.duet_disabled }, { key: "allowStitch", label: "Stitch", disabled: creatorInfo?.stitch_disabled }] as const).map(({ key, label, disabled }) => (
            <label key={key} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-medium backdrop-blur-xl transition-all", disabled ? "border-white/10 bg-white/5 text-slate-400 cursor-not-allowed" : settings.interaction[key] ? "border-blue-400/45 bg-blue-500/15 text-blue-800" : "border-white/15 bg-white/8 text-slate-700 hover:border-white/25 hover:bg-white/12")}>
              <input type="checkbox" checked={disabled ? false : settings.interaction[key]} onChange={(e) => !disabled && onChange({ ...settings, interaction: { ...settings.interaction, [key]: e.target.checked } })} disabled={disabled} className="sr-only" />
              {label}{disabled ? " (disabled)" : ""}
            </label>
          ))}
        </div>
        {(creatorInfo?.comment_disabled || creatorInfo?.duet_disabled || creatorInfo?.stitch_disabled) && <p className="text-[10px] text-amber-700">Some interaction options are disabled by your TikTok account settings.</p>}
      </fieldset>

      <fieldset className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Content disclosure (Direct Post only)</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {([{ key: "brandedContent" as const, label: "Branded content" }, { key: "promotionalContent" as const, label: "Promotional" }]).map(({ key, label }) => (
            <label key={key} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-medium backdrop-blur-xl transition-all", settings.disclosure[key] ? "border-blue-400/45 bg-blue-500/15 text-blue-800" : "border-white/15 bg-white/8 text-slate-700 hover:border-white/25 hover:bg-white/12")}>
              <input type="checkbox" checked={settings.disclosure[key]} onChange={(e) => onChange({ ...settings, disclosure: { ...settings.disclosure, [key]: e.target.checked } })} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={cn("flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-[11px] leading-4 backdrop-blur-xl transition-all", settings.rightsConfirmed ? "border-amber-400/30 bg-amber-500/10 text-amber-800" : "border-white/15 bg-white/8 text-slate-600 hover:border-white/20")}>
        <input type="checkbox" checked={settings.rightsConfirmed} onChange={(e) => onChange({ ...settings, rightsConfirmed: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
        <span className="font-medium">I confirm that I have the rights to use the selected media and audio.</span>
      </label>

      <div className="border-t border-white/10 pt-4">
        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700"><input type="checkbox" checked={settings.captionOverrideEnabled} onChange={(e) => onChange({ ...settings, captionOverrideEnabled: e.target.checked })} className="h-3.5 w-3.5 rounded border-white/30 text-blue-600 focus:ring-blue-600" /> Platform-specific caption override</label>
        {settings.captionOverrideEnabled && <textarea value={settings.captionOverride} onChange={(e) => onChange({ ...settings, captionOverride: e.target.value })} placeholder={`Override for TikTok. Shared: ${caption.slice(0, 60)}...`} rows={3} className="mt-2 w-full rounded-xl border border-white/20 bg-white/12 p-2.5 text-[11px] backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />}
      </div>
    </div>
  );
}
