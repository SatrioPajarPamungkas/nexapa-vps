import { useMemo } from "react";
import { Trash2, Type, Hash, Link as LinkIcon } from "lucide-react";
import { analyzeCaption } from "../publisher.utils";
import type { PublishPlatform } from "../publisher.types";
import { ADVISORY_LIMITS } from "../publisher.constants";

type Props = {
  caption: string;
  selectedPlatforms: PublishPlatform[];
  onChange: (v: string) => void;
  onClear: () => void;
  onAddHashtag: (tag: string) => void;
};

export function CaptionEditor({ caption, selectedPlatforms, onChange, onClear, onAddHashtag }: Props) {
  const analysis = useMemo(() => analyzeCaption(caption), [caption]);
  const showToolbar = true;

  const advisory = useMemo(() => {
    if (selectedPlatforms.length === 0) return { limit: ADVISORY_LIMITS.global, label: "Advisory limit" };
    let min = ADVISORY_LIMITS.global;
    for (const p of selectedPlatforms) {
      const l = ADVISORY_LIMITS[p as keyof typeof ADVISORY_LIMITS] as number | undefined;
      if (l && l < min) min = l;
    }
    return { limit: min, label: "Advisory limit" };
  }, [selectedPlatforms]);

  const overLimit = analysis.trimmedLength > advisory.limit;
  const usagePercent = Math.min((analysis.trimmedLength / advisory.limit) * 100, 100);

  return (
    <div className="space-y-3 bg-transparent">
      <div className="flex items-center justify-between bg-transparent">
        <label htmlFor="caption-editor" className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900"><Type className="h-4 w-4 text-slate-400" aria-hidden="true" /> Caption</label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 backdrop-blur-xl">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/20"><div className={cn("h-full rounded-full transition-all", overLimit ? "bg-rose-500" : usagePercent > 80 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${usagePercent}%` }} /></div>
            <span className={cn("text-[11px] tabular-nums", overLimit ? "font-medium text-rose-700" : "text-slate-600")}>{analysis.trimmedLength}/{advisory.limit}</span>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border border-white/20 bg-white/12 backdrop-blur-xl focus-within:border-blue-400/60 focus-within:bg-white/20 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
        {showToolbar && (
          <div className="flex items-center gap-0.5 border-b border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl">
            <button type="button" onClick={() => { const ta = document.getElementById("caption-editor") as HTMLTextAreaElement | null; if (ta) { const start = ta.selectionStart; const end = ta.selectionEnd; const newVal = caption.substring(0, start) + "\n" + caption.substring(end); onChange(newVal); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; }); } }} className="inline-flex h-7 items-center gap-1 rounded-lg border border-transparent px-2 text-[11px] text-slate-600 hover:bg-white/15 hover:text-slate-800" title="Add line break"><span className="text-[10px]">&darr;</span> Break</button>
            <div className="mx-1 h-3 w-px bg-white/15" />
            <button type="button" onClick={() => onAddHashtag("#content")} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-600 hover:bg-white/15 hover:text-slate-800"><Hash className="h-3 w-3" /> Tag</button>
            <div className="mx-1 h-3 w-px bg-white/15" />
            <button type="button" onClick={() => { const ta = document.getElementById("caption-editor") as HTMLTextAreaElement | null; if (ta) { const start = ta.selectionStart; const end = ta.selectionEnd; const disclosure = "\n\n#ad #sponsored"; const newVal = caption.substring(0, start) + disclosure + caption.substring(end); onChange(newVal); } }} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-600 hover:bg-white/15 hover:text-slate-800"><LinkIcon className="h-3 w-3" /> Disclosure</button>
            <div className="flex-1" />
            <button type="button" onClick={onClear} className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-400/20 bg-red-500/10 px-2 text-[11px] text-red-700 hover:bg-red-500/15" aria-label="Clear caption"><Trash2 className="h-3 w-3" /> Clear</button>
          </div>
        )}

        <textarea id="caption-editor" value={caption} onChange={(e) => onChange(e.target.value)} placeholder="Write your post caption... Hashtags, mentions, and links are detected locally." rows={5} aria-label="Post caption" aria-describedby="caption-help" className="min-h-[120px] w-full resize-y rounded-b-xl border-none bg-transparent p-3 text-[13px] leading-6 text-slate-950 placeholder:text-slate-600 focus:outline-none" />
      </div>

      <div id="caption-help" className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
        <span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 backdrop-blur-xl">{analysis.lineCount} line{analysis.lineCount !== 1 ? "s" : ""}</span>
        {analysis.hashtagCount > 0 && <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-400/25 bg-blue-500/12 px-1.5 py-0.5 text-blue-800 backdrop-blur-xl"><Hash className="h-2.5 w-2.5" /> {analysis.hashtagCount}</span>}
        {analysis.mentions.length > 0 && <span className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-slate-600 backdrop-blur-xl">@{analysis.mentions.length}</span>}
        {analysis.links.length > 0 && <span className="inline-flex items-center gap-0.5 rounded-full border border-cyan-400/25 bg-cyan-500/12 px-1.5 py-0.5 text-cyan-800 backdrop-blur-xl"><LinkIcon className="h-2.5 w-2.5" /> {analysis.links.length}</span>}
        <span className="ml-auto">Frontend advisory &middot; Backend validates</span>
      </div>

      {overLimit && <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-800 backdrop-blur-xl">Caption exceeds frontend advisory limit. Final validation occurs before publishing and platform policy may vary.</p>}
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
