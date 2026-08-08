import { Search, LayoutGrid, List, X, Filter } from "lucide-react";
import type { AffiliateSource, ProductSortKey, ProductAffiliateFilter, ProductViewMode } from "../affiliate.types";
import { AFFILIATE_SOURCES, SOURCE_LABELS, SORT_OPTIONS } from "../affiliate.constants";
import { PRODUCT_STATUS_LABELS } from "../affiliate.constants";
import { cn } from "@/lib/cn";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  sourceFilter: AffiliateSource | "all";
  onSourceFilterChange: (v: AffiliateSource | "all") => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  affiliateFilter: ProductAffiliateFilter;
  onAffiliateFilterChange: (v: ProductAffiliateFilter) => void;
  sortKey: ProductSortKey;
  onSortKeyChange: (v: ProductSortKey) => void;
  viewMode: ProductViewMode;
  onViewModeChange: (v: ProductViewMode) => void;
  visibleCount: number;
  selectedCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  ...Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const AFFILIATE_FILTER_OPTIONS: Array<{ value: ProductAffiliateFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "has-link", label: "Has link" },
  { value: "missing-link", label: "No link" },
];

export function AffiliateToolbar({
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  statusFilter,
  onStatusFilterChange,
  affiliateFilter,
  onAffiliateFilterChange,
  sortKey,
  onSortKeyChange,
  viewMode,
  onViewModeChange,
  visibleCount,
  selectedCount,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
      <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2 text-[11px] placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
        />
      </div>

      <Filter className="h-3.5 w-3.5 text-slate-400" />

      <select
        value={sourceFilter}
        onChange={(e) => onSourceFilterChange(e.target.value as AffiliateSource | "all")}
        aria-label="Filter by source"
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        <option value="all">All sources</option>
        {AFFILIATE_SOURCES.map((s) => (
          <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        aria-label="Filter by status"
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={affiliateFilter}
        onChange={(e) => onAffiliateFilterChange(e.target.value as ProductAffiliateFilter)}
        aria-label="Filter by link status"
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        {AFFILIATE_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={sortKey}
        onChange={(e) => onSortKeyChange(e.target.value as ProductSortKey)}
        aria-label="Sort products"
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>

      <div className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="View mode">
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          aria-pressed={viewMode === "grid"}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
          )}
          title="Grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          aria-pressed={viewMode === "list"}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
          )}
          title="List view"
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <span className="tabular-nums">{visibleCount}</span>
        {selectedCount > 0 && <span className="font-medium text-blue-600">{selectedCount} sel</span>}
        {hasActiveFilters && (
          <button type="button" onClick={onClearFilters} className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="h-2.5 w-2.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
