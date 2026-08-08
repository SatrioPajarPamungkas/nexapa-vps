import type { PublishPlatform, PlatformSettings, LocalMediaAsset, ValidationItem } from "../publisher.types";
import { PLATFORM_DISPLAY } from "../publisher.constants";
import { TikTokPublishSettings } from "./TikTokPublishSettings";
import { FacebookPublishSettings } from "./FacebookPublishSettings";
import { InstagramPublishSettings } from "./InstagramPublishSettings";
import { YouTubePublishSettings } from "./YouTubePublishSettings";
import { cn } from "@/lib/cn";
import { Settings } from "lucide-react";

type Props = {
  selectedPlatforms: PublishPlatform[];
  settings: PlatformSettings;
  media: LocalMediaAsset | null;
  caption: string;
  activeTab: PublishPlatform;
  onTabChange: (p: PublishPlatform) => void;
  onSettingsChange: (next: PlatformSettings) => void;
  validationItems: ValidationItem[];
};

export function PlatformSettingsPanel({ selectedPlatforms, settings, media, caption, activeTab, onTabChange, onSettingsChange, validationItems }: Props) {
  if (selectedPlatforms.length === 0) {
    return null;
  }

  const effectiveTab = selectedPlatforms.includes(activeTab) ? activeTab : selectedPlatforms[0];

  const getIssueCount = (platform: PublishPlatform) => {
    return validationItems.filter((i) => i.platform === platform && i.severity === "action-required").length;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-slate-500" aria-hidden="true" /><h3 className="text-[13px] font-semibold text-slate-900">Platform Settings</h3><span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-500 backdrop-blur-xl">Contextual</span></div>
        <p className="mt-0.5 text-[10px] text-slate-500">Shared caption by default. Platform-specific controls appear here.</p>
      </div>
      <div className="border-b border-white/10 bg-white/8 px-4 backdrop-blur-xl sm:px-5">
        <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Platform settings tabs">
          {selectedPlatforms.map((p) => {
            const issues = getIssueCount(p);
            return <button key={p} role="tab" aria-selected={effectiveTab === p} onClick={() => onTabChange(p)} className={cn("relative inline-flex items-center gap-1.5 rounded-t-lg border px-3 py-2 text-[12px] font-medium backdrop-blur-xl transition-all whitespace-nowrap", effectiveTab === p ? "border-white/25 bg-white/20 text-slate-950 shadow-sm" : "border-transparent text-slate-600 hover:bg-white/10 hover:text-slate-800")}>{PLATFORM_DISPLAY[p]}{issues > 0 && <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400/15 px-1 text-[9px] font-bold text-amber-800 border border-amber-400/25 backdrop-blur-xl">{issues}</span>}</button>;
          })}
        </div>
      </div>
      <div className="p-4 sm:p-5 bg-transparent">
        {effectiveTab === "tiktok" && selectedPlatforms.includes("tiktok") && (
          <TikTokPublishSettings settings={settings.tiktok} caption={caption} onChange={(next) => onSettingsChange({ ...settings, tiktok: next })} />
        )}
        {effectiveTab === "facebook" && selectedPlatforms.includes("facebook") && (
          <FacebookPublishSettings settings={settings.facebook} caption={caption} mediaKind={media ? media.kind : "none"} onChange={(next) => onSettingsChange({ ...settings, facebook: next })} />
        )}
        {effectiveTab === "instagram" && selectedPlatforms.includes("instagram") && (
          <InstagramPublishSettings settings={settings.instagram} caption={caption} mediaKind={media ? media.kind : "none"} onChange={(next) => onSettingsChange({ ...settings, instagram: next })} />
        )}
        {effectiveTab === "youtube" && selectedPlatforms.includes("youtube") && (
          <YouTubePublishSettings settings={settings.youtube} caption={caption} onChange={(next) => onSettingsChange({ ...settings, youtube: next })} />
        )}
      </div>
    </div>
  );
}
