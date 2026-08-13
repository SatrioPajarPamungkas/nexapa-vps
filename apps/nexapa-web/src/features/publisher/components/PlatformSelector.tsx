import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Menu, X, Check } from "lucide-react";
import type { PublisherPlatform } from "../publisher.types";

type Props = {
  activePlatform: PublisherPlatform;
  onPlatformChange: (platform: PublisherPlatform) => void;
};

const PLATFORM_OPTIONS: Array<{
  value: PublisherPlatform;
  label: string;
  description: string;
}> = [
  {
    value: "facebook",
    label: "Facebook",
    description: "Post ke Facebook Page",
  },
  {
    value: "tiktok",
    label: "TikTok",
    description: "Post ke TikTok profile",
  },
  {
    value: "youtube",
    label: "YouTube",
    description: "Post ke YouTube channel",
  },
  {
    value: "shopee",
    label: "Shopee",
    description: "Post ke Shopee (coming soon)",
  },
];

export function PlatformSelector({
  activePlatform,
  onPlatformChange,
}: Props) {
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

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const activeLabel =
    PLATFORM_OPTIONS.find((p) => p.value === activePlatform)?.label ??
    "Platform";

  const modal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-selector-label"
          >
            <button
              type="button"
              aria-label="Close platform selector"
              onClick={handleClose}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]"
            />

            <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/40 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
              <div className="flex items-start justify-between border-b border-slate-200/70 px-5 py-4 sm:px-6">
                <div>
                  <h3
                    id="platform-selector-label"
                    className="text-[15px] font-semibold text-slate-900"
                  >
                    Publisher Platform
                  </h3>

                  <p className="mt-1 text-[12px] text-slate-500">
                    Pilih platform untuk publishing
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="ml-4 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3">
                <div className="space-y-2">
                  {PLATFORM_OPTIONS.map((option) => {
                    const isActive = activePlatform === option.value;
                    const isComingSoon =
                      option.value === "youtube" ||
                      option.value === "shopee";

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => handleSelect(option.value)}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
                          isActive
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isActive
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isActive && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[13px] font-semibold ${
                                isActive
                                  ? "text-blue-700"
                                  : "text-slate-800"
                              }`}
                            >
                              {option.label}
                            </span>

                            {isComingSoon && (
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                Soon
                              </span>
                            )}

                            {isActive && (
                              <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-700">
                                Active
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-[11px] leading-4 text-slate-500">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200/70 bg-slate-50/90 px-5 py-3">
                <p className="text-[10px] leading-4 text-slate-500">
                  Platform aktif menentukan mode publishing dan validasi.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-3 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        aria-label="Select publisher platform"
        aria-expanded={isOpen}
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">{activeLabel}</span>
      </button>

      {modal}
    </>
  );
}
