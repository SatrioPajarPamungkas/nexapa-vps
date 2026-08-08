import { useConnectedAccounts } from "../hooks/useConnectedAccounts";
import { Link } from "react-router-dom";

export function ConnectionOverviewPanel() {
  const hook = useConnectedAccounts();
  const total = hook.accounts.length;
  const connected = hook.accounts.filter((a) => a.status === "connected").length;
  const attention = hook.accounts.filter((a) => a.status !== "connected").length;
  const activePlatforms = Object.values(hook.counts).filter((c) => typeof c === "number" && c > 0).length - 1; // exclude defaults

  const configReady = true; // placeholder, actual check depends on settings

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-medium text-slate-900">Connection Overview</h3>
      <ul className="space-y-1 text-sm text-slate-600">
        <li>Total accounts: {total}</li>
        <li>Connected: {connected}</li>
        <li>Requires attention: {attention}</li>
        <li>Active platforms: {activePlatforms}</li>
      </ul>
      {!configReady && (
        <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          OAuth configuration required – <Link to="/settings" className="underline">Open Settings</Link>
        </div>
      )}
    </section>
  );
}
