import type { ConnectedAccount } from "../connected-accounts.types";
import { ConnectedAccountCard } from "./ConnectedAccountCard";

type Props = {
  accounts: ConnectedAccount[];
  view: "cards" | "list";
  onRefresh: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ConnectedAccountList({ accounts, view, onRefresh, onSetDefault, onRemove }: Props) {
  if (accounts.length === 0) return null;

  if (view === "list") {
    // List view not implemented for backend accounts - use table instead
    return (
      <div className="text-[12px] text-slate-500">
        List view not available for connected accounts. Use table view.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((a) => (
        <ConnectedAccountCard
          key={a.id}
          account={a}
          onRefresh={onRefresh}
          onSetDefault={onSetDefault}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
