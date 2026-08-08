import type { AffiliateProduct } from "../affiliate.types";
import { AffiliateProductCard } from "./AffiliateProductCard";
import { AffiliateProductRow } from "./AffiliateProductRow";
import { AffiliateEmptyState } from "./AffiliateEmptyState";
import type { ProductViewMode } from "../affiliate.types";

type Props = {
  products: AffiliateProduct[];
  selectedIds: Set<string>;
  viewMode: ProductViewMode;
  onToggleSelect: (id: string) => void;
  onOpenDetails: (product: AffiliateProduct) => void;
  onEdit: (product: AffiliateProduct) => void;
  onCopyProductUrl: (url: string) => void;
  onCopyAffiliateUrl: (url: string) => void;
  onAddToCampaign: (product: AffiliateProduct) => void;
  onRemove: (id: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function AffiliateProductList({
  products,
  selectedIds,
  viewMode,
  onToggleSelect,
  onOpenDetails,
  onEdit,
  onCopyProductUrl,
  onCopyAffiliateUrl,
  onAddToCampaign,
  onRemove,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  if (products.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
          <h3 className="text-[15px] font-semibold text-slate-900">No items match these filters</h3>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Clear filters
          </button>
        </div>
      );
    }
    return <AffiliateEmptyState type="products" />;
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <th className="w-10 px-3 py-2" scope="col"><span className="sr-only">Select</span></th>
              <th className="px-3 py-2" scope="col">Product</th>
              <th className="px-3 py-2" scope="col">Source</th>
              <th className="px-3 py-2" scope="col">Product URL</th>
              <th className="px-3 py-2" scope="col">Affiliate</th>
              <th className="px-3 py-2" scope="col">Status</th>
              <th className="px-3 py-2 text-right" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <AffiliateProductRow
                key={p.id}
                product={p}
                isSelected={selectedIds.has(p.id)}
                onToggleSelect={onToggleSelect}
                onOpenDetails={onOpenDetails}
                onEdit={onEdit}
                onCopyProductUrl={onCopyProductUrl}
                onCopyAffiliateUrl={onCopyAffiliateUrl}
                onAddToCampaign={onAddToCampaign}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <AffiliateProductCard
          key={p.id}
          product={p}
          isSelected={selectedIds.has(p.id)}
          onToggleSelect={onToggleSelect}
          onOpenDetails={onOpenDetails}
          onEdit={onEdit}
          onCopyProductUrl={onCopyProductUrl}
          onCopyAffiliateUrl={onCopyAffiliateUrl}
          onAddToCampaign={onAddToCampaign}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
