import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <div className="glass-card relative overflow-hidden rounded-xl border border-white/20 shadow-card">
      <div className="relative z-10 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
                {eyebrow}
              </p>
              {meta}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px] sm:leading-[1.15]">
              {title}
            </h1>
            <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-slate-600">
              {description}
            </p>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
