import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { SchedulerStatus as SchedulerStatusType } from "@/features/scheduler/scheduler.types";

type Props = {
  status: SchedulerStatusType | null;
  isLoading?: boolean;
};

export function SchedulerStatusBadge({ status, isLoading }: Props) {
  const config = useMemo(() => {
    if (isLoading) {
      return {
        label: "Checking scheduler...",
        tone: "slate" as const,
        pulse: true,
      };
    }

    if (!status) {
      return {
        label: "Scheduler unavailable",
        tone: "red" as const,
        pulse: false,
      };
    }

    if (status.scheduler === "ready") {
      return {
        label: "Scheduler ready",
        tone: "emerald" as const,
        pulse: false,
      };
    }

    return {
      label: "Scheduler heartbeat unavailable",
      tone: "amber" as const,
      pulse: false,
    };
  }, [status, isLoading]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-xl",
        config.tone === "emerald" && "border-emerald-400/25 bg-emerald-500/12 text-emerald-800",
        config.tone === "amber" && "border-amber-400/25 bg-amber-500/12 text-amber-800",
        config.tone === "red" && "border-red-400/25 bg-red-500/12 text-red-800",
        config.tone === "slate" && "border-white/15 bg-white/10 text-slate-700",
        config.pulse && "animate-pulse"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.tone === "emerald" && "bg-emerald-600",
          config.tone === "amber" && "bg-amber-600",
          config.tone === "red" && "bg-rose-600",
          config.tone === "slate" && "bg-slate-600"
        )}
      />
      {config.label}
    </span>
  );
}
