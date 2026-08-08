import { useConnectedAccounts } from "../hooks/useConnectedAccounts";
import { Link } from "react-router-dom";

type Props = {
  configRequired?: boolean;
};

export function ConnectionHealthPanel({ configRequired = false }: Props) {
  const hook = useConnectedAccounts();
  const total = hook.accounts.length;
  const connected = hook.accounts.filter((a) => a.status === "connected").length;
  const attention = hook.accounts.filter((a) =>
    a.status === "expired" || a.status === "error" || a.status === "disconnected"
  ).length;
  const activePlatforms = new Set(
    hook.accounts.filter((a) => a.status === "connected").map((a) => a.platform)
  ).size;

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <h3 className="mb-3 text-[13px] font-semibold text-slate-900">Connection Health</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/15 bg-white/8 p-3 backdrop-blur-xl">
          <div className="text-[10px] font-medium text-slate-500">Total accounts</div>
          <div className="mt-1 text-[18px] font-bold text-slate-900">{total}</div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 backdrop-blur-xl">
          <div className="text-[10px] font-medium text-emerald-700">Connected</div>
          <div className="mt-1 text-[18px] font-bold text-emerald-800">{connected}</div>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 backdrop-blur-xl">
          <div className="text-[10px] font-medium text-amber-700">Requires attention</div>
          <div className="mt-1 text-[18px] font-bold text-amber-800">{attention}</div>
        </div>
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 backdrop-blur-xl">
          <div className="text-[10px] font-medium text-blue-700">Active platforms</div>
          <div className="mt-1 text-[18px] font-bold text-blue-800">{activePlatforms}</div>
        </div>
      </div>
      {configRequired && (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5 backdrop-blur-xl">
          <p className="text-[11px] font-medium text-amber-800">OAuth configuration required</p>
          <Link to="/settings" className="mt-1 inline-block text-[11px] font-semibold text-amber-700 underline transition hover:text-amber-800">
            Open Settings
          </Link>
        </div>
      )}
    </div>
  );
}