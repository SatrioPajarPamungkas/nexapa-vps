import { useConnectedAccounts } from "../hooks/useConnectedAccounts";
import { ConnectedAccountCard } from "./ConnectedAccountCard";

export function AccountsAttentionPanel() {
  const hook = useConnectedAccounts();
  const attentionAccounts = hook.accounts.filter((a) => a.status !== "connected").slice(0, 3);

  return (
    <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-medium text-slate-900">Accounts Requiring Attention</h3>
      {attentionAccounts.length === 0 ? (
        <p className="text-xs text-slate-600">All connected accounts are healthy</p>
      ) : (
        <div className="grid gap-3">
          {attentionAccounts.map((account) => (
            <ConnectedAccountCard
              key={account.id}
              account={account}
              onRefresh={hook.handleRefresh}
              onSetDefault={hook.handleSetDefault}
              onRemove={hook.requestRemove}
              actionLoading={hook.loading.refreshingId === account.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
