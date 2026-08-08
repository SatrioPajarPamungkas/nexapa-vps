import { RefreshCw } from "lucide-react";
import { PlatformLogo } from "./PlatformLogo";
import { getInitials } from "../connected-accounts.utils";
import { STATUS_LABEL } from "../connected-accounts.types";
import type { ConnectedAccount } from "../connected-accounts.types";

type Props = {
  accounts: ConnectedAccount[];
  onRefresh: (accountId: string) => void;
  actionLoading: {
    refreshingId: string | null;
  };
};

export function AccountsAttentionList({ accounts, onRefresh, actionLoading }: Props) {
  const attentionAccounts = accounts
    .filter((a) => a.status === "expired" || a.status === "error" || a.status === "disconnected")
    .slice(0, 5);

  if (attentionAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
        <h3 className="mb-3 text-[13px] font-semibold text-slate-900">Requires Attention</h3>
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 py-6 backdrop-blur-xl">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/15">
            <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[11px] font-medium text-emerald-800">All connected accounts are healthy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <h3 className="mb-3 text-[13px] font-semibold text-slate-900">Requires Attention</h3>
      <div className="space-y-2">
        {attentionAccounts.map((account) => {
          const isRefreshing = actionLoading.refreshingId === account.id;
          return (
            <div key={account.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/8 p-2.5 backdrop-blur-xl transition hover:bg-white/12">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/20 text-[9px] font-semibold text-slate-700 backdrop-blur-xl">
                  {account.avatar_url ? (
                    <img src={account.avatar_url} alt={account.display_name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    getInitials(account.display_name)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-slate-900">{account.display_name}</div>
                  <div className="flex items-center gap-1.5">
                    <PlatformLogo platform={account.platform} className="h-3.5 w-3.5" />
                    <span className="rounded-full border border-red-400/20 bg-red-400/10 px-1.5 py-0.5 text-[9px] font-medium text-red-800">{STATUS_LABEL[account.status]}</span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => onRefresh(account.id)} disabled={isRefreshing} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-500 backdrop-blur-xl transition hover:bg-white/18 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Refresh account">
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}