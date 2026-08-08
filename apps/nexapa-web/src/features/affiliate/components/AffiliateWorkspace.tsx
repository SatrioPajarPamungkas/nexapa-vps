import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarClock, Settings as SettingsIcon, Link2 } from "lucide-react";
import { useAffiliateWorkspace } from "../hooks/useAffiliateWorkspace";
import { AFFILIATE_TABS } from "../affiliate.constants";
import { AffiliateToolbar } from "./AffiliateToolbar";
import { AffiliateProductList } from "./AffiliateProductList";
import { AffiliateProductDialog } from "./AffiliateProductDialog";
import { AffiliateSelectionBar } from "./AffiliateSelectionBar";
import { AffiliateLinkBuilder } from "./AffiliateLinkBuilder";
import { AffiliateContentBinder } from "./AffiliateContentBinder";
import { AffiliateCampaignList } from "./AffiliateCampaignList";
import { AffiliateCampaignDialog } from "./AffiliateCampaignDialog";
import { AffiliateValidationPanel } from "./AffiliateValidationPanel";
import { ProductDetailsDialog } from "./ProductDetailsDialog";
import type { AffiliateProduct, AffiliateCampaign } from "../affiliate.types";
import { cn } from "@/lib/cn";

export function AffiliateWorkspace() {
  const navigate = useNavigate();
  const ws = useAffiliateWorkspace();

  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AffiliateProduct | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<AffiliateProduct | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AffiliateCampaign | null>(null);
  const [detailsCampaign, setDetailsCampaign] = useState<AffiliateCampaign | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const handleCopyUrl = useCallback(async (url: string) => {
    if (!url) return;
    const { copyToClipboard } = await import("../affiliate.utils");
    const ok = await copyToClipboard(url);
    ws.announce(ok ? "URL copied to clipboard" : "Clipboard access failed");
  }, [ws]);

  const handleOpenPublisher = useCallback((campaign: AffiliateCampaign) => {
    const products = ws.products.filter((p) => campaign.productIds.includes(p.id));
    navigate("/publisher", {
      state: {
        affiliateHandoff: {
          campaignName: campaign.campaignName,
          productNames: products.map((p) => p.productName),
          affiliateLinks: products.map((p) => p.affiliateUrl || p.productUrl),
          disclosureText: campaign.disclosureText,
          callToAction: campaign.callToAction,
          targetPlatforms: campaign.targetPlatforms,
          destinationLabels: campaign.destinationLabels,
          contentReference: campaign.contentReference,
        },
      },
    });
  }, [ws.products, navigate]);

  const handlePrepareSchedule = useCallback((campaign: AffiliateCampaign) => {
    navigate("/scheduler", {
      state: {
        affiliateHandoff: {
          campaignName: campaign.campaignName,
          targetPlatforms: campaign.targetPlatforms,
          destinationLabels: campaign.destinationLabels,
          contentReference: campaign.contentReference,
          productNames: ws.products.filter((p) => campaign.productIds.includes(p.id)).map((p) => p.productName),
          proposedStartDate: campaign.startDate || undefined,
        },
      },
    });
  }, [ws.products, navigate]);

  return (
    <div className="space-y-5">
      {/* Compact backend notice */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <p className="flex-1 text-[11px] text-slate-500">
          Nexapa Affiliate uses local browser data. Product sync, verified tracking links, and platform access require Nexapa API.
        </p>
        <button type="button" onClick={() => navigate("/settings")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <SettingsIcon className="h-3 w-3" /> Settings
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5" role="tablist" aria-label="Affiliate workspace views">
          {AFFILIATE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={ws.activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              onClick={() => ws.setActiveTab(tab.key)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all",
                ws.activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-slate-400">
            {ws.activeTab === "products" ? `${ws.filteredProducts.length} products` : ws.activeTab === "campaigns" ? `${ws.filteredCampaigns.length} campaigns` : ""}
          </span>
        </div>
      </div>

      {/* Products Panel */}
      {ws.activeTab === "products" && (
        <div id="panel-products" role="tabpanel" aria-labelledby="tab-products" className="space-y-4">
          <AffiliateToolbar
            search={ws.productSearch}
            onSearchChange={ws.setProductSearch}
            sourceFilter={ws.sourceFilter}
            onSourceFilterChange={ws.setSourceFilter}
            statusFilter={ws.statusFilter}
            onStatusFilterChange={ws.setStatusFilter}
            affiliateFilter={ws.affiliateFilter}
            onAffiliateFilterChange={ws.setAffiliateFilter}
            sortKey={ws.sortKey}
            onSortKeyChange={ws.setSortKey}
            viewMode={ws.viewMode}
            onViewModeChange={ws.setViewMode}
            visibleCount={ws.filteredProducts.length}
            selectedCount={ws.selectedProductIds.size}
            hasActiveFilters={ws.hasActiveFilters}
            onClearFilters={ws.clearFilters}
          />

          <AffiliateProductList
            products={ws.filteredProducts}
            selectedIds={ws.selectedProductIds}
            viewMode={ws.viewMode}
            onToggleSelect={ws.toggleProductSelection}
            onOpenDetails={setDetailsProduct}
            onEdit={(p) => { setEditingProduct(p); setShowAddProductDialog(true); }}
            onCopyProductUrl={(url) => handleCopyUrl(url)}
            onCopyAffiliateUrl={(url) => handleCopyUrl(url)}
            onAddToCampaign={(p) => { ws.toggleProductSelection(p.id); ws.setActiveTab("campaigns"); }}
            onRemove={ws.removeProduct}
            hasActiveFilters={ws.hasActiveFilters}
            onClearFilters={ws.clearFilters}
          />
        </div>
      )}

      {/* Link Builder Panel */}
      {ws.activeTab === "link-builder" && (
        <div id="panel-link-builder" role="tabpanel" aria-labelledby="tab-link-builder" className="space-y-5">
          <AffiliateLinkBuilder
            products={ws.products}
            linkBuilder={ws.linkBuilder}
            onLinkBuilderChange={(patch) => ws.setLinkBuilder({ ...ws.linkBuilder, ...patch })}
            generatedLink={ws.generatedLink}
            onApplyLink={ws.applyLinkToProduct}
            onReset={ws.resetLinkBuilder}
            onOpenDetails={setDetailsProduct}
          />
          <AffiliateContentBinder
            products={ws.products}
            contentBinder={ws.contentBinder}
            onContentBinderChange={(patch) => ws.setContentBinder({ ...ws.contentBinder, ...patch })}
            onOpenPublisher={() => navigate("/publisher")}
            onPreparePublisherDraft={() => {
              ws.announce("Publisher draft handoff prepared. Navigate to Publisher to continue.");
              navigate("/publisher");
            }}
          />
        </div>
      )}

      {/* Campaigns Panel */}
      {ws.activeTab === "campaigns" && (
        <div id="panel-campaigns" role="tabpanel" aria-labelledby="tab-campaigns" className="space-y-4">
          <AffiliateCampaignList
            campaigns={ws.filteredCampaigns}
            products={ws.products}
            campaignSearch={ws.campaignSearch}
            onCampaignSearchChange={ws.setCampaignSearch}
            campaignPlatformFilter={ws.campaignPlatformFilter}
            onCampaignPlatformFilterChange={ws.setCampaignPlatformFilter}
            campaignStatusFilter={ws.campaignStatusFilter}
            onCampaignStatusFilterChange={ws.setCampaignStatusFilter}
            hasActiveCampaignFilters={ws.hasActiveCampaignFilters}
            onClearCampaignFilters={ws.clearCampaignFilters}
            onOpenDetails={setDetailsCampaign}
            onEdit={(c) => { setEditingCampaign(c); setShowCreateCampaign(true); }}
            onDuplicate={ws.duplicateCampaign}
            onOpenInPublisher={handleOpenPublisher}
            onPrepareSchedule={handlePrepareSchedule}
            onToggleInactive={(id) => {
              const c = ws.campaigns.find((ca) => ca.id === id);
              if (c && c.status === "inactive") ws.reactivateCampaign(id);
              else ws.markCampaignInactive(id);
            }}
            onRemove={ws.removeCampaign}
            onOpenCreateCampaign={() => { setEditingCampaign(null); setShowCreateCampaign(true); }}
            onLoadDemoCampaigns={ws.loadDemoCampaigns}
          />
        </div>
      )}

      <AffiliateValidationPanel items={ws.allValidation} visible={showValidation} />

      <AffiliateSelectionBar
        selectedCount={ws.selectedProductIds.size}
        onRemoveSelected={ws.removeSelectedProducts}
        onMarkInactive={ws.markSelectedInactive}
        onReactivate={ws.reactivateSelected}
        onCopyProductUrls={ws.copySelectedProductUrls}
        onCopyAffiliateUrls={ws.copySelectedAffiliateUrls}
        onClearSelection={ws.clearSelection}
      />

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => { setShowAddProductDialog(true); setEditingProduct(null); }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Product
        </button>
        <button
          type="button"
          onClick={() => { setShowCreateCampaign(true); setEditingCampaign(null); }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <CalendarClock className="h-3.5 w-3.5" /> Create Campaign
        </button>
        <button
          type="button"
          onClick={() => setShowValidation(!showValidation)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {showValidation ? "Hide Validation" : "Validate"}
        </button>
        {!ws.showDemoBadge ? (
          <button type="button" onClick={ws.loadDemoProducts} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Load Demo
          </button>
        ) : (
          <button type="button" onClick={ws.clearDemo} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition-colors">
            Clear Demo
          </button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={() => navigate("/accounts")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition-colors">
          <Link2 className="h-3 w-3" /> Accounts
        </button>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">{ws.feedback}</div>

      <AffiliateProductDialog
        open={showAddProductDialog}
        onClose={() => { setShowAddProductDialog(false); setEditingProduct(null); }}
        onSave={ws.addProduct}
        onBatchImport={ws.addBatchProducts}
        editProduct={editingProduct}
        onUpdate={ws.updateProduct}
      />

      {detailsProduct && (
        <ProductDetailsDialog
          product={detailsProduct}
          onClose={() => setDetailsProduct(null)}
          onEdit={(p) => { setEditingProduct(p); setShowAddProductDialog(true); setDetailsProduct(null); }}
          onCopyProductUrl={(url) => handleCopyUrl(url)}
          onCopyAffiliateUrl={(url) => handleCopyUrl(url)}
          onAddToCampaign={(p) => { ws.toggleProductSelection(p.id); setDetailsProduct(null); ws.setActiveTab("campaigns"); }}
          onToggleInactive={(id) => { ws.updateProduct(id, { status: ws.products.find((p) => p.id === id)?.status === "inactive" ? "backend-required" : "inactive" }); }}
          onRemove={(id) => { ws.removeProduct(id); setDetailsProduct(null); }}
        />
      )}

      <AffiliateCampaignDialog
        open={showCreateCampaign}
        onClose={() => { setShowCreateCampaign(false); setEditingCampaign(null); }}
        onSave={ws.addCampaign}
        products={ws.products}
        editCampaign={editingCampaign}
        onUpdate={ws.updateCampaign}
      />

      {detailsCampaign && (
        <CampaignDetailsDialog
          campaign={detailsCampaign}
          products={ws.products}
          onClose={() => setDetailsCampaign(null)}
          onEdit={(c) => { setEditingCampaign(c); setShowCreateCampaign(true); setDetailsCampaign(null); }}
          onDuplicate={(id) => { ws.duplicateCampaign(id); setDetailsCampaign(null); }}
          onOpenInPublisher={(c) => { handleOpenPublisher(c); setDetailsCampaign(null); }}
          onPrepareSchedule={(c) => { handlePrepareSchedule(c); setDetailsCampaign(null); }}
          onToggleInactive={(id) => { if (detailsCampaign.status === "inactive") ws.reactivateCampaign(id); else ws.markCampaignInactive(id); setDetailsCampaign(null); }}
          onRemove={(id) => { ws.removeCampaign(id); setDetailsCampaign(null); }}
        />
      )}
    </div>
  );
}

type CampaignDetailsDialogProps = {
  campaign: AffiliateCampaign;
  products: AffiliateProduct[];
  onClose: () => void;
  onEdit: (campaign: AffiliateCampaign) => void;
  onDuplicate: (id: string) => void;
  onOpenInPublisher: (campaign: AffiliateCampaign) => void;
  onPrepareSchedule: (campaign: AffiliateCampaign) => void;
  onToggleInactive: (id: string) => void;
  onRemove: (id: string) => void;
};

function CampaignDetailsDialog({ campaign, products, onClose, onEdit, onDuplicate, onOpenInPublisher, onPrepareSchedule, onToggleInactive, onRemove }: CampaignDetailsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => { window.setTimeout(() => prevFocusRef.current?.focus(), 0); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const campaignProducts = products.filter((p) => campaign.productIds.includes(p.id));
  const productsWithLinks = campaignProducts.filter((p) => p.affiliateUrl.trim()).length;
  const isActive = campaign.status !== "inactive";

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} tabIndex={-1} className="ml-auto h-full w-full max-w-[520px] overflow-hidden bg-white shadow-2xl drawer-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-[15px] font-semibold text-slate-900">{campaign.campaignName}</h2>
            {campaign.description && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{campaign.description}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <InfoRow label="Products" value={`${campaignProducts.length} product(s) — ${productsWithLinks} with affiliate links`} />
            <InfoRow label="Target platforms" value={campaign.targetPlatforms.length > 0 ? campaign.targetPlatforms.join(", ") : "Not set"} />
            {campaign.destinationLabels.length > 0 && <InfoRow label="Destinations" value={campaign.destinationLabels.join(", ")} />}
            {campaign.contentReference && <InfoRow label="Content reference" value={campaign.contentReference} />}
            {(campaign.startDate || campaign.endDate) && <InfoRow label="Date range" value={`${campaign.startDate || "\u2014"} to ${campaign.endDate || "\u2014"}`} />}
            <InfoRow label="Disclosure" value={campaign.disclosureText || "Not set"} />
            {campaign.callToAction && <InfoRow label="Call-to-action" value={campaign.callToAction} />}
            <InfoRow label="Status" value={getCampaignStatusLabel(campaign.status)} />
            <InfoRow label="Created" value={formatAffiliateDate(campaign.createdAt)} />
            <InfoRow label="Updated" value={formatAffiliateDate(campaign.updatedAt)} />
            {campaign.notes && <InfoRow label="Notes" value={campaign.notes} />}
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500 ring-1 ring-slate-100">
            Campaign readiness reflects local frontend fields only. Backend connection and platform authorization are still required.
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-5 py-3 shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 transition-colors">Close</button>
          <div className="flex-1" />
          <button type="button" onClick={() => { onEdit(campaign); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Edit3 className="h-3 w-3" aria-hidden="true" /> Edit
          </button>
          <button type="button" onClick={() => { onDuplicate(campaign.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Copy className="h-3 w-3" aria-hidden="true" /> Dup
          </button>
          <button type="button" onClick={() => { onOpenInPublisher(campaign); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            Publisher
          </button>
          <button type="button" onClick={() => { onPrepareSchedule(campaign); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Clock className="h-3 w-3" aria-hidden="true" /> Schedule
          </button>
          <button type="button" onClick={() => { onToggleInactive(campaign.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            {isActive ? "Inactive" : "Reactivate"}
          </button>
          <button type="button" onClick={() => { onRemove(campaign.id); onClose(); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-100 transition-colors">
            <Trash2 className="h-3 w-3" aria-hidden="true" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <p className="mt-0.5 text-[12px] text-slate-700">{value}</p>
    </div>
  );
}

import { useEffect, useRef, useId } from "react";
import { X, Edit3, Copy, Clock, Trash2 } from "lucide-react";
import { getCampaignStatusLabel, formatAffiliateDate } from "../affiliate.utils";
