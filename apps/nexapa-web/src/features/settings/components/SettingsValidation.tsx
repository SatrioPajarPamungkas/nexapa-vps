import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { ValidationItem, SettingsSection } from "../settings.types";
import { cn } from "@/lib/cn";

type Props = {
  items: ValidationItem[];
  onNavigate: (section: SettingsSection, platform?: ValidationItem["platform"]) => void;
  visible: boolean;
};

const TONE: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  required: { icon: AlertTriangle, cls: "border-rose-200 bg-rose-50 text-rose-700" },
  warning: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  "backend-required": { icon: Info, cls: "border-blue-200 bg-blue-50 text-blue-700" },
  "complete-locally": { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

export function SettingsValidation({ items, onNavigate, visible }: Props) {
  if (!visible) return null;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-700">
        No validation issues. Local configuration looks complete. Platform approval still required.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[12px] font-semibold text-slate-900">Validation ({items.length})</h3>
      <div className="space-y-1.5">
        {items.map((it) => {
          const tone = TONE[it.severity] ?? TONE["complete-locally"];
          const Icon = tone.icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onNavigate(it.section, it.platform)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-[11px] leading-4 transition-colors hover:brightness-[0.98]",
                tone.cls,
              )}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{it.label}</span>
                <span className="ml-1 opacity-60">{it.section}{it.platform ? ` / ${it.platform}` : ""}</span>
                <span className="block opacity-80">{it.message}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
