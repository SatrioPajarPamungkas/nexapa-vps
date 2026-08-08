import { useCallback, useEffect, useRef } from "react";
import { X, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DownloaderSettings } from "../downloader.types";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: DownloaderSettings;
  batchLimit: 10 | 25 | 50;
  onSettingsChange: (next: DownloaderSettings) => void;
  onBatchLimitChange: (v: 10 | 25 | 50) => void;
};

export function AdvancedOptionsDrawer({
  open,
  onClose,
  settings,
  batchLimit,
  onSettingsChange,
  onBatchLimitChange,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
        triggerRef.current?.focus();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      const prev = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => {
        panelRef.current?.focus();
        return () => {
          prev?.focus();
        };
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-md transition-opacity duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Advanced download options"
        ref={panelRef}
        tabIndex={-1}
        className="drawer-slide-in fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-white/20 bg-white/75 shadow-2xl ring-1 ring-white/20 backdrop-blur-2xl outline-none sm:w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/18 backdrop-blur-xl">
              <Settings className="h-4 w-4 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-950">Advanced Options</h2>
              <p className="text-[11px] text-slate-600">Secondary download preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advanced options"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-500 backdrop-blur-xl transition hover:bg-white/15 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-950">Filename mode</legend>
              <p className="mt-1 text-[11px] text-slate-600">Controls how downloaded files are named</p>
              <div className="mt-2 space-y-1.5">
                {(["original", "platform_date", "safe_generated"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] backdrop-blur-xl transition",
                      settings.filenameMode === mode
                        ? "border-blue-300/40 bg-blue-500/12 text-blue-900 ring-1 ring-blue-200/40"
                        : "border-white/15 bg-white/8 text-slate-800 hover:bg-white/15",
                    )}
                  >
                    <input
                      type="radio"
                      name="filename-mode"
                      value={mode}
                      checked={settings.filenameMode === mode}
                      onChange={() => onSettingsChange({ ...settings, filenameMode: mode })}
                      className="h-4 w-4 border-white/20 bg-white/15 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="font-medium capitalize">{mode === "platform_date" ? "Platform and date" : mode === "safe_generated" ? "Safe generated" : mode}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-950">Queue delay</legend>
              <p className="mt-1 text-[11px] text-slate-600">Pause between consecutive downloads</p>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {([0, 2, 5, 10, 15] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onSettingsChange({ ...settings, delaySeconds: sec as DownloaderSettings["delaySeconds"] })}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-[12px] font-medium backdrop-blur-xl transition",
                      settings.delaySeconds === sec
                        ? "border-blue-300/40 bg-blue-500/12 text-blue-800 ring-1 ring-blue-200/40"
                        : "border-white/15 bg-white/8 text-slate-700 hover:bg-white/15",
                    )}
                    aria-pressed={settings.delaySeconds === sec}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[12px] font-semibold text-slate-950">Batch limit per add</legend>
              <p className="mt-1 text-[11px] text-slate-600">Maximum items added in one batch operation</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {([10, 25, 50] as const).map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => onBatchLimitChange(limit)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-[12px] font-medium backdrop-blur-xl transition",
                      batchLimit === limit
                        ? "border-blue-300/40 bg-blue-500/12 text-blue-800 ring-1 ring-blue-200/40"
                        : "border-white/15 bg-white/8 text-slate-700 hover:bg-white/15",
                    )}
                    aria-pressed={batchLimit === limit}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-800">Concurrent jobs</span>
                <span className="rounded-full border border-white/15 bg-white/12 px-2 py-0.5 text-[11px] font-medium text-slate-700">1 job</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">
                Concurrency is controlled by the Nexapa download worker.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4">
              <a
                href="/settings"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 hover:text-blue-800"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Manage technical settings
              </a>
              <p className="mt-1 text-[11px] text-slate-600">
                API keys, cookies, proxy, and worker configuration live in Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
