import { ExternalLink, Pencil, Link2, Tag, Trash2 } from "lucide-react";
import type { AffiliateProduct } from "../affiliate.types";
import { SourceBadge } from "./SourceBadge";
import { getProductStatusLabel } from "../affiliate.utils";
import { cn } from "@/lib/cn";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { isInteractiveSelectionTarget, isSelectionToggleKey } from "@/lib/selection";

type Props = {
  product: AffiliateProduct;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetails: (product: AffiliateProduct) => void;
  onEdit: (product: AffiliateProduct) => void;
  onCopyProductUrl: (url: string) => void;
  onCopyAffiliateUrl: (url: string) => void;
  onAddToCampaign: (product: AffiliateProduct) => void;
  onRemove: (id: string) => void;
};

const statusStyles: Record<AffiliateProduct["status"], string> = {
  "local-draft": "bg-slate-100 text-slate-600",
  "link-required": "bg-amber-50 text-amber-700",
  "validation-required": "bg-orange-50 text-orange-700",
  "backend-required": "bg-blue-50 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
};

export function AffiliateProductCard({
  product,
  isSelected,
  onToggleSelect,
  onOpenDetails,
  onEdit,
  onCopyProductUrl,
  onCopyAffiliateUrl,
  onAddToCampaign,
  onRemove,
}: Props) {
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${product.productName}, ${isSelected ? "selected" : "not selected"}. Press Enter or Space to toggle selection.`}
      onClick={(event) => {
        if (!isInteractiveSelectionTarget(event.target)) onToggleSelect(product.id);
      }}
      onKeyDown={(event) => {
        if (isSelectionToggleKey(event.key) && !isInteractiveSelectionTarget(event.target)) {
          event.preventDefault();
          onToggleSelect(product.id);
        }
      }}
      className={cn(
      "group relative rounded-xl border bg-white p-3 shadow-sm transition-all",
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
      isSelected ? "border-blue-300 bg-blue-50/50 shadow-md" : "border-slate-100 hover:border-slate-200 hover:shadow-md",
      product.status === "inactive" && "opacity-60",
    )}>
      {/* Selection */}
      <div className="absolute left-2.5 top-2.5">
        <SelectionCheckbox
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          ariaLabel={`${isSelected ? "Deselect" : "Select"} ${product.productName}`}
        />
      </div>

      {/* Image placeholder */}
      <div className="ml-6 mb-2 flex h-20 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
        ) : (
          <span className="text-[20px] text-slate-300">&#128247;</span>
        )}
      </div>

      {/* Content */}
      <div className="ml-0">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-[12px] font-semibold text-slate-900">{product.productName}</h4>
            {product.sellerName && <p className="mt-0.5 truncate text-[10px] text-slate-500">{product.sellerName}</p>}
          </div>
          <SourceBadge source={product.source} isDemo={product.isDemo} />
        </div>

        {/* Link status */}
        <div className="mt-1.5">
          {product.affiliateUrl ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
              <Link2 className="h-2.5 w-2.5" /> Link set
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
              <Link2 className="h-2.5 w-2.5" /> No link
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {product.category && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{product.category}</span>}
          {product.priceText && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{product.priceText}</span>}
          {product.commissionText && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-600">{product.commissionText}</span>}
          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", statusStyles[product.status])}>
            {getProductStatusLabel(product.status)}
          </span>
        </div>

        {product.isDemo && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-700">Demo</span>}
      </div>

      {/* Actions */}
      <div className="mt-2.5 flex items-center gap-1 border-t border-slate-100 pt-2">
        <button type="button" onClick={() => onOpenDetails(product)} aria-label={`Details for ${product.productName}`} className="inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">
          <ExternalLink className="h-3 w-3" /> View
        </button>
        <button type="button" onClick={() => onEdit(product)} aria-label={`Edit ${product.productName}`} className="inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">
          <Pencil className="h-3 w-3" /> Edit
        </button>
        <button type="button" onClick={() => onCopyProductUrl(product.productUrl)} aria-label={`Copy URL`} className="inline-flex h-6 items-center rounded-md px-1.5 text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">
          Copy
        </button>
        {product.affiliateUrl && (
          <button type="button" onClick={() => onCopyAffiliateUrl(product.affiliateUrl)} aria-label={`Copy affiliate link`} className="inline-flex h-6 items-center rounded-md px-1.5 text-[10px] text-emerald-600 hover:bg-emerald-50 transition-colors">
            Aff.
          </button>
        )}
        <button type="button" onClick={() => onAddToCampaign(product)} aria-label={`Add to campaign`} className="inline-flex h-6 items-center rounded-md px-1.5 text-[10px] text-blue-600 hover:bg-blue-50 transition-colors">
          <Tag className="h-3 w-3" />
        </button>
        <button type="button" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.productName}`} className="ml-auto inline-flex h-6 items-center rounded-md px-1.5 text-[10px] text-rose-500 hover:bg-rose-50 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
