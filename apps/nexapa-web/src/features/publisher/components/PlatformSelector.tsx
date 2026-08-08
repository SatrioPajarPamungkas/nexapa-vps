import { useState, useCallback } from "react";
import { Menu, X, Check } from "lucide-react";
import type { PublisherPlatform } from "../publisher.types";

type Props = {
  activePlatform: PublisherPlatform;
  onPlatformChange: (platform: PublisherPlatform) => void;
};

const PLATFORM_OPTIONS: Array<{ value: PublisherPlatform; label: string; description: string }> = [
  { value: "facebook", label: "Facebook", description: "Post ke Facebook Page" },
  { value: "tiktok", label: "TikTok", description: "Post ke TikTok profile" },
  { value: "youtube", label: "YouTube", description: "Post ke YouTube channel" },
  { value: "shopee", label: "Shopee", description: "Post ke Shopee (coming soon)" },
];

export function PlatformSelector({ activePlatform, onPlatformChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (platform: PublisherPlatform) => {
      onPlatformChange(platform);
      setIsOpen(false);
    },
    [onPlatformChange]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const activeLabel = PLATFORM_OPTIONS.find((p) => p.value === activePlatform)?.label || "Platform";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        aria-label="Select publisher platform"
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span className="hidden sm:inline">{activeLabel}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

          <div
            className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/20 bg-white/85 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="platform-selector-label"
          >
            <div className="border-b border-white/10 bg-white/40 px-4 py-3 backdrop-blur-xl">
              <h3 id="platform-selector-label" className="text-[13px] font-semibold text-slate-900">Publisher Platform</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">Pilih platform untuk publishing</p>
            </div>

            <div className="p-2">
              {PLATFORM_OPTIONS.map((option) => {
                const isActive = activePlatform === option.value;
                const isComingSoon = option.value === "youtube" || option.value === "shopee";

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isActive ? "border border-blue-400/35 bg-blue-500/12 shadow-sm" : "border border-transparent hover:border-white/15 hover:bg-white/12"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border backdrop-blur-xl ${isActive ? "border-blue-600 bg-blue-600" : "border-white/30 bg-white/20"}`}>
                      {isActive && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-medium ${isActive ? "text-blue-700" : "text-slate-700"}`}>{option.label}</span>
                        {isComingSoon && <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 backdrop-blur-xl">Soon</span>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
              <p className="text-[10px] text-slate-500">Platform aktif menentukan mode publishing dan validasi</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
