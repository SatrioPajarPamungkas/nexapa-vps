import { useState } from "react";
import { Hash, X, Plus } from "lucide-react";
import { HASHTAG_SUGGESTIONS } from "../publisher.constants";
import { normalizeHashtag } from "../publisher.utils";

type Props = {
  hashtags: string[];
  onChangeHashtags: (next: string[]) => void;
  onInjectToCaption: (tag: string) => void;
};

export function HashtagHelper({ hashtags, onChangeHashtags, onInjectToCaption }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function addTag(raw: string) {
    setError("");
    const norm = normalizeHashtag(raw);
    if (!norm) {
      setError("Use letters, numbers, and underscores only");
      return false;
    }
    const lowerSet = new Set(hashtags.map((h) => h.toLowerCase()));
    if (lowerSet.has(norm.toLowerCase())) {
      setError("Duplicate hashtag");
      return false;
    }
    if (hashtags.length >= 30) {
      setError("Maximum 30 hashtags");
      return false;
    }
    onChangeHashtags([...hashtags, norm]);
    return true;
  }

  function removeTag(tag: string) {
    onChangeHashtags(hashtags.filter((h) => h !== tag));
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-slate-500" aria-hidden="true" /><h4 className="text-[13px] font-semibold text-slate-900">Hashtags</h4></div>
        <span className="rounded-full border border-white/15 bg-white/8 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500 backdrop-blur-xl">{hashtags.length}/30</span>
      </div>

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-blue-400/25 bg-blue-500/12 px-2.5 py-1 text-[11px] font-medium text-blue-800 backdrop-blur-xl">
              {tag}
              <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)} className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/10 text-blue-700 hover:bg-blue-500/15"><X className="h-3 w-3" aria-hidden="true" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (addTag(input)) setInput(""); } }} placeholder="Add custom hashtag" aria-label="Add custom hashtag" className="h-9 flex-1 rounded-xl border border-white/20 bg-white/12 px-3 text-[12px] backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
        <button type="button" onClick={() => { if (addTag(input)) setInput(""); }} className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-[12px] font-medium text-white shadow-sm hover:bg-slate-800"><Plus className="h-4 w-4" aria-hidden="true" /> Add</button>
      </div>

      {error && <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-2 py-1 text-[11px] text-red-800 backdrop-blur-xl" role="alert">{error}</p>}

      <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Suggestions</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {HASHTAG_SUGGESTIONS.map((s) => {
            const isActive = hashtags.some((h) => h.toLowerCase() === s.toLowerCase());
            return <button key={s} type="button" disabled={isActive} onClick={() => { if (!isActive) onChangeHashtags([...hashtags, s]); onInjectToCaption(s); }} className={"rounded-full border px-2 py-0.5 text-[10px] backdrop-blur-xl transition-all " + (isActive ? "border-blue-400/25 bg-blue-500/15 text-blue-800 cursor-default" : "border-white/15 bg-white/8 text-slate-600 hover:bg-white/12 hover:text-slate-800")}>{s}</button>;
          })}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Local only &middot; No trend data</p>
      </div>
    </div>
  );
}
