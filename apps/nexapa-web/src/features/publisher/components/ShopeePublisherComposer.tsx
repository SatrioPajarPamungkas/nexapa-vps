import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Link2, Package, Save, ShieldCheck, Upload, Video, X } from "lucide-react";
import { loadShopeeDrafts, saveShopeeDraft, type ShopeeDraft } from "@/features/shopee/shopee-store";

const MAX_CAPTION = 2000;

export function ShopeePublisherComposer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedId = params.get("draft");
  const existing = useMemo(() => requestedId ? loadShopeeDrafts().find((item) => item.id === requestedId) : undefined, [requestedId]);
  const [draftId] = useState(() => existing?.id ?? `shopee-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [productUrl, setProductUrl] = useState(existing?.productUrl ?? "");
  const [scheduleAt, setScheduleAt] = useState(existing?.scheduleAt ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const productValid = useMemo(() => !productUrl || /^https:\/\/(?:[^/]+\.)?shopee\.co\.id\//i.test(productUrl), [productUrl]);
  const selectVideo = (file?: File) => {
    if (!file || !file.type.startsWith("video/")) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setVideoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };
  const persist = () => {
    const now = Date.now();
    const draft: ShopeeDraft = {
      id: draftId,
      title: title.trim() || videoFile?.name || existing?.videoName || "Untitled Shopee Video",
      caption,
      productUrl,
      scheduleAt,
      videoName: videoFile?.name ?? existing?.videoName ?? null,
      videoSize: videoFile?.size ?? existing?.videoSize ?? null,
      status: scheduleAt ? "scheduled" : (videoFile || existing?.videoName) && caption.trim() ? "ready" : "draft",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    saveShopeeDraft(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div><p className="text-[13px] font-semibold text-amber-950">Sandbox access pending</p><p className="mt-0.5 text-[11px] leading-4 text-amber-900/75">Draft preparation is active. OAuth, product lookup, upload, and publishing unlock after Shopee approves onboarding.</p></div></div>
        <span className="w-fit rounded-full border border-amber-400/30 bg-white/20 px-3 py-1 text-[10px] font-semibold text-amber-900">LOCAL WORKSPACE</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-2xl">
            <label htmlFor="shopee-title" className="text-[13px] font-semibold text-slate-900">Draft title</label>
            <input id="shopee-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Campaign or video name" className="mt-3 h-10 w-full rounded-xl border border-white/20 bg-white/15 px-4 text-[13px] text-slate-950 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20" />
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-2xl">
            <div className="flex items-center gap-2"><Video className="h-5 w-5 text-orange-600"/><h2 className="text-[14px] font-semibold text-slate-950">Shopee Video</h2></div>
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => selectVideo(e.target.files?.[0])}/>
            {previewUrl ? <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/20 bg-slate-950"><video src={previewUrl} controls className="max-h-[440px] w-full object-contain"/><button type="button" aria-label="Remove video" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setVideoFile(null); if (inputRef.current) inputRef.current.value=""; }} className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white"><X className="h-4 w-4"/></button></div> : <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectVideo(e.dataTransfer.files?.[0]); }} className="mt-4 flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-orange-300/60 bg-orange-500/5 px-6 text-center transition hover:bg-orange-500/10"><Upload className="h-8 w-8 text-orange-500"/><span className="mt-3 text-[13px] font-semibold text-slate-900">Choose or drop a video</span><span className="mt-1 text-[11px] text-slate-500">Video remains in this browser until upload API access is enabled.</span>{existing?.videoName && <span className="mt-2 rounded-full bg-white/30 px-3 py-1 text-[10px] text-slate-600">Previously selected: {existing.videoName}</span>}</button>}
            {videoFile && <p className="mt-2 truncate text-[11px] text-slate-600">{videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>}
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-2xl"><div className="flex items-center justify-between"><label htmlFor="shopee-caption" className="text-[13px] font-semibold text-slate-900">Caption</label><span className="text-[10px] text-slate-500">{caption.length}/{MAX_CAPTION}</span></div><textarea id="shopee-caption" rows={7} maxLength={MAX_CAPTION} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write your Shopee Video caption..." className="mt-3 w-full resize-y rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-[13px] text-slate-950 outline-none placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"/></div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-2xl"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-orange-600"/><h2 className="text-[13px] font-semibold text-slate-900">Affiliate product</h2></div><label htmlFor="shopee-product" className="mt-4 block text-[11px] font-medium text-slate-700">Shopee product URL</label><div className="relative mt-2"><Link2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input id="shopee-product" value={productUrl} onChange={(e) => setProductUrl(e.target.value.trim())} placeholder="https://shopee.co.id/..." className={`h-10 w-full rounded-xl border bg-white/15 pl-9 pr-3 text-[12px] outline-none ${productValid ? "border-white/20 focus:border-orange-400/60" : "border-red-400/60"}`}/></div>{!productValid && <p className="mt-2 text-[10px] text-red-600">Use a valid shopee.co.id URL.</p>}<p className="mt-3 text-[10px] leading-4 text-slate-500">Product lookup and commission validation activate with Sandbox.</p></div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-2xl"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-orange-600"/><label htmlFor="shopee-schedule" className="text-[13px] font-semibold text-slate-900">Schedule</label></div><input id="shopee-schedule" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="mt-4 h-10 w-full rounded-xl border border-white/20 bg-white/15 px-3 text-[12px] text-slate-800 outline-none focus:border-orange-400/60"/></div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-2xl"><button type="button" onClick={persist} disabled={!productValid} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-[12px] font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{saved ? <CheckCircle2 className="h-4 w-4"/> : <Save className="h-4 w-4"/>}{saved ? "Draft saved" : "Save draft"}</button><button type="button" onClick={() => navigate("/shopee/drafts")} className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 text-[12px] font-semibold text-slate-700 hover:bg-white/20">View drafts</button><button type="button" disabled className="mt-2 inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/20 bg-white/10 text-[12px] font-semibold text-slate-400">Publish after Sandbox access</button></div>
        </aside>
      </div>
    </div>
  );
}
