import { useState } from "react";
import type { YouTubeSettings, ShopeeSettings } from "../settings.types";
import type { PlatformTab } from "../settings.types";
import { PLATFORM_TABS } from "../settings.constants";
import { MetaIntegrationSettings } from "./MetaIntegrationSettings";
import { YouTubeIntegrationSettings } from "./YouTubeIntegrationSettings";
import { ShopeeIntegrationSettings } from "./ShopeeIntegrationSettings";
import { TikTokPlatformIntegrationSettings } from "./TikTokPlatformIntegrationSettings";
import type { ValidationItem } from "../settings.types";
import { getPlatformTabStatus } from "../settings.utils";

type Props = {
  youtube: YouTubeSettings;
  shopee: ShopeeSettings;
  activePlatform: PlatformTab;
  onPlatformChange: (p: PlatformTab) => void;
  onYouTubeChange: (patch: Partial<YouTubeSettings>) => void;
  onShopeeChange: (patch: Partial<ShopeeSettings>) => void;
  validationItems: ValidationItem[];
};

export function PlatformIntegrationSettings({ youtube, shopee, activePlatform, onPlatformChange, onYouTubeChange, onShopeeChange, validationItems }: Props) {
  const [internal] = useState<PlatformTab>(activePlatform);
  const current = activePlatform ?? internal;

  const statusFor = (tab: PlatformTab) => getPlatformTabStatus(tab, validationItems);

  return (
    <div className="space-y-6 bg-transparent">
      <div className="nexapa-glass-card rounded-2xl border border-white/20 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] ring-1 ring-white/10">
        <h3 className="text-[14px] font-semibold text-slate-900">Platform Integrations</h3>
        <p className="mt-1 text-[12px] text-slate-600">One unified Platform Integrations section with internal tabs – no separate routes.</p>
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-white/15 bg-white/8 p-2 backdrop-blur-xl">
          {PLATFORM_TABS.map((tab) => {
            const st = statusFor(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={current === tab.id}
                onClick={() => onPlatformChange(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 ${
                  current === tab.id
                    ? "border-white/25 bg-white/20 text-slate-950 shadow-sm"
                    : "border-transparent bg-transparent text-slate-700 hover:bg-white/10 hover:text-slate-900"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                    st === "has-errors"
                      ? "border-red-400/25 bg-red-500/12 text-red-800"
                      : st === "complete-locally"
                        ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-800"
                        : st === "partial"
                          ? "border-amber-400/25 bg-amber-500/12 text-amber-800"
                          : "border-slate-400/25 bg-slate-500/12 text-slate-700"
                  }`}
                >
                  {st}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="nexapa-glass-card rounded-2xl border border-white/20 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] ring-1 ring-white/10">
        {current === "tiktok" && <TikTokPlatformIntegrationSettings status={statusFor("tiktok")} />}
        {current === "meta" && <MetaIntegrationSettings status={statusFor("meta")} />}
        {current === "youtube" && <YouTubeIntegrationSettings value={youtube} onChange={onYouTubeChange} status={statusFor("youtube")} />}
        {current === "shopee" && <ShopeeIntegrationSettings value={shopee} onChange={onShopeeChange} status={statusFor("shopee")} />}
      </div>
    </div>
  );
}
