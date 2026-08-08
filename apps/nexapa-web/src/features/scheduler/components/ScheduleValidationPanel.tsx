import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { ValidationItem } from "../scheduler.types";
import { cn } from "@/lib/cn";

type Props = {
  items: ValidationItem[];
};

const TONE: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  "action-required": { icon: AlertTriangle, cls: "border-rose-200 bg-rose-50 text-rose-700" },
  warning: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  "backend-required": { icon: Info, cls: "border-slate-200 bg-slate-50 text-slate-600" },
  "ready-locally": { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export function ScheduleValidationPanel({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const tone = TONE[item.severity] ?? TONE["ready-locally"];
        const Icon = tone.icon;
        return (
          <div key={item.id} className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-4", tone.cls)}>
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{item.label}</span>
              <span className="ml-1 opacity-80">{item.message}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
