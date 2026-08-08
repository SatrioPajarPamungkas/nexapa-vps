import { Search, X } from "lucide-react";
import type { AccountFilter, AccountSort, AccountPlatform, AccountConnectionStatus } from "../connected-accounts.types";

type Props = {
  filter: AccountFilter;
  sort: AccountSort;
  resultCount: number;
  totalCount: number;
  onSearch: (v: string) => void;
  onPlatform: (p: AccountFilter["platform"]) => void;
  onStatus: (s: AccountFilter["status"]) => void;
  onDefault: (d: AccountFilter["defaultFilter"]) => void;
  onSort: (s: AccountSort) => void;
  onClear: () => void;
};

export function AccountFilters({
  filter,
  sort,
  resultCount,
  totalCount,
  onSearch,
  onPlatform,
  onStatus,
  onDefault,
  onSort,
  onClear,
}: Props) {
  const hasActive =
    filter.search.trim() !== "" ||
    filter.platform !== "all" ||
    filter.status !== "all" ||
    filter.defaultFilter !== "all";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
            <label htmlFor="acct-search" className="sr-only">
              Search accounts
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="acct-search"
              type="search"
              value={filter.search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by label or identifier…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-[12px] text-slate-500">
            {resultCount} / {totalCount} visible
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="f-platform" className="text-[12px] font-medium text-slate-700">
              Platform
            </label>
            <select
              id="f-platform"
              value={filter.platform}
              onChange={(e) => onPlatform(e.target.value as AccountPlatform | "all")}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="shopee">Shopee</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="f-status" className="text-[12px] font-medium text-slate-700">
              Status
            </label>
            <select
              id="f-status"
              value={filter.status}
              onChange={(e) => onStatus(e.target.value as AccountConnectionStatus | "all")}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All statuses</option>
              <option value="draft">Local draft</option>
              <option value="backend-required">Backend required</option>
              <option value="authorization-required">Authorization required</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="f-default" className="text-[12px] font-medium text-slate-700">
              Default
            </label>
            <select
              id="f-default"
              value={filter.defaultFilter}
              onChange={(e) => onDefault(e.target.value as AccountFilter["defaultFilter"])}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All</option>
              <option value="default">Default only</option>
              <option value="non-default">Non-default</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="f-sort" className="text-[12px] font-medium text-slate-700">
              Sort
            </label>
            <select
              id="f-sort"
              value={sort}
              onChange={(e) => onSort(e.target.value as AccountSort)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="recent-updated">Recently updated</option>
              <option value="recent-created">Recently created</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="platform">Platform</option>
            </select>
          </div>

          {hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
