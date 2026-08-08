import { cn } from "@/lib/cn";

type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "blue" | "cyan" | "amber" | "green" | "red";
  dot?: boolean;
  className?: string;
};

const toneMap: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
};

const dotToneMap: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-slate-400",
  blue: "bg-blue-600",
  cyan: "bg-cyan-600",
  amber: "bg-amber-500",
  green: "bg-emerald-600",
  red: "bg-rose-600",
};

export function StatusBadge({
  label,
  tone = "neutral",
  dot = true,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        toneMap[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotToneMap[tone])}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
