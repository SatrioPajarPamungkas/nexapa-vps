import { useState } from "react";
import { Send, ExternalLink } from "lucide-react";
import type { AffiliateProduct, ContentBinderState } from "../affiliate.types";
import { CAMPAIGN_PLATFORMS } from "../affiliate.constants";
import { getSourceLabel } from "../affiliate.utils";

type Props = {
  products: AffiliateProduct[];
  contentBinder: ContentBinderState;
  onContentBinderChange: (patch: Partial<ContentBinderState>) => void;
  onOpenPublisher: () => void;
  onPreparePublisherDraft: () => void;
};

export function AffiliateContentBinder({ products, contentBinder, onContentBinderChange, onOpenPublisher, onPreparePublisherDraft }: Props) {
  const [feedback, setFeedback] = useState("");

  const selectedProduct = contentBinder.productId ? products.find((p) => p.id === contentBinder.productId) : null;

  const generatedCaption = selectedProduct
    ? `View product: ${selectedProduct.affiliateUrl || selectedProduct.productUrl}`
    : "";

  function togglePlatform(platform: string) {
    const current = contentBinder.targetPlatforms;
    const next = current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform];
    onContentBinderChange({ targetPlatforms: next });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h3 className="text-[14px] font-semibold text-slate-900">Content Binder</h3>
      </div>
      <p className="mt-1 text-[12px] text-slate-500">Prepare content references for Publisher handoff. No media is uploaded.</p>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="cb-product" className="block text-[12px] font-medium text-slate-700">Product</label>
          <select
            id="cb-product"
            value={contentBinder.productId}
            onChange={(e) => onContentBinderChange({ productId: e.target.value })}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">— Select a product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{getSourceLabel(p.source)} — {p.productName}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cb-title" className="block text-[12px] font-medium text-slate-700">Content title / reference</label>
          <input id="cb-title" value={contentBinder.contentTitle} onChange={(e) => onContentBinderChange({ contentTitle: e.target.value })} placeholder="e.g. Summer product showcase reel" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        <div>
          <label htmlFor="cb-media" className="block text-[12px] font-medium text-slate-700">Local media filename / reference</label>
          <input id="cb-media" value={contentBinder.mediaReference} onChange={(e) => onContentBinderChange({ mediaReference: e.target.value })} placeholder="e.g. product_showcase_v1.mp4" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-slate-700">Target platforms</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CAMPAIGN_PLATFORMS.map((p) => (
              <label key={p} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                <input type="checkbox" checked={contentBinder.targetPlatforms.includes(p)} onChange={() => togglePlatform(p)} className="sr-only" />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cb-disclosure" className="block text-[12px] font-medium text-slate-700">Disclosure note</label>
            <input id="cb-disclosure" value={contentBinder.disclosureNote} onChange={(e) => onContentBinderChange({ disclosureNote: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label htmlFor="cb-cta" className="block text-[12px] font-medium text-slate-700">Call-to-action</label>
            <input id="cb-cta" value={contentBinder.callToAction} onChange={(e) => onContentBinderChange({ callToAction: e.target.value })} placeholder="e.g. Shop now" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        <div>
          <label htmlFor="cb-landing" className="block text-[12px] font-medium text-slate-700">Landing link</label>
          <input id="cb-landing" value={contentBinder.landingLink} onChange={(e) => onContentBinderChange({ landingLink: e.target.value })} placeholder="https://..." className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        {generatedCaption && (
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <span className="block text-[11px] font-medium text-slate-500">Suggested caption fragment (draft reference)</span>
            <p className="mt-0.5 break-all text-[12px] text-slate-700 font-mono">{generatedCaption}</p>
            <p className="mt-1 text-[10px] text-slate-400">Do not claim a platform supports clickable caption links. This is a draft reference only.</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onOpenPublisher();
            setFeedback("Navigating to Publisher\u2026");
            window.setTimeout(() => setFeedback(""), 2000);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open Publisher
        </button>
        <button
          type="button"
          onClick={onPreparePublisherDraft}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Send className="h-4 w-4" aria-hidden="true" /> Prepare Publisher Draft
        </button>
      </div>

      {feedback && <p className="mt-2 text-[12px] text-emerald-700" aria-live="polite">{feedback}</p>}
    </div>
  );
}
