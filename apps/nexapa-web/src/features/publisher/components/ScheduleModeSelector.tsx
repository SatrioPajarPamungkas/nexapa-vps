import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ListVideo } from "lucide-react";
import { cn } from "@/lib/cn";

export type PublisherMode = "publish_now" | "schedule" | "auto_bulk";

type Props = {
  mode: PublisherMode;
  onModeChange: (mode: PublisherMode) => void;
  disabled?: boolean;
};

export function ScheduleModeSelector({ mode, onModeChange, disabled }: Props) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-white/15 bg-white/8 p-1 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => onModeChange("publish_now")}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition-all",
          mode === "publish_now"
            ? "border-white/25 bg-white/20 text-slate-950 shadow-sm"
            : "border-transparent bg-transparent text-slate-700 hover:bg-white/10",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >
        <Rocket className="h-3.5 w-3.5" />
        Publish Now
      </button>
      <button
        type="button"
        onClick={() => onModeChange("schedule")}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition-all",
          mode === "schedule"
            ? "border-white/25 bg-white/20 text-slate-950 shadow-sm"
            : "border-transparent bg-transparent text-slate-700 hover:bg-white/10",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        Schedule
      </button>
      <button
        type="button"
        onClick={() => onModeChange("auto_bulk")}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition-all",
          mode === "auto_bulk"
            ? "border-white/25 bg-white/20 text-slate-950 shadow-sm"
            : "border-transparent bg-transparent text-slate-700 hover:bg-white/10",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >
        <ListVideo className="h-3.5 w-3.5" />
        Auto Bulk
      </button>
    </div>
  );
}

export function ScheduleModeSelectorPortal(props: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("publisher-mode-selector"));
  }, []);

  return target ? createPortal(<ScheduleModeSelector {...props} />, target) : null;
}

function Rocket({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
