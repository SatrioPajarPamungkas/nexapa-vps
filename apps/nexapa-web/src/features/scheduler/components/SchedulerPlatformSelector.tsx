import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { SchedulerPlatform } from "@/features/scheduler/scheduler.types";

type PlatformOption = {
  id: SchedulerPlatform | "all";
  label: string;
  icon: string;
  color: string;
};

const PLATFORMS: PlatformOption[] = [
  { id: "all", label: "All", icon: "📅", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "facebook", label: "Facebook", icon: "📘", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { id: "youtube", label: "YouTube", icon: "▶️", color: "bg-red-50 text-red-700 border-red-200" },
  { id: "shopee", label: "Shopee", icon: "🛍️", color: "bg-orange-50 text-orange-700 border-orange-200" },
];

type Props = {
  activePlatform: SchedulerPlatform | "all";
  onChange: (platform: SchedulerPlatform | "all") => void;
};

export function SchedulerPlatformSelector({ activePlatform, onChange }: Props) {
  const activeOption = useMemo(
    () => PLATFORMS.find((p) => p.id === activePlatform) || PLATFORMS[0],
    [activePlatform]
  );

  return (
    <div className="relative inline-block">
      <select
        value={activePlatform}
        onChange={(e) => onChange(e.target.value as SchedulerPlatform | "all")}
        className={cn(
          "appearance-none inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          activeOption.color
        )}
      >
        {PLATFORMS.map((platform) => (
          <option key={platform.id} value={platform.id}>
            {platform.icon} {platform.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}