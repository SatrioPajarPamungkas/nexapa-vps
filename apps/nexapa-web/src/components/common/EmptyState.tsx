import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  details,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center sm:p-10",
        className,
      )}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-600">
        {description}
      </p>

      {details && details.length > 0 && (
        <ul className="mx-auto mt-5 max-w-[420px] list-disc space-y-1.5 pl-5 text-left text-[12px] leading-5 text-slate-600">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {actionLabel}
        </button>
      )}

      <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-slate-400">
        Frontend shell only — no backend request performed
      </p>
    </div>
  );
}
