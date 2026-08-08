import { useState, useEffect, useRef, useId } from "react";
import { X, Info } from "lucide-react";
import type { AffiliateCampaign, AffiliateProduct } from "../affiliate.types";
import { CAMPAIGN_PLATFORMS, DEFAULT_DISCLOSURE, MAX_CAMPAIGN_NAME, MAX_CAMPAIGN_DESCRIPTION, MAX_CAMPAIGN_NOTES } from "../affiliate.constants";
import { getSourceLabel } from "../affiliate.utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<AffiliateCampaign, "id" | "createdAt" | "updatedAt" | "status" | "isDemo">) => boolean;
  products: AffiliateProduct[];
  editCampaign?: AffiliateCampaign | null;
  onUpdate?: (id: string, patch: Partial<AffiliateCampaign>) => void;
};

export function AffiliateCampaignDialog({ open, onClose, onSave, products, editCampaign, onUpdate }: Props) {
  return <AffiliateCampaignDialogInner key={editCampaign?.id ?? "__new__"} open={open} onClose={onClose} onSave={onSave} products={products} editCampaign={editCampaign} onUpdate={onUpdate} />;
}

function AffiliateCampaignDialogInner({ open, onClose, onSave, products, editCampaign, onUpdate }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const [campaignName, setCampaignName] = useState(editCampaign?.campaignName ?? "");
  const [description, setDescription] = useState(editCampaign?.description ?? "");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set(editCampaign?.productIds ?? []));
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(editCampaign?.targetPlatforms ?? []);
  const [destinationLabels, setDestinationLabels] = useState(editCampaign?.destinationLabels.join(", ") ?? "");
  const [contentReference, setContentReference] = useState(editCampaign?.contentReference ?? "");
  const [startDate, setStartDate] = useState(editCampaign?.startDate ?? "");
  const [endDate, setEndDate] = useState(editCampaign?.endDate ?? "");
  const [disclosureText, setDisclosureText] = useState(editCampaign?.disclosureText ?? DEFAULT_DISCLOSURE);
  const [callToAction, setCallToAction] = useState(editCampaign?.callToAction ?? "");
  const [notes, setNotes] = useState(editCampaign?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => dialogRef.current?.focus(), 0);
    } else {
      window.setTimeout(() => prevFocusRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function togglePlatform(platform: string) {
    setTargetPlatforms((prev) => prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]);
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllProducts() {
    setSelectedProductIds(new Set(products.map((p) => p.id)));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!campaignName.trim()) e.campaignName = "Campaign name is required";
    if (campaignName.length > MAX_CAMPAIGN_NAME) e.campaignName = `Max ${MAX_CAMPAIGN_NAME} characters`;
    if (selectedProductIds.size === 0) e.products = "Select at least one product";
    if (startDate && endDate && endDate < startDate) e.dates = "End date cannot be before start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const dests = destinationLabels.split(",").map((d) => d.trim()).filter(Boolean);
    const data = {
      campaignName: campaignName.trim(),
      description: description.trim(),
      productIds: Array.from(selectedProductIds),
      targetPlatforms,
      destinationLabels: dests,
      contentReference: contentReference.trim(),
      startDate,
      endDate,
      disclosureText: disclosureText.trim(),
      callToAction: callToAction.trim(),
      notes: notes.trim(),
    };

    if (editCampaign && onUpdate) {
      onUpdate(editCampaign.id, data);
      onClose();
      return;
    }

    const ok = onSave(data);
    if (ok) onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="relative m-auto max-h-[90vh] w-[92vw] max-w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-[15px] font-semibold text-slate-900">
              {editCampaign ? "Edit Campaign" : "Create Campaign"}
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">Campaign data is stored locally. No platform was contacted.</p>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="camp-name" className="block text-[12px] font-medium text-slate-700">Campaign name <span className="text-rose-600">*</span></label>
            <input id="camp-name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={MAX_CAMPAIGN_NAME} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            {errors.campaignName && <p className="mt-1 text-[11px] text-rose-600">{errors.campaignName}</p>}
          </div>

          <div>
            <label htmlFor="camp-desc" className="block text-[12px] font-medium text-slate-700">Description</label>
            <textarea id="camp-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={MAX_CAMPAIGN_DESCRIPTION} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-medium text-slate-700">Products <span className="text-rose-600">*</span></label>
              <button type="button" onClick={selectAllProducts} className="text-[11px] text-blue-600 hover:underline">Select all</button>
            </div>
            {errors.products && <p className="mt-1 text-[11px] text-rose-600">{errors.products}</p>}
            <div className="mt-1.5 max-h-[160px] overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {products.length === 0 ? (
                <p className="p-3 text-[12px] text-slate-500">No products available. Add products first.</p>
              ) : (
                products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[12px] last:border-0 hover:bg-slate-50">
                    <input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => toggleProduct(p.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="truncate">{getSourceLabel(p.source)} — {p.productName}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-700">Target platforms</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CAMPAIGN_PLATFORMS.map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                  <input type="checkbox" checked={targetPlatforms.includes(p)} onChange={() => togglePlatform(p)} className="sr-only" />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="camp-dest" className="block text-[12px] font-medium text-slate-700">Destination account references (comma-separated)</label>
            <input id="camp-dest" value={destinationLabels} onChange={(e) => setDestinationLabels(e.target.value)} placeholder="e.g. TikTok Account 1, Instagram Pro" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div>
            <label htmlFor="camp-content" className="block text-[12px] font-medium text-slate-700">Content reference</label>
            <input id="camp-content" value={contentReference} onChange={(e) => setContentReference(e.target.value)} placeholder="e.g. product_showcase_v1" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="camp-start" className="block text-[12px] font-medium text-slate-700">Start date</label>
              <input id="camp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label htmlFor="camp-end" className="block text-[12px] font-medium text-slate-700">End date</label>
              <input id="camp-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {errors.dates && <p className="mt-1 text-[11px] text-rose-600">{errors.dates}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="camp-disc" className="block text-[12px] font-medium text-slate-700">Disclosure text</label>
            <input id="camp-disc" value={disclosureText} onChange={(e) => setDisclosureText(e.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div>
            <label htmlFor="camp-cta" className="block text-[12px] font-medium text-slate-700">Call-to-action</label>
            <input id="camp-cta" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} placeholder="e.g. Shop now" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div>
            <label htmlFor="camp-notes" className="block text-[12px] font-medium text-slate-700">Notes</label>
            <textarea id="camp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={MAX_CAMPAIGN_NOTES} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-800 ring-1 ring-blue-200">
          <Info className="mb-1 inline h-3 w-3" aria-hidden="true" /> Shopee remains a product/affiliate source. It is not listed as a direct social publishing target. Campaign activation requires backend connection.
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {editCampaign ? "Save Changes" : "Create Campaign"}
          </button>
        </div>

        <div aria-live="polite" className="sr-only">
          {Object.values(errors).map((e, i) => <span key={i}>{e}</span>)}
        </div>
      </div>
    </div>
  );
}
