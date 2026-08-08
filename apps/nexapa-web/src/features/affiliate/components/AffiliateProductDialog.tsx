import { useState, useEffect, useRef, useId } from "react";
import { X, Upload } from "lucide-react";
import type { AffiliateProduct, AffiliateSource } from "../affiliate.types";
import { AFFILIATE_SOURCES, SOURCE_LABELS, MAX_PRODUCT_NAME, MAX_SELLER_NAME, MAX_PRODUCT_ID, MAX_PRODUCT_NOTES } from "../affiliate.constants";
import { isValidHttpUrl } from "../affiliate.utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<AffiliateProduct, "id" | "createdAt" | "updatedAt" | "selected" | "isDemo" | "status">) => boolean;
  onBatchImport: (source: AffiliateSource, urls: string[]) => { added: number; skippedDuplicate: number; skippedMalformed: number; skippedFull: number };
  editProduct?: AffiliateProduct | null;
  onUpdate?: (id: string, patch: Partial<AffiliateProduct>) => void;
};

export function AffiliateProductDialog({ open, onClose, onSave, onBatchImport, editProduct, onUpdate }: Props) {
  return <AffiliateProductDialogInner key={editProduct?.id ?? "__new__"} open={open} onClose={onClose} onSave={onSave} onBatchImport={onBatchImport} editProduct={editProduct} onUpdate={onUpdate} />;
}

function AffiliateProductDialogInner({ open, onClose, onSave, onBatchImport, editProduct, onUpdate }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const [source, setSource] = useState<AffiliateSource>(editProduct?.source ?? "generic");
  const [productName, setProductName] = useState(editProduct?.productName ?? "");
  const [sellerName, setSellerName] = useState(editProduct?.sellerName ?? "");
  const [productUrl, setProductUrl] = useState(editProduct?.productUrl ?? "");
  const [affiliateUrl, setAffiliateUrl] = useState(editProduct?.affiliateUrl ?? "");
  const [productIdVal, setProductIdVal] = useState(editProduct?.productId ?? "");
  const [category, setCategory] = useState(editProduct?.category ?? "");
  const [priceText, setPriceText] = useState(editProduct?.priceText ?? "");
  const [commissionText, setCommissionText] = useState(editProduct?.commissionText ?? "");
  const [imageUrl, setImageUrl] = useState(editProduct?.imageUrl ?? "");
  const [tagsInput, setTagsInput] = useState(editProduct?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(editProduct?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [importMode, setImportMode] = useState<"single" | "batch">("single");
  const [batchUrls, setBatchUrls] = useState("");
  const [batchSource, setBatchSource] = useState<AffiliateSource>("generic");

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

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!source) e.source = "Select a source";
    if (!productName.trim()) e.productName = "Product name is required";
    if (productName.length > MAX_PRODUCT_NAME) e.productName = `Max ${MAX_PRODUCT_NAME} characters`;
    if (sellerName.length > MAX_SELLER_NAME) e.sellerName = `Max ${MAX_SELLER_NAME} characters`;
    if (!productUrl.trim()) e.productUrl = "Product URL is required";
    else if (!isValidHttpUrl(productUrl)) e.productUrl = "Must be a valid HTTP or HTTPS URL";
    if (affiliateUrl.trim() && !isValidHttpUrl(affiliateUrl)) e.affiliateUrl = "Must be a valid HTTP or HTTPS URL";
    if (productIdVal.length > MAX_PRODUCT_ID) e.productId = `Max ${MAX_PRODUCT_ID} characters`;
    if (notes.length > MAX_PRODUCT_NOTES) e.notes = `Max ${MAX_PRODUCT_NOTES} characters`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (importMode === "batch") {
      handleBatchImport();
      return;
    }
    if (!validate()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const data = {
      source,
      productName: productName.trim(),
      sellerName: sellerName.trim(),
      productUrl: productUrl.trim(),
      affiliateUrl: affiliateUrl.trim(),
      productId: productIdVal.trim(),
      category: category.trim(),
      priceText: priceText.trim(),
      commissionText: commissionText.trim(),
      imageUrl: imageUrl.trim(),
      notes: notes.trim(),
      tags,
    };

    if (editProduct && onUpdate) {
      onUpdate(editProduct.id, data);
      onClose();
      return;
    }

    const ok = onSave(data);
    if (ok) onClose();
  }

  function handleBatchImport() {
    const urls = batchUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      setErrors({ batch: "Enter at least one URL" });
      return;
    }
    onBatchImport(batchSource, urls);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="relative m-auto max-h-[90vh] w-[92vw] max-w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-[15px] font-semibold text-slate-900">
              {editProduct ? "Edit Product" : "Add Product"}
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">
              {editProduct ? "Changes affect only the current browser session." : "Product data is stored locally. No platform synchronization was performed."}
            </p>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!editProduct && (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setImportMode("single")} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium ${importMode === "single" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              Single product
            </button>
            <button type="button" onClick={() => setImportMode("batch")} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium ${importMode === "batch" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Multiple URLs
            </button>
          </div>
        )}

        {importMode === "batch" && !editProduct ? (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="batch-source" className="block text-[12px] font-medium text-slate-700">Affiliate source (applies to all)</label>
              <select id="batch-source" value={batchSource} onChange={(e) => setBatchSource(e.target.value as AffiliateSource)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                {AFFILIATE_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="batch-urls" className="block text-[12px] font-medium text-slate-700">Product URLs (one per line)</label>
              <textarea id="batch-urls" value={batchUrls} onChange={(e) => setBatchUrls(e.target.value)} rows={6} placeholder={"https://example.com/product-1\nhttps://example.com/product-2"} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-mono leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <p className="mt-1 text-[11px] text-slate-500">One URL per line. Malformed URLs are skipped. Duplicates are skipped. Max capacity enforced.</p>
            </div>
            {errors.batch && <p className="text-[11px] text-rose-600">{errors.batch}</p>}
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
              Product metadata has not been retrieved. Generated product names will be neutral drafts.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pd-source" className="block text-[12px] font-medium text-slate-700">Affiliate source <span className="text-rose-600">*</span></label>
                <select id="pd-source" value={source} onChange={(e) => setSource(e.target.value as AffiliateSource)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  {AFFILIATE_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
                {errors.source && <p className="mt-1 text-[11px] text-rose-600">{errors.source}</p>}
              </div>
              <div>
                <label htmlFor="pd-name" className="block text-[12px] font-medium text-slate-700">Product name <span className="text-rose-600">*</span></label>
                <input id="pd-name" value={productName} onChange={(e) => setProductName(e.target.value)} maxLength={MAX_PRODUCT_NAME} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                {errors.productName && <p className="mt-1 text-[11px] text-rose-600">{errors.productName}</p>}
              </div>
              <div>
                <label htmlFor="pd-seller" className="block text-[12px] font-medium text-slate-700">Seller / store name</label>
                <input id="pd-seller" value={sellerName} onChange={(e) => setSellerName(e.target.value)} maxLength={MAX_SELLER_NAME} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                {errors.sellerName && <p className="mt-1 text-[11px] text-rose-600">{errors.sellerName}</p>}
              </div>
              <div>
                <label htmlFor="pd-sku" className="block text-[12px] font-medium text-slate-700">Product ID / SKU</label>
                <input id="pd-sku" value={productIdVal} onChange={(e) => setProductIdVal(e.target.value)} maxLength={MAX_PRODUCT_ID} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                {errors.productId && <p className="mt-1 text-[11px] text-rose-600">{errors.productId}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="pd-url" className="block text-[12px] font-medium text-slate-700">Original product URL <span className="text-rose-600">*</span></label>
              <input id="pd-url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://..." className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {errors.productUrl && <p className="mt-1 text-[11px] text-rose-600">{errors.productUrl}</p>}
            </div>

            <div>
              <label htmlFor="pd-aff" className="block text-[12px] font-medium text-slate-700">Affiliate tracking URL</label>
              <input id="pd-aff" value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)} placeholder="https://..." className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {errors.affiliateUrl && <p className="mt-1 text-[11px] text-rose-600">{errors.affiliateUrl}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="pd-cat" className="block text-[12px] font-medium text-slate-700">Category</label>
                <input id="pd-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label htmlFor="pd-price" className="block text-[12px] font-medium text-slate-700">Price reference</label>
                <input id="pd-price" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="e.g. USD 29.99" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label htmlFor="pd-comm" className="block text-[12px] font-medium text-slate-700">Commission reference</label>
                <input id="pd-comm" value={commissionText} onChange={(e) => setCommissionText(e.target.value)} placeholder="e.g. 8%" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div>
              <label htmlFor="pd-img" className="block text-[12px] font-medium text-slate-700">Image URL (optional)</label>
              <input id="pd-img" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div>
              <label htmlFor="pd-tags" className="block text-[12px] font-medium text-slate-700">Tags (comma-separated)</label>
              <input id="pd-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. electronics, trending" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div>
              <label htmlFor="pd-notes" className="block text-[12px] font-medium text-slate-700">Notes</label>
              <textarea id="pd-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={MAX_PRODUCT_NOTES} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {errors.notes && <p className="mt-1 text-[11px] text-rose-600">{errors.notes}</p>}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {importMode === "batch" ? "Import Products" : editProduct ? "Save Changes" : "Add Product"}
          </button>
        </div>

        <div aria-live="polite" className="sr-only">
          {Object.values(errors).map((e, i) => <span key={i}>{e}</span>)}
        </div>
      </div>
    </div>
  );
}
