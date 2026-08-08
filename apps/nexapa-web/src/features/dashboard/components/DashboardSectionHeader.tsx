import type { ReactNode } from "react";

type DashboardSectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function DashboardSectionHeader({
  title,
  description,
  action,
}: DashboardSectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-navy-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
