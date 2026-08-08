import { useMemo, useState } from "react";
import { Link2, ArrowRight, RotateCcw, ClipboardCheck, Info } from "lucide-react";
import type { AffiliateProduct, LinkBuilderState } from "../affiliate.types";
import { isValidHttpUrl, copyToClipboard, getSourceLabel } from "../affiliate.utils";
import { AffiliateEmptyState } from "./AffiliateEmptyState";

type Props = {
  products: AffiliateProduct[];
  linkBuilder: LinkBuilderState;
  onLinkBuilderChange: (patch: Partial<LinkBuilderState>) => void;
  generatedLink: string;
  onApplyLink: () => void;
  onReset: () => void;
  onOpenDetails: (product: AffiliateProduct) => void;
};

export function AffiliateLinkBuilder({ products, linkBuilder, onLinkBuilderChange, generatedLink, onApplyLink, onReset, onOpenDetails }: Props) {
  const [feedback, setFeedback] = useState("");

  const selectedProduct = useMemo(
    () => linkBuilder.selectedProductId ? products.find((p) => p.id === linkBuilder.selectedProductId) : null,
    [linkBuilder.selectedProductId, products],
  );

  const baseUrl = selectedProduct ? selectedProduct.affiliateUrl || selectedProduct.productUrl : linkBuilder.manualUrl;
  const isUrlValid = isValidHttpUrl(baseUrl);

  async function handleCopy() {
    if (!generatedLink) return;
    const ok = await copyToClipboard(generatedLink);
    if (ok) {
      setFeedback("Local link copied");
      window.setTimeout(() => setFeedback(""), 2500);
    } else {
      setFeedback("Clipboard failed");
      window.setTimeout(() => setFeedback(""), 2500);
    }
  }

  if (products.length === 0) {
    return <AffiliateEmptyState type="link-builder" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h3 className="text-[14px] font-semibold text-slate-900">Link Builder</h3>
        </div>
        <p className="mt-1 text-[12px] text-slate-500">Prepare a local tracking-link draft. No affiliate platform is contacted.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lb-product" className="block text-[12px] font-medium text-slate-700">Choose existing product</label>
            <select
              id="lb-product"
              value={linkBuilder.selectedProductId}
              onChange={(e) => onLinkBuilderChange({ selectedProductId: e.target.value, manualUrl: "" })}
              className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{getSourceLabel(p.source)} — {p.productName}</option>
              ))}
            </select>
            {selectedProduct && (
              <button type="button" onClick={() => onOpenDetails(selectedProduct)} className="mt-1 text-[11px] text-blue-600 hover:underline">
                View product details
              </button>
            )}
          </div>
          <div>
            <label htmlFor="lb-manual" className="block text-[12px] font-medium text-slate-700">Or paste product URL</label>
            <input
              id="lb-manual"
              value={linkBuilder.manualUrl}
              onChange={(e) => onLinkBuilderChange({ manualUrl: e.target.value, selectedProductId: "" })}
              placeholder="https://example.com/product"
              disabled={!!linkBuilder.selectedProductId}
              className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lb-campaign" className="block text-[12px] font-medium text-slate-700">Campaign name</label>
            <input id="lb-campaign" value={linkBuilder.campaignName} onChange={(e) => onLinkBuilderChange({ campaignName: e.target.value })} placeholder="e.g. summer_sale" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label htmlFor="lb-content" className="block text-[12px] font-medium text-slate-700">Content reference</label>
            <input id="lb-content" value={linkBuilder.contentReference} onChange={(e) => onLinkBuilderChange({ contentReference: e.target.value })} placeholder="e.g. blog_post_01" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label htmlFor="lb-account" className="block text-[12px] font-medium text-slate-700">Account reference</label>
            <input id="lb-account" value={linkBuilder.accountReference} onChange={(e) => onLinkBuilderChange({ accountReference: e.target.value })} placeholder="e.g. creator_jane" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label htmlFor="lb-label" className="block text-[12px] font-medium text-slate-700">Custom label</label>
            <input id="lb-label" value={linkBuilder.customLabel} onChange={(e) => onLinkBuilderChange({ customLabel: e.target.value })} placeholder="e.g. hero_banner" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[12px] font-medium text-slate-700">Tracking parameters</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(["source", "medium", "campaign", "content", "term"] as const).map((key) => (
              <div key={key}>
                <label htmlFor={`lb-t-${key}`} className="block text-[11px] font-medium text-slate-600">utm_{key}</label>
                <input
                  id={`lb-t-${key}`}
                  value={linkBuilder.tracking[key]}
                  onChange={(e) => onLinkBuilderChange({ tracking: { ...linkBuilder.tracking, [key]: e.target.value } })}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-[13px] font-semibold text-slate-900">Local link preview</h4>
        <div className="mt-2 min-h-[48px] rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
          {generatedLink ? (
            <p className="break-all font-mono text-[12px] text-slate-800">{generatedLink}</p>
          ) : (
            <p className="text-[12px] text-slate-400">
              {isUrlValid ? "Configure tracking parameters above" : "Enter a valid product URL to generate a preview"}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!generatedLink}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Copy Local Link
          </button>
          <button
            type="button"
            onClick={onApplyLink}
            disabled={!generatedLink || !linkBuilder.selectedProductId}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" /> Apply to Product Draft
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
          </button>
        </div>

        {feedback && <p className="mt-2 text-[12px] text-emerald-700" aria-live="polite">{feedback}</p>}

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800 ring-1 ring-amber-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Some affiliate platforms require server-generated or platform-issued tracking links. Nexapa API will perform final link creation and verification. No platform-specific secret signatures are generated here.
        </div>
      </div>
    </div>
  );
}
