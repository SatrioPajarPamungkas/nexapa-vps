import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  supporting: string;
  icon: LucideIcon;
  accent: "blue" | "cyan" | "blue-cyan";
  index: number;
};

const accentMap = {
  blue: {
    iconBg: "bg-white/25 backdrop-blur-xl border border-white/25 ring-1 ring-white/10",
    iconText: "text-blue-600",
    sparkline: "#3b82f6",
  },
  cyan: {
    iconBg: "bg-white/25 backdrop-blur-xl border border-white/25 ring-1 ring-white/10",
    iconText: "text-cyan-600",
    sparkline: "#06b6d4",
  },
  "blue-cyan": {
    iconBg: "bg-white/25 backdrop-blur-xl border border-white/25 ring-1 ring-white/10",
    iconText: "text-indigo-600",
    sparkline: "#6366f1",
  },
};

export function DashboardMetricCard({
  label,
  value,
  supporting,
  icon: Icon,
  accent,
  index,
}: DashboardMetricCardProps) {
  const theme = accentMap[accent];

  return (
    <div
      className={cn(
        "glass-card animate-card-enter group relative isolate overflow-hidden rounded-xl border border-white/20 p-5 shadow-card ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover",
        `animate-stagger-${index + 1}`,
      )}
    >

      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-slate-700/80">{label}</p>
          <p className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-[12px] text-slate-600/80">{supporting}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
            theme.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", theme.iconText)} aria-hidden="true" />
        </div>
      </div>

      <svg
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-12 w-24 opacity-[0.06]"
        viewBox="0 0 96 48"
        aria-hidden="true"
      >
        <path
          d="M0 48 L12 44 L24 46 L36 40 L48 42 L60 36 L72 32 L84 28 L96 20"
          fill="none"
          stroke={theme.sparkline}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
