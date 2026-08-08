export type AffiliateSource = "tiktok-shop" | "shopee" | "facebook" | "instagram" | "generic";

export type AffiliateProductStatus =
  | "local-draft"
  | "link-required"
  | "validation-required"
  | "backend-required"
  | "inactive";

export type AffiliateProduct = {
  id: string;
  source: AffiliateSource;
  productName: string;
  sellerName: string;
  productUrl: string;
  affiliateUrl: string;
  productId: string;
  category: string;
  priceText: string;
  commissionText: string;
  imageUrl: string;
  notes: string;
  tags: string[];
  status: AffiliateProductStatus;
  createdAt: number;
  updatedAt: number;
  selected: boolean;
  isDemo: boolean;
};

export type AffiliateCampaignStatus =
  | "local-draft"
  | "missing-product"
  | "missing-link"
  | "backend-required"
  | "ready-locally"
  | "inactive";

export type AffiliateCampaign = {
  id: string;
  campaignName: string;
  description: string;
  productIds: string[];
  targetPlatforms: string[];
  destinationLabels: string[];
  contentReference: string;
  startDate: string;
  endDate: string;
  disclosureText: string;
  callToAction: string;
  status: AffiliateCampaignStatus;
  createdAt: number;
  updatedAt: number;
  notes: string;
  isDemo: boolean;
};

export type ProductViewMode = "grid" | "list";

export type ProductSortKey =
  | "recently-updated"
  | "recently-added"
  | "name-az"
  | "name-za"
  | "source"
  | "seller";

export type ProductAffiliateFilter = "all" | "has-link" | "missing-link";

export type AffiliateTab = "products" | "link-builder" | "campaigns";

export type AffiliateValidationSeverity = "action-required" | "warning" | "backend-required" | "complete-locally";

export type AffiliateValidationItem = {
  id: string;
  category: "product" | "campaign" | "link";
  severity: AffiliateValidationSeverity;
  label: string;
  message: string;
};

export type LinkBuilderTracking = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

export type LinkBuilderState = {
  selectedProductId: string;
  manualUrl: string;
  source: AffiliateSource;
  campaignName: string;
  contentReference: string;
  accountReference: string;
  customLabel: string;
  tracking: LinkBuilderTracking;
};

export type ContentBinderState = {
  productId: string;
  contentTitle: string;
  mediaReference: string;
  publisherDraftReference: string;
  targetPlatforms: string[];
  destinationLabels: string[];
  disclosureNote: string;
  callToAction: string;
  landingLink: string;
};
