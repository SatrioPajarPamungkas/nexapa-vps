import { Plus } from "lucide-react";
import type { ConnectedAccount, AccountPlatform } from "../connected-accounts.types";
import { ConnectedAccountCard } from "./ConnectedAccountCard";
import { PLATFORM_CONNECT_LABEL } from "../connected-accounts.constants";

type Props = {
  platform: AccountPlatform;
  accounts: ConnectedAccount[];
  onConnect: () => void;
  onRefresh: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  actionLoading?: string | null;
  emptyTitle: string;
  emptyDescription: string;
};

export function PlatformSection({
  platform,
  accounts,
  onConnect,
  onRefresh,
  onSetDefault,
  onRemove,
  actionLoading,
  emptyTitle,
  emptyDescription,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {platform === "tiktok" ? "TikTok Accounts" : "Facebook Pages"}
          </h2>
          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {accounts.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 text-[12px] font-medium text-white shadow-sm transition hover:from-blue-700 hover:to-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {PLATFORM_CONNECT_LABEL[platform]}
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
          <h3 className="text-[14px] font-semibold text-slate-900">{emptyTitle}</h3>
          <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((account) => (
            <ConnectedAccountCard
              key={account.id}
              account={account}
              onRefresh={onRefresh}
              onSetDefault={onSetDefault}
              onRemove={onRemove}
              actionLoading={actionLoading === account.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}