import { Calendar, Edit3, Copy, ExternalLink, Clock, Trash2, ToggleLeft, ToggleRight, Tag } from "lucide-react";
import type { AffiliateCampaign } from "../affiliate.types";
import { getCampaignStatusLabel } from "../affiliate.utils";
import { DEFAULT_DISCLOSURE } from "../affiliate.constants";

type Props = {
  campaign: AffiliateCampaign;
  productCount: number;
  onOpenDetails: (campaign: AffiliateCampaign) => void;
  onEdit: (campaign: AffiliateCampaign) => void;
  onDuplicate: (id: string) => void;
  onOpenInPublisher: (campaign: AffiliateCampaign) => void;
  onPrepareSchedule: (campaign: AffiliateCampaign) => void;
  onToggleInactive: (id: string) => void;
  onRemove: (id: string) => void;
};

const statusStyles: Record<AffiliateCampaign["status"], string> = {
  "local-draft": "bg-slate-100 text-slate-700 ring-slate-200",
  "missing-product": "bg-amber-50 text-amber-700 ring-amber-200",
  "missing-link": "bg-orange-50 text-orange-700 ring-orange-200",
  "backend-required": "bg-blue-50 text-blue-700 ring-blue-200",
  "ready-locally": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function AffiliateCampaignCard({
  campaign,
  productCount,
  onOpenDetails,
  onEdit,
  onDuplicate,
  onOpenInPublisher,
  onPrepareSchedule,
  onToggleInactive,
  onRemove,
}: Props) {
  const isActive = campaign.status !== "inactive";
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[13px] font-semibold text-slate-900">{campaign.campaignName}</h4>
          {campaign.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{campaign.description}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${statusStyles[campaign.status]}`}>
            {getCampaignStatusLabel(campaign.status)}
          </span>
          {campaign.isDemo && (
            <span className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">DEMO</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Tag className="h-3 w-3" aria-hidden="true" />
          {productCount} product{productCount !== 1 ? "s" : ""}
        </span>
        {campaign.targetPlatforms.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {campaign.targetPlatforms.join(", ")}
          </span>
        )}
        {(campaign.startDate || campaign.endDate) && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {campaign.startDate || "\u2014"} to {campaign.endDate || "\u2014"}
          </span>
        )}
        {campaign.disclosureText && campaign.disclosureText !== DEFAULT_DISCLOSURE && (
          <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 ring-1 ring-emerald-200">Disclosure set</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
        <button type="button" onClick={() => onOpenDetails(campaign)} aria-label={`Open details for ${campaign.campaignName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
          <ExternalLink className="h-3 w-3" aria-hidden="true" /> Details
        </button>
        <button type="button" onClick={() => onEdit(campaign)} aria-label={`Edit ${campaign.campaignName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
          <Edit3 className="h-3 w-3" aria-hidden="true" /> Edit
        </button>
        <button type="button" onClick={() => onDuplicate(campaign.id)} aria-label={`Duplicate ${campaign.campaignName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
          <Copy className="h-3 w-3" aria-hidden="true" /> Dup
        </button>
        <button type="button" onClick={() => onOpenInPublisher(campaign)} aria-label={`Open ${campaign.campaignName} in Publisher`} className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-50 px-2 text-[11px] text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">
          <ExternalLink className="h-3 w-3" aria-hidden="true" /> Publisher
        </button>
        <button type="button" onClick={() => onPrepareSchedule(campaign)} aria-label={`Prepare schedule for ${campaign.campaignName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
          <Clock className="h-3 w-3" aria-hidden="true" /> Schedule
        </button>
        <button type="button" onClick={() => onToggleInactive(campaign.id)} aria-label={isActive ? `Mark ${campaign.campaignName} inactive` : `Reactivate ${campaign.campaignName}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-50 px-2 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
          {isActive ? <ToggleLeft className="h-3 w-3" aria-hidden="true" /> : <ToggleRight className="h-3 w-3" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => onRemove(campaign.id)} aria-label={`Remove ${campaign.campaignName}`} className="ml-auto inline-flex h-7 items-center gap-1 rounded-md bg-rose-50 px-2 text-[11px] text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
