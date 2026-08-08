import { Search, X } from "lucide-react";
import type { AffiliateCampaign, AffiliateProduct } from "../affiliate.types";
import { CAMPAIGN_PLATFORMS } from "../affiliate.constants";
import { CAMPAIGN_STATUS_LABELS } from "../affiliate.constants";
import { AffiliateCampaignCard } from "./AffiliateCampaignCard";
import { AffiliateEmptyState } from "./AffiliateEmptyState";

type Props = {
  campaigns: AffiliateCampaign[];
  products: AffiliateProduct[];
  campaignSearch: string;
  onCampaignSearchChange: (v: string) => void;
  campaignPlatformFilter: string;
  onCampaignPlatformFilterChange: (v: string) => void;
  campaignStatusFilter: string;
  onCampaignStatusFilterChange: (v: string) => void;
  hasActiveCampaignFilters: boolean;
  onClearCampaignFilters: () => void;
  onOpenDetails: (campaign: AffiliateCampaign) => void;
  onEdit: (campaign: AffiliateCampaign) => void;
  onDuplicate: (id: string) => void;
  onOpenInPublisher: (campaign: AffiliateCampaign) => void;
  onPrepareSchedule: (campaign: AffiliateCampaign) => void;
  onToggleInactive: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenCreateCampaign: () => void;
  onLoadDemoCampaigns: () => void;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function AffiliateCampaignList({
  campaigns,
  campaignSearch,
  onCampaignSearchChange,
  campaignPlatformFilter,
  onCampaignPlatformFilterChange,
  campaignStatusFilter,
  onCampaignStatusFilterChange,
  hasActiveCampaignFilters,
  onClearCampaignFilters,
  onOpenDetails,
  onEdit,
  onDuplicate,
  onOpenInPublisher,
  onPrepareSchedule,
  onToggleInactive,
  onRemove,
  onOpenCreateCampaign,
  onLoadDemoCampaigns,
}: Props) {
  if (campaigns.length === 0 && !hasActiveCampaignFilters) {
    return <AffiliateEmptyState type="campaigns" onAdd={onOpenCreateCampaign} onLoadDemo={onLoadDemoCampaigns} />;
  }

  if (campaigns.length === 0 && hasActiveCampaignFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
        <h3 className="text-[15px] font-semibold text-slate-900">No items match these filters</h3>
        <button
          type="button"
          onClick={onClearCampaignFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <X className="h-4 w-4" aria-hidden="true" /> Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={campaignSearch}
            onChange={(e) => onCampaignSearchChange(e.target.value)}
            placeholder="Search campaigns\u2026"
            aria-label="Search campaigns"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={campaignPlatformFilter}
          onChange={(e) => onCampaignPlatformFilterChange(e.target.value)}
          aria-label="Filter by platform"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All platforms</option>
          {CAMPAIGN_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={campaignStatusFilter}
          onChange={(e) => onCampaignStatusFilterChange(e.target.value)}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-[12px] text-slate-500">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {campaigns.map((c) => (
          <AffiliateCampaignCard
            key={c.id}
            campaign={c}
            productCount={c.productIds.length}
            onOpenDetails={onOpenDetails}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onOpenInPublisher={onOpenInPublisher}
            onPrepareSchedule={onPrepareSchedule}
            onToggleInactive={onToggleInactive}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
