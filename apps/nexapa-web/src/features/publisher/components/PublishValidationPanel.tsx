import { useState } from "react";
import { CheckCircle2, AlertTriangle, Info, ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";
import type { ValidationItem, PublishPlatform } from "../publisher.types";
import { PLATFORM_DISPLAY } from "../publisher.constants";
import { cn } from "@/lib/cn";

type Props = {
  items: ValidationItem[];
};

const TONE: Record<string, { icon: typeof CheckCircle2; bg: string; text: string; border: string }> = {
  ready: { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-800", border: "border-emerald-400/25" },
  "action-required": { icon: AlertTriangle, bg: "bg-amber-500/10", text: "text-amber-800", border: "border-amber-400/25" },
  "backend-required": { icon: Info, bg: "bg-white/8", text: "text-slate-600", border: "border-white/15" },
  warning: { icon: ShieldAlert, bg: "bg-amber-500/10", text: "text-amber-800", border: "border-amber-400/25" },
};

export function PublishValidationPanel({ items }: Props) {
  const [expanded, setExpanded] = useState(false);
  const global = items.filter((i) => i.platform === "global");
  const byPlatform = (p: PublishPlatform) => items.filter((i) => i.platform === p);

  const actionCount = items.filter((i) => i.severity === "action-required").length;
  const backendCount = items.filter((i) => i.severity === "backend-required").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between bg-white/5 px-4 py-3 text-left backdrop-blur-xl transition hover:bg-white/10 sm:px-5" aria-expanded={expanded}>
        <div className="flex items-center gap-2">
          {actionCount > 0 ? <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
          <span className="text-[13px] font-semibold text-slate-900">Review Requirements</span>
        </div>
        <div className="flex items-center gap-2">
          {actionCount > 0 && <span className="rounded-full border border-amber-400/25 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 backdrop-blur-xl">{actionCount} action{actionCount !== 1 ? "s" : ""}</span>}
          {backendCount > 0 && <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur-xl">{backendCount} backend</span>}
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className={cn("rounded-xl border px-3 py-2 text-[11px] font-medium backdrop-blur-xl", actionCount > 0 ? "border-amber-400/25 bg-amber-500/10 text-amber-800" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-800")}>
            {actionCount > 0 ? `${actionCount} item${actionCount !== 1 ? "s" : ""} need attention before local save` : "Composer complete locally. Backend connection and account authorization still required."}
          </div>

          <div className="space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Global</p>{global.map((it) => { const tone = TONE[it.severity]; const Icon = tone.icon; return <div key={it.id} className={cn("flex items-start gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] leading-4 backdrop-blur-xl", tone.bg, tone.text, tone.border)}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><div className="min-w-0 flex-1"><span className="font-medium">{it.label}</span><span className="ml-1 opacity-80">{it.message}</span></div></div>; })}</div>

          {(["tiktok", "facebook", "instagram", "youtube"] as PublishPlatform[]).map((platform) => {
            const list = byPlatform(platform);
            if (list.length === 0) return null;
            const issues = list.filter((i) => i.severity === "action-required").length;
            return <div key={platform} className="space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{PLATFORM_DISPLAY[platform]} {issues > 0 && <span className="text-amber-600">&middot; {issues} issue{issues !== 1 ? "s" : ""}</span>}</p>{list.map((it) => { const tone = TONE[it.severity]; const Icon = tone.icon; return <div key={it.id} className={cn("flex items-start gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] leading-4 backdrop-blur-xl", tone.bg, tone.text, tone.border)}><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><div className="min-w-0 flex-1"><span className="font-medium">{it.label}</span><span className="ml-1 opacity-80">{it.message}</span></div></div>; })}</div>;
          })}

          <p className="text-[10px] text-slate-500">Icons and text communicate status, not color alone.</p>
        </div>
      )}
    </div>
  );
}
