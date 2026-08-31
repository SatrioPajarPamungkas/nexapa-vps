import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Link2,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

type ProductStatus = "eligible" | "unavailable";

type ShopeeAffiliateProduct = {
  itemId: string;
  shopId: string;
  name: string;
  url: string;
  imageUrl: string;
  shopName: string;
  price: string;
  commission: string;
  status: ProductStatus;
};

const previewProducts: ShopeeAffiliateProduct[] = [
  {
    itemId: "preview-1001",
    shopId: "preview-shop-1",
    name: "Sample Affiliate Product",
    url: "https://shopee.co.id/",
    imageUrl: "",
    shopName: "Shopee Partner Store",
    price: "Rp49.900",
    commission: "8%",
    status: "eligible",
  },
  {
    itemId: "preview-1002",
    shopId: "preview-shop-2",
    name: "Sample Creator Product",
    url: "https://shopee.co.id/",
    imageUrl: "",
    shopName: "Official Store Preview",
    price: "Rp79.000",
    commission: "10%",
    status: "eligible",
  },
];

export function ShopeeProductsPage() {
  const [products, setProducts] =
    useState<ShopeeAffiliateProduct[]>(previewProducts);
  const [query, setQuery] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.shopName,
        product.itemId,
        product.shopId,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [products, query]);

  const handlePreviewSync = () => {
    setSyncing(true);
    setMessage("");

    window.setTimeout(() => {
      setProducts(previewProducts);
      setSyncing(false);
      setMessage(
        "Preview catalog loaded. Live products will replace this data after Shopee API approval.",
      );
    }, 700);
  };

  const handleResolveUrl = () => {
    const value = productUrl.trim();

    if (!value) {
      setMessage("Paste a Shopee product URL first.");
      return;
    }

    if (
      !/^https:\/\/(?:[^/]+\.)?shopee\.(?:co\.id|com)\//i.test(value) &&
      !/^https:\/\/s\.shopee\.(?:co\.id|com)\//i.test(value)
    ) {
      setMessage("Use a valid Shopee product URL.");
      return;
    }

    setMessage(
      "URL resolver is ready. Product metadata will be retrieved automatically after API approval.",
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <h2 className="text-[14px] font-semibold text-amber-950">
                Shopee API approval pending
              </h2>

              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-amber-900/75">
                Products, prices, images, shops, eligibility, and commission
                will be synchronized automatically from Shopee. Preview data
                is shown only to validate the interface.
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-amber-400/30 bg-white/20 px-3 py-1 text-[9px] font-semibold text-amber-900">
            PREVIEW MODE
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-card backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">
              Affiliate product catalog
            </h2>

            <p className="mt-1 text-[11px] text-slate-600">
              Select eligible products from the connected Shopee affiliate account.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePreviewSync}
            disabled={syncing}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
          >
            {syncing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            {syncing ? "Synchronizing..." : "Sync from Shopee"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_430px]">
          <label className="relative block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, shop, or Shopee ID..."
              className="h-10 w-full rounded-xl border border-white/20 bg-white/15 pl-9 pr-4 text-[12px] text-slate-900 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
            />
          </label>

          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Link2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                value={productUrl}
                onChange={(event) => setProductUrl(event.target.value)}
                placeholder="Paste Shopee product URL..."
                className="h-10 w-full rounded-xl border border-white/20 bg-white/15 pl-9 pr-3 text-[12px] text-slate-900 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
              />
            </label>

            <button
              type="button"
              onClick={handleResolveUrl}
              className="h-10 shrink-0 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 text-[10px] font-semibold text-orange-800 transition hover:bg-orange-400/20"
            >
              Find
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] text-slate-600">
            {message}
          </p>
        )}
      </section>

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-slate-600">
          {filtered.length} products
        </p>

        <span className="rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-[9px] font-semibold text-orange-800">
          SHOPEE SYNC
        </span>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={`${product.shopId}:${product.itemId}`}
              product={product}
            />
          ))}
        </div>
      ) : (
        <EmptyState hasQuery={Boolean(query.trim())} />
      )}
    </div>
  );
}

function ProductCard({
  product,
}: {
  product: ShopeeAffiliateProduct;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-card backdrop-blur-xl">
      <div className="flex h-44 items-center justify-center bg-white/10">
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-8 w-8 text-slate-300" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[13px] font-semibold text-slate-900">
              {product.name}
            </h3>

            <p className="mt-1 truncate text-[10px] text-slate-500">
              {product.shopName}
            </p>
          </div>

          <Package className="h-5 w-5 shrink-0 text-orange-500" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[9px] text-slate-500">
            Item {product.itemId}
          </span>

          {product.status === "eligible" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Eligible
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/15 bg-white/10 p-2.5">
            <p className="text-[9px] uppercase text-slate-500">Price</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-slate-800">
              {product.price}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-2.5">
            <p className="text-[9px] uppercase text-slate-500">Commission</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-emerald-700">
              {product.commission}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={product.status !== "eligible"}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Select product
          </button>

          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${product.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/15 text-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 py-16 text-center shadow-card backdrop-blur-xl">
      <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />

      <h3 className="mt-4 text-[13px] font-semibold text-slate-800">
        {hasQuery ? "No matching products" : "No Shopee products synchronized"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-slate-500">
        {hasQuery
          ? "Try another product or shop keyword."
          : "Connect Shopee and synchronize eligible affiliate products after API access is approved."}
      </p>
    </div>
  );
}
