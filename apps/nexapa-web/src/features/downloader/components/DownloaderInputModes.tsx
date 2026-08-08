import { useRef, useEffect, useState } from "react";
import { Link, ListPlus, Users } from "lucide-react";
import type { InputMode } from "../downloader.types";
import { cn } from "@/lib/cn";

type Props = {
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
};

const MODES: { key: InputMode; label: string; icon: typeof Link }[] = [
  { key: "single", label: "Single URL", icon: Link },
  { key: "multiple", label: "Multiple URLs", icon: ListPlus },
  { key: "profile", label: "Profile / Channel", icon: Users },
];

export function DownloaderInputModes({ mode, onModeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-mode="${mode}"]`) as HTMLElement | null;
    if (activeBtn) {
      setIndicator({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [mode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-950">Add media</h2>
          <p className="mt-0.5 text-[12px] text-slate-700">Validated locally — no network request</p>
        </div>

        <div
          ref={containerRef}
          role="tablist"
          aria-label="Downloader input mode"
          className="relative inline-flex self-start overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl"
        >
          <div
            className="absolute top-1 bottom-1 rounded-lg border border-white/20 bg-white/18 shadow-sm transition-all duration-200 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
            aria-hidden="true"
          />
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              data-mode={key}
              aria-selected={mode === key}
              aria-controls={`${key}-panel`}
              onClick={() => onModeChange(key)}
              className={cn(
                "relative z-10 inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                mode === key ? "text-slate-950" : "text-slate-700 hover:bg-white/12 hover:text-slate-950",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
