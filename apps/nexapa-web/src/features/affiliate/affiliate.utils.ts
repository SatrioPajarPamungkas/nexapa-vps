import type {
  AffiliateProduct,
  AffiliateCampaign,
  ProductSortKey,
  ProductAffiliateFilter,
  AffiliateSource,
  AffiliateValidationItem,
  LinkBuilderTracking,
} from "./affiliate.types";
import {
  SOURCE_LABELS,
  PRODUCT_STATUS_LABELS,
  CAMPAIGN_STATUS_LABELS,
} from "./affiliate.constants";

let idSeq = 0;

export function generateAffiliateId(prefix = "aff"): string {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSeq.toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

export function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url.trim());
    u.searchParams.sort();
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function getSourceLabel(source: AffiliateSource): string {
  return SOURCE_LABELS[source] ?? source;
}

export function getProductStatusLabel(status: AffiliateProduct["status"]): string {
  return PRODUCT_STATUS_LABELS[status] ?? status;
}

export function getCampaignStatusLabel(status: AffiliateCampaign["status"]): string {
  return CAMPAIGN_STATUS_LABELS[status] ?? status;
}

export function sortProducts(products: AffiliateProduct[], sortKey: ProductSortKey): AffiliateProduct[] {
  const sorted = [...products];
  switch (sortKey) {
    case "recently-updated":
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    case "recently-added":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case "name-az":
      return sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    case "name-za":
      return sorted.sort((a, b) => b.productName.localeCompare(a.productName));
    case "source":
      return sorted.sort((a, b) => a.source.localeCompare(b.source));
    case "seller":
      return sorted.sort((a, b) => a.sellerName.localeCompare(b.sellerName));
    default:
      return sorted;
  }
}

export function filterProducts(
  products: AffiliateProduct[],
  search: string,
  sourceFilter: AffiliateSource | "all",
  statusFilter: string,
  affiliateFilter: ProductAffiliateFilter,
): AffiliateProduct[] {
  let list = [...products];
  const term = search.trim().toLowerCase();
  if (term) {
    list = list.filter(
      (p) =>
        p.productName.toLowerCase().includes(term) ||
        p.sellerName.toLowerCase().includes(term) ||
        p.productId.toLowerCase().includes(term) ||
        p.productUrl.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term)),
    );
  }
  if (sourceFilter !== "all") {
    list = list.filter((p) => p.source === sourceFilter);
  }
  if (statusFilter !== "all") {
    list = list.filter((p) => p.status === statusFilter);
  }
  if (affiliateFilter === "has-link") {
    list = list.filter((p) => !!p.affiliateUrl.trim());
  } else if (affiliateFilter === "missing-link") {
    list = list.filter((p) => !p.affiliateUrl.trim());
  }
  return list;
}

export function filterCampaigns(
  campaigns: AffiliateCampaign[],
  search: string,
  platformFilter: string,
  statusFilter: string,
): AffiliateCampaign[] {
  let list = [...campaigns];
  const term = search.trim().toLowerCase();
  if (term) {
    list = list.filter(
      (c) =>
        c.campaignName.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.notes.toLowerCase().includes(term),
    );
  }
  if (platformFilter !== "all") {
    list = list.filter((c) => c.targetPlatforms.includes(platformFilter));
  }
  if (statusFilter !== "all") {
    list = list.filter((c) => c.status === statusFilter);
  }
  return list;
}

export function deriveProductStatus(product: AffiliateProduct): AffiliateProduct["status"] {
  if (product.status === "inactive") return "inactive";
  if (!product.affiliateUrl.trim()) return "link-required";
  if (!product.source || !product.productName.trim()) return "validation-required";
  return "backend-required";
}

export function deriveCampaignStatus(
  campaign: AffiliateCampaign,
  products: AffiliateProduct[],
): AffiliateCampaign["status"] {
  if (campaign.status === "inactive") return "inactive";
  if (campaign.productIds.length === 0) return "missing-product";
  const campaignProducts = products.filter((p) => campaign.productIds.includes(p.id));
  const hasMissingLinks = campaignProducts.some((p) => !p.affiliateUrl.trim());
  if (hasMissingLinks) return "missing-link";
  if (!campaign.campaignName.trim()) return "local-draft";
  return "ready-locally";
}

export function buildTrackingUrl(
  baseUrl: string,
  tracking: LinkBuilderTracking,
): string {
  if (!isValidHttpUrl(baseUrl)) return "";
  try {
    const url = new URL(baseUrl.trim());
    const params: Record<string, string> = {};
    if (tracking.source.trim()) params.utm_source = tracking.source.trim();
    if (tracking.medium.trim()) params.utm_medium = tracking.medium.trim();
    if (tracking.campaign.trim()) params.utm_campaign = tracking.campaign.trim();
    if (tracking.content.trim()) params.utm_content = tracking.content.trim();
    if (tracking.term.trim()) params.utm_term = tracking.term.trim();
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    return "";
  }
}

export function validateProduct(product: AffiliateProduct): AffiliateValidationItem[] {
  const items: AffiliateValidationItem[] = [];
  const push = (id: string, severity: AffiliateValidationItem["severity"], label: string, message: string) => {
    items.push({ id, category: "product", severity, label, message });
  };

  if (!product.source) push(`prod-src-${product.id}`, "action-required", "Product source", "Select an affiliate source.");
  if (!product.productName.trim()) push(`prod-name-${product.id}`, "action-required", "Product name", "Product name is required.");
  if (!isValidHttpUrl(product.productUrl)) push(`prod-url-${product.id}`, "action-required", "Product URL", "Provide a valid HTTP or HTTPS product URL.");
  if (!product.affiliateUrl.trim()) {
    push(`prod-aff-${product.id}`, "warning", "Affiliate link", "No affiliate tracking URL set. Add one in Link Builder or edit the product.");
  } else if (!isValidHttpUrl(product.affiliateUrl)) {
    push(`prod-aff-invalid-${product.id}`, "action-required", "Affiliate URL format", "Affiliate URL must be a valid HTTP or HTTPS URL.");
  }
  push(`prod-backend-${product.id}`, "backend-required", "Backend verification", "Product data has not been verified against any platform API.");

  return items;
}

export function validateCampaign(campaign: AffiliateCampaign, products: AffiliateProduct[]): AffiliateValidationItem[] {
  const items: AffiliateValidationItem[] = [];
  const push = (id: string, severity: AffiliateValidationItem["severity"], label: string, message: string) => {
    items.push({ id, category: "campaign", severity, label, message });
  };

  if (!campaign.campaignName.trim()) push(`camp-name-${campaign.id}`, "action-required", "Campaign name", "Campaign name is required.");
  if (campaign.campaignName.length > 120) push(`camp-name-len-${campaign.id}`, "action-required", "Campaign name length", "Campaign name must be 120 characters or fewer.");
  if (campaign.productIds.length === 0) push(`camp-prod-${campaign.id}`, "action-required", "Products selected", "Add at least one product to the campaign.");
  if (campaign.targetPlatforms.length === 0) push(`camp-plat-${campaign.id}`, "warning", "Target platforms", "Select at least one target platform.");

  const campaignProducts = products.filter((p) => campaign.productIds.includes(p.id));
  const missingLinks = campaignProducts.filter((p) => !p.affiliateUrl.trim());
  if (missingLinks.length > 0) {
    push(`camp-links-${campaign.id}`, "warning", "Missing affiliate links", `${missingLinks.length} product(s) lack affiliate tracking links.`);
  }

  if (!campaign.disclosureText.trim()) push(`camp-disc-${campaign.id}`, "warning", "Disclosure text", "Add affiliate disclosure text.");

  if (campaign.startDate && campaign.endDate && campaign.endDate < campaign.startDate) {
    push(`camp-dates-${campaign.id}`, "action-required", "Date range", "End date cannot be before start date.");
  }

  push(`camp-backend-${campaign.id}`, "backend-required", "Backend required", "Campaign activation requires Nexapa API and platform authorization.");

  return items;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

export function formatAffiliateDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
