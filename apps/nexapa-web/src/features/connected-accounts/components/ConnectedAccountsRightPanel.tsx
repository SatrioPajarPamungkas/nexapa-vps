import { useConnectedAccounts } from "../hooks/useConnectedAccounts";
import { ConnectionHealthPanel } from "./ConnectionHealthPanel";
import { AccountsAttentionList } from "./AccountsAttentionList";
import { RecentActivityPanel } from "./RecentActivityPanel";

export function ConnectedAccountsRightPanel() {
  const hook = useConnectedAccounts();

  return (
    <aside className="sticky top-6 space-y-4 bg-transparent lg:max-w-[320px]">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
        <h3 className="mb-3 text-[13px] font-semibold text-slate-900">Quick Connect</h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => hook.handleConnectPlatform("tiktok")}
            className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Connect TikTok
          </button>
        </div>
      </div>
      <ConnectionHealthPanel />
      <AccountsAttentionList
        accounts={hook.accounts}
        onRefresh={hook.handleRefresh}
        actionLoading={{ refreshingId: hook.loading.refreshingId }}
      />
      <RecentActivityPanel />
    </aside>
  );
}