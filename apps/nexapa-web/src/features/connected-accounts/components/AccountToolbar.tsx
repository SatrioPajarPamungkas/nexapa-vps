import { Search, X, LayoutGrid, List } from "lucide-react";
import type { AccountFilter, AccountSort, AccountPlatform, AccountConnectionStatus, AccountViewMode, AccountCapability } from "../connected-accounts.types";
import { cn } from "@/lib/cn";

type Props = {
  filter: AccountFilter;
  sort: AccountSort;
  view: AccountViewMode;
  resultCount: number;
  totalCount: number;
  selectedCount: number;
  onSearch: (v: string) => void;
  onPlatform: (p: AccountFilter["platform"]) => void;
  onStatus: (s: AccountFilter["status"]) => void;
  onDefault: (d: AccountFilter["defaultFilter"]) => void;
  onCapability: (c: AccountFilter["capability"]) => void;
  onSort: (s: AccountSort) => void;
  onView: (v: AccountViewMode) => void;
  onClear: () => void;
};

export function AccountToolbar({
  filter,
  sort,
  view,
  resultCount,
  totalCount,
  selectedCount,
  onSearch,
  onPlatform,
  onStatus,
  onDefault,
  onCapability,
  onSort,
  onView,
  onClear,
}: Props) {
  const hasActive =
    filter.search.trim() !== "" ||
    filter.platform !== "all" ||
    filter.status !== "all" ||
    filter.defaultFilter !== "all" ||
    filter.capability !== "all";

  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-xl">
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
              placeholder="Search by label, identifier, notes..."
              className="h-9 w-full rounded-xl border border-white/20 bg-white/12 pl-9 pr-3 text-[13px] text-slate-900 backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-500/15 px-2.5 py-1 text-[11px] font-medium text-blue-800 backdrop-blur-xl">
                {selectedCount} selected
              </span>
            )}
            <span className="text-[11px] text-slate-500">
              {resultCount} of {totalCount}
            </span>
            <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/8 p-0.5 backdrop-blur-xl">
              <button
                type="button"
                aria-label="Card view"
                aria-pressed={view === "cards"}
                onClick={() => onView("cards")}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  view === "cards" ? "bg-white/18 text-slate-900 shadow-sm border border-white/20" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => onView("list")}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  view === "list" ? "bg-white/18 text-slate-900 shadow-sm border border-white/20" : "text-slate-500 hover:text-slate-700",
                )}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="f-platform" className="text-[11px] font-medium text-slate-600">
              Platform
            </label>
            <select
              id="f-platform"
              value={filter.platform}
              onChange={(e) => onPlatform(e.target.value as AccountPlatform | "all")}
              className="h-8 rounded-lg border border-white/20 bg-white/12 px-2 text-[12px] text-slate-700 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="shopee">Shopee</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="f-status" className="text-[11px] font-medium text-slate-600">
              Status
            </label>
            <select
              id="f-status"
              value={filter.status}
              onChange={(e) => onStatus(e.target.value as AccountConnectionStatus | "all")}
              className="h-8 rounded-lg border border-white/20 bg-white/12 px-2 text-[12px] text-slate-700 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All statuses</option>
              <option value="local-draft">Local Draft</option>
              <option value="authorization-required">Authorization Required</option>
              <option value="backend-required">Backend Required</option>
              <option value="needs-reconnect">Needs Reconnect</option>
              <option value="session-expired">Session Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="f-default" className="text-[11px] font-medium text-slate-600">
              Default
            </label>
            <select
              id="f-default"
              value={filter.defaultFilter}
              onChange={(e) => onDefault(e.target.value as AccountFilter["defaultFilter"])}
              className="h-8 rounded-lg border border-white/20 bg-white/12 px-2 text-[12px] text-slate-700 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All</option>
              <option value="default">Default</option>
              <option value="non-default">Non-default</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="f-capability" className="text-[11px] font-medium text-slate-600">
              Capability
            </label>
            <select
              id="f-capability"
              value={filter.capability}
              onChange={(e) => onCapability(e.target.value as AccountCapability | "all")}
              className="h-8 rounded-lg border border-white/20 bg-white/12 px-2 text-[12px] text-slate-700 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All</option>
              <option value="publishing">Publishing</option>
              <option value="scheduling">Scheduling</option>
              <option value="affiliate">Affiliate</option>
              <option value="media-access">Media Access</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="f-sort" className="text-[11px] font-medium text-slate-600">
              Sort
            </label>
            <select
              id="f-sort"
              value={sort}
              onChange={(e) => onSort(e.target.value as AccountSort)}
              className="h-8 rounded-lg border border-white/20 bg-white/12 px-2 text-[12px] text-slate-700 backdrop-blur-xl focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="recent-updated">Updated</option>
              <option value="recent-created">Created</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="platform">Platform</option>
              <option value="status">Status</option>
            </select>
          </div>

          {hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-xl transition hover:bg-white/20"
            >
              <X className="h-3 w-3" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
