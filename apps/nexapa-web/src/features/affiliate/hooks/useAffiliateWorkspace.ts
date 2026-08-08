import { useCallback, useMemo, useState } from "react";
import type {
  AffiliateProduct,
  AffiliateCampaign,
  AffiliateSource,
  AffiliateTab,
  ProductViewMode,
  ProductSortKey,
  ProductAffiliateFilter,
  LinkBuilderState,
  ContentBinderState,
  AffiliateValidationItem,
} from "../affiliate.types";
import {
  MAX_PRODUCTS,
  MAX_CAMPAIGNS,
  DEFAULT_DISCLOSURE,
  DEMO_PRODUCTS,
  DEMO_CAMPAIGNS,
} from "../affiliate.constants";
import {
  generateAffiliateId,
  isValidHttpUrl,
  normalizeUrlForDedup,
  filterProducts,
  filterCampaigns,
  sortProducts,
  deriveProductStatus,
  deriveCampaignStatus,
  buildTrackingUrl,
  validateProduct,
  validateCampaign,
  copyToClipboard,
} from "../affiliate.utils";

function defaultLinkBuilder(): LinkBuilderState {
  return {
    selectedProductId: "",
    manualUrl: "",
    source: "generic",
    campaignName: "",
    contentReference: "",
    accountReference: "",
    customLabel: "",
    tracking: { source: "", medium: "", campaign: "", content: "", term: "" },
  };
}

function defaultContentBinder(): ContentBinderState {
  return {
    productId: "",
    contentTitle: "",
    mediaReference: "",
    publisherDraftReference: "",
    targetPlatforms: [],
    destinationLabels: [],
    disclosureNote: DEFAULT_DISCLOSURE,
    callToAction: "",
    landingLink: "",
  };
}

export function useAffiliateWorkspace() {
  const [activeTab, setActiveTab] = useState<AffiliateTab>("products");
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<AffiliateSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<ProductAffiliateFilter>("all");
  const [sortKey, setSortKey] = useState<ProductSortKey>("recently-updated");
  const [viewMode, setViewMode] = useState<ProductViewMode>("grid");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignPlatformFilter, setCampaignPlatformFilter] = useState("all");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [linkBuilder, setLinkBuilder] = useState<LinkBuilderState>(defaultLinkBuilder());
  const [contentBinder, setContentBinder] = useState<ContentBinderState>(defaultContentBinder());
  const [feedback, setFeedback] = useState("");
  const [showDemoBadge, setShowDemoBadge] = useState(false);

  const announce = useCallback((msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(""), 3500);
  }, []);

  const filteredProducts = useMemo(
    () => sortProducts(filterProducts(products, productSearch, sourceFilter, statusFilter, affiliateFilter), sortKey),
    [products, productSearch, sourceFilter, statusFilter, affiliateFilter, sortKey],
  );

  const filteredCampaigns = useMemo(
    () => filterCampaigns(campaigns, campaignSearch, campaignPlatformFilter, campaignStatusFilter),
    [campaigns, campaignSearch, campaignPlatformFilter, campaignStatusFilter],
  );

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.has(p.id)),
    [products, selectedProductIds],
  );

  const productValidation = useMemo(() => {
    const items: AffiliateValidationItem[] = [];
    for (const p of products) {
      items.push(...validateProduct(p));
    }
    return items;
  }, [products]);

  const campaignValidation = useMemo(() => {
    const items: AffiliateValidationItem[] = [];
    for (const c of campaigns) {
      items.push(...validateCampaign(c, products));
    }
    return items;
  }, [campaigns, products]);

  const allValidation = useMemo(() => [...productValidation, ...campaignValidation], [productValidation, campaignValidation]);

  const hasActiveFilters = !!(productSearch || sourceFilter !== "all" || statusFilter !== "all" || affiliateFilter !== "all");
  const hasActiveCampaignFilters = !!(campaignSearch || campaignPlatformFilter !== "all" || campaignStatusFilter !== "all");

  const clearFilters = useCallback(() => {
    setProductSearch("");
    setSourceFilter("all");
    setStatusFilter("all");
    setAffiliateFilter("all");
  }, []);

  const clearCampaignFilters = useCallback(() => {
    setCampaignSearch("");
    setCampaignPlatformFilter("all");
    setCampaignStatusFilter("all");
  }, []);

  const toggleProductSelection = useCallback((id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((ids: string[]) => {
    setSelectedProductIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProductIds(new Set());
  }, []);

  const addProduct = useCallback(
    (data: Omit<AffiliateProduct, "id" | "createdAt" | "updatedAt" | "selected" | "isDemo" | "status">) => {
      if (products.length >= MAX_PRODUCTS) {
        announce(`Maximum ${MAX_PRODUCTS} local products reached.`);
        return false;
      }
      const sourceKey = data.source;
      const duplicate = products.some(
        (p) => p.source === sourceKey && normalizeUrlForDedup(p.productUrl) === normalizeUrlForDedup(data.productUrl),
      );
      if (duplicate) {
        announce("A product with the same source and URL already exists.");
        return false;
      }
      const now = Date.now();
      const product: AffiliateProduct = {
        ...data,
        id: generateAffiliateId("prod"),
        status: deriveProductStatus({ ...data, status: "local-draft" } as AffiliateProduct),
        createdAt: now,
        updatedAt: now,
        selected: false,
        isDemo: false,
      };
      setProducts((prev) => [...prev, product]);
      announce("Product draft added locally. No platform synchronization or link verification was performed.");
      return true;
    },
    [products, announce],
  );

  const addBatchProducts = useCallback(
    (source: AffiliateSource, urls: string[]) => {
      if (products.length >= MAX_PRODUCTS) {
        announce(`Maximum ${MAX_PRODUCTS} products reached. No products added.`);
        return { added: 0, skippedDuplicate: 0, skippedMalformed: 0, skippedFull: 0 };
      }
      let added = 0;
      let skippedDuplicate = 0;
      let skippedMalformed = 0;
      const remaining = MAX_PRODUCTS - products.length;
      const existingUrls = new Set(products.map((p) => normalizeUrlForDedup(p.productUrl)));
      const now = Date.now();
      const newProducts: AffiliateProduct[] = [];
      let draftCount = 0;

      for (const rawUrl of urls) {
        const url = rawUrl.trim();
        if (!isValidHttpUrl(url)) {
          skippedMalformed++;
          continue;
        }
        const norm = normalizeUrlForDedup(url);
        if (existingUrls.has(norm)) {
          skippedDuplicate++;
          continue;
        }
        if (added >= remaining) {
          continue;
        }
        draftCount++;
        existingUrls.add(norm);
        newProducts.push({
          id: generateAffiliateId("prod"),
          source,
          productName: `Product Draft ${draftCount}`,
          sellerName: "",
          productUrl: url,
          affiliateUrl: "",
          productId: "",
          category: "",
          priceText: "",
          commissionText: "",
          imageUrl: "",
          notes: "",
          tags: [],
          status: "link-required",
          createdAt: now,
          updatedAt: now,
          selected: false,
          isDemo: false,
        });
        added++;
      }

      if (newProducts.length > 0) {
        setProducts((prev) => [...prev, ...newProducts]);
      }
      const skippedFull = urls.length - added - skippedDuplicate - skippedMalformed;
      const parts = [`${added} added`];
      if (skippedDuplicate) parts.push(`${skippedDuplicate} duplicate(s) skipped`);
      if (skippedMalformed) parts.push(`${skippedMalformed} malformed URL(s) skipped`);
      if (skippedFull > 0) parts.push(`${skippedFull} skipped — max capacity`);
      announce(`Batch import: ${parts.join(", ")}. Product metadata has not been retrieved.`);
      return { added, skippedDuplicate, skippedMalformed, skippedFull };
    },
    [products, announce],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<AffiliateProduct>) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const updated = { ...p, ...patch, updatedAt: Date.now() };
          updated.status = deriveProductStatus(updated);
          return updated;
        }),
      );
      announce("Changes affect only the current browser session.");
    },
    [announce],
  );

  const removeProduct = useCallback(
    (id: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setCampaigns((prev) =>
        prev.map((c) => ({
          ...c,
          productIds: c.productIds.filter((pid) => pid !== id),
          updatedAt: Date.now(),
        })),
      );
      announce("Product removed from local workspace.");
    },
    [announce],
  );

  const removeSelectedProducts = useCallback(() => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;
    setProducts((prev) => prev.filter((p) => !selectedProductIds.has(p.id)));
    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        productIds: c.productIds.filter((pid) => !selectedProductIds.has(pid)),
        updatedAt: Date.now(),
      })),
    );
    setSelectedProductIds(new Set());
    announce(`${ids.length} product(s) removed.`);
  }, [selectedProductIds, announce]);

  const markSelectedInactive = useCallback(() => {
    setProducts((prev) =>
      prev.map((p) => (selectedProductIds.has(p.id) ? { ...p, status: "inactive" as const, updatedAt: Date.now() } : p)),
    );
    announce(`${selectedProductIds.size} product(s) marked inactive.`);
  }, [selectedProductIds, announce]);

  const reactivateSelected = useCallback(() => {
    setProducts((prev) =>
      prev.map((p) => {
        if (!selectedProductIds.has(p.id) || p.status !== "inactive") return p;
        const updated = { ...p, status: deriveProductStatus({ ...p, status: "local-draft" }) as AffiliateProduct["status"], updatedAt: Date.now() };
        return updated;
      }),
    );
    announce(`${selectedProductIds.size} product(s) reactivated.`);
  }, [selectedProductIds, announce]);

  const copySelectedProductUrls = useCallback(async () => {
    const urls = selectedProducts.map((p) => p.productUrl).filter(Boolean);
    const ok = await copyToClipboard(urls.join("\n"));
    if (ok) announce(`${urls.length} product URL(s) copied.`);
    else announce("Clipboard access failed.");
  }, [selectedProducts, announce]);

  const copySelectedAffiliateUrls = useCallback(async () => {
    const urls = selectedProducts.filter((p) => p.affiliateUrl.trim()).map((p) => p.affiliateUrl);
    const skipped = selectedProducts.length - urls.length;
    const ok = await copyToClipboard(urls.join("\n"));
    if (ok) {
      let msg = `${urls.length} link(s) copied.`;
      if (skipped > 0) msg += ` ${skipped} product(s) skipped because no affiliate link is available.`;
      announce(msg);
    } else {
      announce("Clipboard access failed.");
    }
  }, [selectedProducts, announce]);

  // Link builder
  const generatedLink = useMemo(() => {
    const source = linkBuilder.selectedProductId ? products.find((p) => p.id === linkBuilder.selectedProductId) : null;
    const baseUrl = source ? source.affiliateUrl || source.productUrl : linkBuilder.manualUrl;
    return buildTrackingUrl(baseUrl, linkBuilder.tracking);
  }, [linkBuilder, products]);

  const applyLinkToProduct = useCallback(() => {
    if (!linkBuilder.selectedProductId || !generatedLink) {
      announce("Select a product and generate a valid link first.");
      return;
    }
    updateProduct(linkBuilder.selectedProductId, { affiliateUrl: generatedLink });
    announce("Affiliate link applied to product draft locally.");
  }, [linkBuilder.selectedProductId, generatedLink, updateProduct, announce]);

  const resetLinkBuilder = useCallback(() => {
    setLinkBuilder(defaultLinkBuilder());
  }, []);

  // Content binder
  const applyToPublisher = useCallback(() => {
    const product = contentBinder.productId ? products.find((p) => p.id === contentBinder.productId) : null;
    if (!product) {
      announce("Select a product to hand off to Publisher.");
      return;
    }
    return {
      productName: product.productName,
      affiliateUrl: product.affiliateUrl || product.productUrl,
      disclosureNote: contentBinder.disclosureNote,
      callToAction: contentBinder.callToAction,
      targetPlatforms: contentBinder.targetPlatforms,
      contentTitle: contentBinder.contentTitle,
    };
  }, [contentBinder, products, announce]);

  // Campaigns
  const addCampaign = useCallback(
    (data: Omit<AffiliateCampaign, "id" | "createdAt" | "updatedAt" | "status" | "isDemo">) => {
      if (campaigns.length >= MAX_CAMPAIGNS) {
        announce(`Maximum ${MAX_CAMPAIGNS} campaigns reached.`);
        return false;
      }
      const now = Date.now();
      const campaign: AffiliateCampaign = {
        ...data,
        id: generateAffiliateId("camp"),
        status: "local-draft",
        createdAt: now,
        updatedAt: now,
        isDemo: false,
      };
      campaign.status = deriveCampaignStatus(campaign, products);
      setCampaigns((prev) => [...prev, campaign]);
      announce("Campaign draft created locally. No affiliate or publishing platform was contacted.");
      return true;
    },
    [campaigns, products, announce],
  );

  const updateCampaign = useCallback(
    (id: string, patch: Partial<AffiliateCampaign>) => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const updated = { ...c, ...patch, updatedAt: Date.now() };
          updated.status = deriveCampaignStatus(updated, products);
          return updated;
        }),
      );
    },
    [products],
  );

  const duplicateCampaign = useCallback(
    (id: string) => {
      const source = campaigns.find((c) => c.id === id);
      if (!source) return;
      if (campaigns.length >= MAX_CAMPAIGNS) {
        announce(`Maximum ${MAX_CAMPAIGNS} campaigns reached.`);
        return;
      }
      const now = Date.now();
      const copy: AffiliateCampaign = {
        ...source,
        id: generateAffiliateId("camp"),
        campaignName: `${source.campaignName} Copy`,
        createdAt: now,
        updatedAt: now,
      };
      setCampaigns((prev) => [...prev, copy]);
      announce(`Campaign duplicated: ${copy.campaignName}`);
    },
    [campaigns, announce],
  );

  const removeCampaign = useCallback(
    (id: string) => {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      announce("Campaign removed.");
    },
    [announce],
  );

  const markCampaignInactive = useCallback(
    (id: string) => {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "inactive" as const, updatedAt: Date.now() } : c)),
      );
      announce("Campaign marked inactive.");
    },
    [announce],
  );

  const reactivateCampaign = useCallback(
    (id: string) => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.status !== "inactive") return c;
          const updated = { ...c, status: deriveCampaignStatus(c, products) };
          return { ...updated, updatedAt: Date.now() };
        }),
      );
      announce("Campaign reactivated.");
    },
    [products, announce],
  );

  const loadDemoProducts = useCallback(() => {
    if (showDemoBadge) return;
    const now = Date.now();
    const demos: AffiliateProduct[] = DEMO_PRODUCTS.map((d, i) => ({
      id: generateAffiliateId("demo"),
      source: d.source,
      productName: d.productName,
      sellerName: d.sellerName,
      productUrl: d.productUrl,
      affiliateUrl: d.affiliateUrl,
      productId: `DEMO-SKU-${(i + 1).toString().padStart(3, "0")}`,
      category: d.category,
      priceText: d.priceText,
      commissionText: d.commissionText,
      imageUrl: "",
      notes: "Demo product — not a real listing.",
      tags: ["demo"],
      status: "backend-required" as const,
      createdAt: now,
      updatedAt: now,
      selected: false,
      isDemo: true,
    }));
    setProducts((prev) => [...prev, ...demos]);
    setShowDemoBadge(true);
    announce("Demo products loaded. All items display DEMO. No real data is used.");
  }, [showDemoBadge, announce]);

  const loadDemoCampaigns = useCallback(() => {
    const demoProducts = products.filter((p) => p.isDemo);
    if (demoProducts.length === 0) {
      announce("Load demo products first before creating demo campaigns.");
      return;
    }
    const now = Date.now();
    const demos: AffiliateCampaign[] = DEMO_CAMPAIGNS.map((dc) => ({
      id: generateAffiliateId("dcamp"),
      campaignName: dc.campaignName,
      description: dc.description,
      productIds: dc.productIndexes.filter((i) => i < demoProducts.length).map((i) => demoProducts[i].id),
      targetPlatforms: [...dc.targetPlatforms],
      destinationLabels: [],
      contentReference: "",
      startDate: "",
      endDate: "",
      disclosureText: dc.disclosureText,
      callToAction: dc.callToAction,
      status: "ready-locally" as const,
      createdAt: now,
      updatedAt: now,
      notes: "Demo campaign — not a real campaign.",
      isDemo: true,
    }));
    setCampaigns((prev) => [...prev, ...demos]);
    announce("Demo campaigns loaded. All items display DEMO. No platforms were contacted.");
  }, [products, announce]);

  const clearDemo = useCallback(() => {
    setProducts((prev) => prev.filter((p) => !p.isDemo));
    setCampaigns((prev) => prev.filter((c) => !c.isDemo));
    setSelectedProductIds(new Set());
    setShowDemoBadge(false);
    announce("Demo data cleared.");
  }, [announce]);

  return {
    activeTab,
    setActiveTab,
    products,
    campaigns,
    filteredProducts,
    filteredCampaigns,
    selectedProductIds,
    selectedProducts,
    productSearch,
    setProductSearch,
    sourceFilter,
    setSourceFilter,
    statusFilter,
    setStatusFilter,
    affiliateFilter,
    setAffiliateFilter,
    sortKey,
    setSortKey,
    viewMode,
    setViewMode,
    campaignSearch,
    setCampaignSearch,
    campaignPlatformFilter,
    setCampaignPlatformFilter,
    campaignStatusFilter,
    setCampaignStatusFilter,
    hasActiveFilters,
    hasActiveCampaignFilters,
    clearFilters,
    clearCampaignFilters,
    toggleProductSelection,
    selectAllVisible,
    clearSelection,
    addProduct,
    addBatchProducts,
    updateProduct,
    removeProduct,
    removeSelectedProducts,
    markSelectedInactive,
    reactivateSelected,
    copySelectedProductUrls,
    copySelectedAffiliateUrls,
    linkBuilder,
    setLinkBuilder,
    generatedLink,
    applyLinkToProduct,
    resetLinkBuilder,
    contentBinder,
    setContentBinder,
    applyToPublisher,
    addCampaign,
    updateCampaign,
    duplicateCampaign,
    removeCampaign,
    markCampaignInactive,
    reactivateCampaign,
    loadDemoProducts,
    loadDemoCampaigns,
    clearDemo,
    showDemoBadge,
    productValidation,
    campaignValidation,
    allValidation,
    feedback,
    announce,
  };
}
