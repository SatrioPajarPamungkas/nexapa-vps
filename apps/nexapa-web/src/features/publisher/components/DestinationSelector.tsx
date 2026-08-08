import { ExternalLink, RefreshCcw, Search, UsersRound } from "lucide-react";
import type { DestinationAccount, PublisherPlatform } from "../publisher.types";
import { DestinationAccountCard } from "./DestinationAccountCard";

type Props = {
  accounts: DestinationAccount[];
  selectedIds: Set<string>;
  search: string;
  activePlatform: PublisherPlatform;
  onSearch: (value: string) => void;
  onToggle: (id: string) => void;
  onOpenConnectedAccounts: () => void;
  onRefresh?: () => void;
  refreshLoading?: boolean;
};

export function DestinationSelector({ accounts, selectedIds, search, activePlatform, onSearch, onToggle, onOpenConnectedAccounts, onRefresh, refreshLoading }: Props) {
  const filtered = accounts.filter((account) => `${account.label} ${account.identifier}`.toLowerCase().includes(search.trim().toLowerCase()));
  const isFacebook = activePlatform === "facebook";
  const title = isFacebook ? "Facebook Pages" : "TikTok Accounts";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2 text-right text-[10px]">
            <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-slate-600 backdrop-blur-xl">{accounts.length} available</span>
            <span className="rounded-full border border-blue-400/25 bg-blue-500/12 px-2 py-0.5 font-medium text-blue-800">{selectedIds.size} selected</span>
            {accounts.length === 0 && onRefresh && (
              <button type="button" onClick={onRefresh} disabled={refreshLoading} className="ml-1 inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/12 px-2 py-1 text-[10px] font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-50">
                <RefreshCcw className={`h-3 w-3 ${refreshLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-3 bg-transparent p-4 sm:p-5">
        {accounts.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="h-9 w-full rounded-xl border border-white/20 bg-white/12 pl-8 pr-3 text-[12px] backdrop-blur-xl placeholder:text-slate-500 focus:border-blue-400/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20" />
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/8 p-6 text-center backdrop-blur-xl">
            <p className="text-[13px] font-medium text-slate-800">{isFacebook ? "No Facebook Pages available" : "No TikTok accounts available"}</p>
            <p className="mt-1 text-[11px] text-slate-600">{isFacebook ? "Connect or refresh to load Facebook Pages." : "Connect a TikTok account before publishing."}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {onRefresh ? (
                <button type="button" onClick={onRefresh} disabled={refreshLoading} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <RefreshCcw className={`h-3.5 w-3.5 ${refreshLoading ? "animate-spin" : ""}`} />
                  {refreshLoading ? "Refreshing..." : "Refresh Facebook Pages"}
                </button>
              ) : (
                <button type="button" onClick={onOpenConnectedAccounts} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Connected Accounts
                </button>
              )}
              <button type="button" onClick={onOpenConnectedAccounts} className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/12 px-3 py-1.5 text-[12px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/20">
                <ExternalLink className="h-3.5 w-3.5" /> Manage Accounts
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 bg-transparent">
            {filtered.map((account) => <DestinationAccountCard key={account.id} account={account} selected={selectedIds.has(account.id)} onToggle={onToggle} singleSelect={isFacebook} />)}
          </div>
        )}
      </div>
    </section>
  );
}
