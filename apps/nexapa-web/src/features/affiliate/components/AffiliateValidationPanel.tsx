import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import type { AffiliateValidationItem, AffiliateValidationSeverity } from "../affiliate.types";
import { cn } from "@/lib/cn";

type Props = {
  items: AffiliateValidationItem[];
  visible: boolean;
};

const severityConfig: Record<AffiliateValidationSeverity, { icon: typeof AlertTriangle; tone: string }> = {
  "action-required": { icon: AlertTriangle, tone: "border-rose-200 bg-rose-50 text-rose-900" },
  warning: { icon: AlertTriangle, tone: "border-amber-200 bg-amber-50 text-amber-900" },
  "backend-required": { icon: Info, tone: "border-blue-200 bg-blue-50 text-blue-900" },
  "complete-locally": { icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
};

export function AffiliateValidationPanel({ items, visible }: Props) {
  if (!visible || items.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h3 className="text-[13px] font-semibold text-slate-900">Validation results ({items.length})</h3>
      </div>
      <p className="text-[11px] text-slate-500">Actionable validation — no secret values included.</p>
      <div className="mt-3 space-y-2">
        {items.map((it) => {
          const config = severityConfig[it.severity];
          const Icon = config.icon;
          return (
            <div
              key={it.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] leading-5",
                config.tone,
              )}
            >
              <span className="mt-0.5"><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{it.label}</span>
                <span className="mx-1 text-[10px] opacity-60">\u2022 {it.category}</span>
                <span className="block opacity-90">{it.message}</span>
              </span>
              <span className="ml-auto shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium ring-1 ring-black/5">{it.severity}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
