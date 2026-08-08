import { useState, useEffect, useRef, useId } from "react";
import { X, ExternalLink, Pencil, Link2, Tag, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { AffiliateProduct } from "../affiliate.types";
import { SourceBadge } from "./SourceBadge";
import { getProductStatusLabel, formatAffiliateDate, copyToClipboard } from "../affiliate.utils";

type Props = {
  product: AffiliateProduct;
  onClose: () => void;
  onEdit: (product: AffiliateProduct) => void;
  onCopyProductUrl: (url: string) => void;
  onCopyAffiliateUrl: (url: string) => void;
  onAddToCampaign: (product: AffiliateProduct) => void;
  onToggleInactive: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ProductDetailsDialog({ product, onClose, onEdit, onAddToCampaign, onToggleInactive, onRemove }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      window.setTimeout(() => prevFocusRef.current?.focus(), 0);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleCopy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setFeedback(`${label} copied`);
      window.setTimeout(() => setFeedback(""), 2500);
    } else {
      setFeedback("Clipboard failed");
      window.setTimeout(() => setFeedback(""), 2500);
    }
  }

  const isInactive = product.status === "inactive";

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="relative m-auto max-h-[90vh] w-[92vw] max-w-[600px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id={titleId} className="truncate text-[15px] font-semibold text-slate-900">{product.productName}</h2>
              <SourceBadge source={product.source} isDemo={product.isDemo} />
            </div>
            {product.sellerName && <p className="mt-0.5 text-[12px] text-slate-500">{product.sellerName}</p>}
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <InfoRow label="Source" value={product.source} />
          {product.productId && <InfoRow label="Product ID" value={product.productId} />}
          {product.category && <InfoRow label="Category" value={product.category} />}
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Product URL</span>
            <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block break-all text-[12px] text-blue-600 underline decoration-dashed underline-offset-2 hover:text-blue-800">
              {product.productUrl}
            </a>
          </div>
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Affiliate URL</span>
            {product.affiliateUrl ? (
              <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block break-all text-[12px] text-emerald-600 underline decoration-dashed underline-offset-2 hover:text-emerald-800">
                {product.affiliateUrl}
              </a>
            ) : (
              <p className="mt-0.5 text-[12px] text-amber-600">Not set</p>
            )}
          </div>
          {product.priceText && <InfoRow label="Price reference" value={product.priceText} />}
          {product.commissionText && <InfoRow label="Commission reference" value={product.commissionText} />}
          {product.tags.length > 0 && (
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Tags</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {product.tags.map((t) => (
                  <span key={t} className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">{t}</span>
                ))}
              </div>
            </div>
          )}
          <InfoRow label="Status" value={getProductStatusLabel(product.status)} />
          <InfoRow label="Created" value={formatAffiliateDate(product.createdAt)} />
          <InfoRow label="Updated" value={formatAffiliateDate(product.updatedAt)} />
          {product.notes && (
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Notes</span>
              <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-slate-700">{product.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-800 ring-1 ring-blue-200">
          This product exists in local browser memory only. No platform synchronization, link verification, or commission confirmation has been performed.
        </div>

        {feedback && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800" aria-live="polite">{feedback}</div>}

        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">Close</button>
          <button type="button" onClick={() => { onEdit(product); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </button>
          <button type="button" onClick={() => handleCopy(product.productUrl, "Product URL")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Copy product URL
          </button>
          {product.affiliateUrl && (
            <button type="button" onClick={() => handleCopy(product.affiliateUrl, "Affiliate URL")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Copy affiliate URL
            </button>
          )}
          <button type="button" onClick={() => { onAddToCampaign(product); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700 hover:bg-blue-100">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Add to campaign
          </button>
          <button type="button" onClick={() => { onToggleInactive(product.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
            {isInactive ? <><ToggleRight className="h-3.5 w-3.5" aria-hidden="true" /> Reactivate</> : <><ToggleLeft className="h-3.5 w-3.5" aria-hidden="true" /> Mark inactive</>}
          </button>
          <button type="button" onClick={() => { onRemove(product.id); onClose(); }} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <p className="mt-0.5 text-[12px] text-slate-700">{value}</p>
    </div>
  );
}
