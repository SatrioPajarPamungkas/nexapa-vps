import { PlatformCard } from "./PlatformCard";
import type { AccountPlatform } from "../connected-accounts.types";

type AccountPlatformFilter = "all" | AccountPlatform;

type PlatformCounts = {
  tiktok: number;
  facebook: number;
  shopee: number;
};

type UiPlatformId = "tiktok" | "facebook" | "instagram" | "youtube" | "pinterest" | "shopee";

type Props = {
  selectedPlatform: AccountPlatformFilter;
  onPlatformSelect: (platform: AccountPlatformFilter) => void;
  counts: PlatformCounts;
};

export function PlatformGrid({ selectedPlatform, onPlatformSelect, counts }: Props) {
  const platforms: Array<{ id: UiPlatformId; coming?: boolean }> = [
    { id: "tiktok" },
    { id: "facebook" },
    { id: "shopee" },
    { id: "instagram", coming: true },
    { id: "youtube", coming: true },
    { id: "pinterest", coming: true },
  ];

  return (
    <section className="mt-5 bg-transparent">
      <div className="mb-3 flex items-center justify-between bg-transparent">
        <h2 className="text-[14px] font-semibold text-slate-900 drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)]">Publishing Platforms</h2>
        <button
          type="button"
          onClick={() => onPlatformSelect("all")}
          className={`rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-xl transition ${
            selectedPlatform === "all"
              ? "border-white/20 bg-white/18 text-slate-900 shadow-sm"
              : "border-white/15 bg-white/8 text-slate-600 hover:bg-white/15 hover:text-slate-900"
          }`}
        >
          {selectedPlatform === "all" ? "Showing all" : "View all"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 bg-transparent sm:grid-cols-3 lg:grid-cols-6">
        {platforms.map((p) => {
          const count = (p.id === "tiktok" || p.id === "facebook" || p.id === "shopee") ? counts[p.id] : 0;
          const isSelected = selectedPlatform === p.id;
          return (
            <PlatformCard
              key={p.id}
              platform={p.id}
              count={count}
              comingSoon={p.coming}
              isSelected={isSelected}
              onClick={p.coming ? undefined : () => onPlatformSelect(p.id as AccountPlatformFilter)}
            />
          );
        })}
      </div>
    </section>
  );
}
