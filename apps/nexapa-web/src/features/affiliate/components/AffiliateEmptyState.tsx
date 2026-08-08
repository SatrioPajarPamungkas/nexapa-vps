import { ShoppingBag, Plus, Beaker } from "lucide-react";

type Props = {
  type: "products" | "campaigns" | "link-builder";
  onAdd?: () => void;
  onLoadDemo?: () => void;
};

export function AffiliateEmptyState({ type, onAdd, onLoadDemo }: Props) {
  if (type === "products") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center sm:p-10">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <ShoppingBag className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold text-slate-900">No affiliate products</h3>
        <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-600">
          Add product references or load clearly labelled demo products to prepare affiliate workflows.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Product
            </button>
          )}
          {onLoadDemo && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Beaker className="h-4 w-4" aria-hidden="true" /> Load Demo Products
            </button>
          )}
        </div>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-slate-400">
          Frontend shell only — no backend request performed
        </p>
      </div>
    );
  }

  if (type === "campaigns") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center sm:p-10">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <ShoppingBag className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold text-slate-900">No affiliate campaigns</h3>
        <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-600">
          Create a local campaign draft by combining products, content references, and target platforms.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Create Campaign
            </button>
          )}
          {onLoadDemo && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Beaker className="h-4 w-4" aria-hidden="true" /> Load Demo Campaigns
            </button>
          )}
        </div>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-slate-400">
          Frontend shell only — no backend request performed
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center sm:p-10">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <ShoppingBag className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-slate-900">Choose a product or paste a product URL</h3>
      <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-6 text-slate-600">
        Prepare a local tracking-link draft without contacting an affiliate platform.
      </p>
      <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-slate-400">
        Frontend shell only — no backend request performed
      </p>
    </div>
  );
}
