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
  "local-draft": "bg-slate-100 text-slate-700 ring-slate-200",
  "link-required": "bg-amber-50 text-amber-700 ring-amber-200",
  "validation-required": "bg-orange-50 text-orange-700 ring-orange-200",
  "backend-required": "bg-blue-50 text-blue-700 ring-blue-200",
  inactive: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function AffiliateProductRow({
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
    <tr
      tabIndex={0}
      aria-selected={isSelected}
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
        "cursor-pointer border-b border-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600",
        isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/50",
      )}
    >
      <td className="px-3 py-2.5">
        <SelectionCheckbox
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          ariaLabel={`${isSelected ? "Deselect" : "Select"} ${product.productName}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-900">{product.productName}</p>
          {product.sellerName && <p className="truncate text-[11px] text-slate-500">{product.sellerName}</p>}
        </div>
      </td>
      <td className="px-3 py-2.5"><SourceBadge source={product.source} isDemo={product.isDemo} /></td>
      <td className="px-3 py-2.5 max-w-[200px]">
        <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[11px] text-blue-600 underline decoration-dashed underline-offset-2 hover:text-blue-800" title={product.productUrl}>
          {product.productUrl}
        </a>
      </td>
      <td className="px-3 py-2.5">
        {product.affiliateUrl ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <Link2 className="h-3 w-3" aria-hidden="true" /> Set
          </span>
        ) : (
          <span className="text-[11px] text-amber-600">Missing</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${statusStyles[product.status]}`}>
          {getProductStatusLabel(product.status)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={() => onOpenDetails(product)} aria-label={`Open details for ${product.productName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onEdit(product)} aria-label={`Edit ${product.productName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onCopyProductUrl(product.productUrl)} aria-label={`Copy product URL for ${product.productName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </button>
          {product.affiliateUrl && (
            <button type="button" onClick={() => onCopyAffiliateUrl(product.affiliateUrl)} aria-label={`Copy affiliate URL for ${product.productName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-50 px-2 text-[11px] text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
              <Link2 className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => onAddToCampaign(product)} aria-label={`Add ${product.productName} to campaign`} className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-50 px-2 text-[11px] text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">
            <Tag className="h-3 w-3" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.productName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-rose-50 px-2 text-[11px] text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}
