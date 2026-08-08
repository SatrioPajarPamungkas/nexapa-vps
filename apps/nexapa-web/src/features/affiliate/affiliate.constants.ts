import type { AffiliateSource, AffiliateProductStatus, AffiliateCampaignStatus, ProductSortKey, AffiliateTab } from "./affiliate.types";

export const AFFILIATE_SOURCES: AffiliateSource[] = [
  "tiktok-shop",
  "shopee",
  "facebook",
  "instagram",
  "generic",
];

export const SOURCE_LABELS: Record<AffiliateSource, string> = {
  "tiktok-shop": "TikTok Shop",
  shopee: "Shopee",
  facebook: "Facebook",
  instagram: "Instagram",
  generic: "Generic",
};

export const PRODUCT_STATUS_LABELS: Record<AffiliateProductStatus, string> = {
  "local-draft": "Local draft",
  "link-required": "Link required",
  "validation-required": "Needs review",
  "backend-required": "Backend required",
  inactive: "Inactive",
};

export const CAMPAIGN_STATUS_LABELS: Record<AffiliateCampaignStatus, string> = {
  "local-draft": "Local draft",
  "missing-product": "Missing product",
  "missing-link": "Missing link",
  "backend-required": "Backend required",
  "ready-locally": "Ready locally",
  inactive: "Inactive",
};

export const CAMPAIGN_PLATFORMS = ["TikTok", "Facebook", "Instagram", "YouTube"] as const;

export const SORT_OPTIONS: Array<{ key: ProductSortKey; label: string }> = [
  { key: "recently-updated", label: "Recently updated" },
  { key: "recently-added", label: "Recently added" },
  { key: "name-az", label: "Name A\u2013Z" },
  { key: "name-za", label: "Name Z\u2013A" },
  { key: "source", label: "Source" },
  { key: "seller", label: "Seller/store" },
];

export const AFFILIATE_TABS: Array<{ key: AffiliateTab; label: string }> = [
  { key: "products", label: "Products" },
  { key: "link-builder", label: "Link Builder" },
  { key: "campaigns", label: "Campaigns" },
];

export const MAX_PRODUCTS = 200;
export const MAX_CAMPAIGNS = 50;
export const MAX_PRODUCT_NAME = 160;
export const MAX_SELLER_NAME = 120;
export const MAX_PRODUCT_ID = 120;
export const MAX_CAMPAIGN_NAME = 120;
export const MAX_CAMPAIGN_DESCRIPTION = 500;
export const MAX_CAMPAIGN_NOTES = 500;
export const MAX_PRODUCT_NOTES = 500;

export const DEFAULT_DISCLOSURE = "This content may contain affiliate links.";

export const DEMO_PRODUCTS: Array<{
  source: AffiliateSource;
  productName: string;
  sellerName: string;
  productUrl: string;
  affiliateUrl: string;
  category: string;
  priceText: string;
  commissionText: string;
}> = [
  {
    source: "tiktok-shop",
    productName: "Creator Camera Stand",
    sellerName: "Demo Store Alpha",
    productUrl: "https://example.com/products/camera-stand",
    affiliateUrl: "https://example.com/products/camera-stand?ref=nexapa",
    category: "Photography",
    priceText: "USD 29.99",
    commissionText: "8%",
  },
  {
    source: "shopee",
    productName: "Wireless Clip Microphone",
    sellerName: "Demo Audio Shop",
    productUrl: "https://example.com/products/clip-mic",
    affiliateUrl: "https://example.com/products/clip-mic?aff=nexapa",
    category: "Audio",
    priceText: "IDR 189,000",
    commissionText: "5%",
  },
  {
    source: "facebook",
    productName: "Compact Product Light",
    sellerName: "Demo Lighting Co",
    productUrl: "https://example.com/products/product-light",
    affiliateUrl: "",
    category: "Lighting",
    priceText: "USD 45.00",
    commissionText: "10%",
  },
  {
    source: "instagram",
    productName: "Desktop Tripod Mount",
    sellerName: "Demo Gear Store",
    productUrl: "https://example.com/products/tripod-mount",
    affiliateUrl: "",
    category: "Accessories",
    priceText: "USD 15.50",
    commissionText: "12%",
  },
  {
    source: "generic",
    productName: "Creator Ring Light Pro",
    sellerName: "Generic Seller",
    productUrl: "https://example.com/products/ring-light",
    affiliateUrl: "https://example.com/products/ring-light?tag=nexapa",
    category: "Lighting",
    priceText: "USD 34.99",
    commissionText: "7%",
  },
  {
    source: "tiktok-shop",
    productName: "Portable Green Screen",
    sellerName: "Demo Studio Supplies",
    productUrl: "https://example.com/products/green-screen",
    affiliateUrl: "https://example.com/products/green-screen?ref=nexapa",
    category: "Studio",
    priceText: "USD 52.00",
    commissionText: "6%",
  },
];

export const DEMO_CAMPAIGNS: Array<{
  campaignName: string;
  description: string;
  productIndexes: number[];
  targetPlatforms: string[];
  disclosureText: string;
  callToAction: string;
}> = [
  {
    campaignName: "Product Showcase Campaign",
    description: "Demo campaign featuring photography and audio products across TikTok and Instagram.",
    productIndexes: [0, 1],
    targetPlatforms: ["TikTok", "Instagram"],
    disclosureText: DEFAULT_DISCLOSURE,
    callToAction: "Shop now",
  },
  {
    campaignName: "Lighting Bundle Promotion",
    description: "Demo campaign combining lighting products for Facebook content.",
    productIndexes: [2, 4],
    targetPlatforms: ["Facebook"],
    disclosureText: DEFAULT_DISCLOSURE,
    callToAction: "Learn more",
  },
];
