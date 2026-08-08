import { Video, Users, Camera, PlayCircle, ShoppingBag, type LucideIcon } from "lucide-react";
import type { UiPlatform, AccountPlatform, AccountCapability } from "../connected-accounts.types";
import { PLATFORM_DISPLAY, PLATFORM_CAPABILITY_LABELS, PLATFORM_DESCRIPTION } from "../connected-accounts.constants";
import { cn } from "@/lib/cn";

type Props = {
  selected: AccountPlatform | "";
  onSelect: (p: AccountPlatform) => void;
};

const ICON_MAP: Record<UiPlatform, LucideIcon> = {
  tiktok: Video,
  facebook: Users,
  instagram: Camera,
  youtube: PlayCircle,
  shopee: ShoppingBag,
  pinterest: Camera,
};

const PLATFORM_TONE: Record<UiPlatform, string> = {
  tiktok: "bg-slate-900",
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  youtube: "bg-red-600",
  shopee: "bg-orange-500",
  pinterest: "bg-red-500",
};

const ORDER: UiPlatform[] = ["tiktok", "facebook", "instagram", "youtube", "shopee"];

const UI_PLATFORM_CAPABILITIES: Record<UiPlatform, AccountCapability[]> = {
  tiktok: ["publishing", "scheduling", "media-access"],
  facebook: ["publishing", "scheduling", "affiliate", "media-access"],
  instagram: ["publishing", "scheduling", "media-access"],
  youtube: ["publishing", "scheduling", "media-access"],
  shopee: ["affiliate", "media-access"],
  pinterest: ["publishing", "media-access"],
};

export function AccountPlatformSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-semibold text-slate-900">Choose platform</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Select the platform for this account</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Platform selection">
        {ORDER.map((platform) => {
          const Icon = ICON_MAP[platform];
          const isSelected = selected === platform;
          const capabilities = UI_PLATFORM_CAPABILITIES[platform];
          return (
            <button
              key={platform}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(platform as AccountPlatform)}
              className={cn(
                "flex flex-col gap-2.5 rounded-xl border p-3.5 text-left shadow-sm transition-all duration-150",
                isSelected
                  ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white", PLATFORM_TONE[platform])}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[14px] font-semibold text-slate-900">{PLATFORM_DISPLAY[platform]}</span>
              </span>
              <span className="text-[11px] leading-4 text-slate-600">{PLATFORM_DESCRIPTION[platform]}</span>
              <span className="flex flex-wrap gap-1">
                {capabilities.slice(0, 2).map((cap) => (
                  <span key={cap} className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">
                    {PLATFORM_CAPABILITY_LABELS[cap]}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
