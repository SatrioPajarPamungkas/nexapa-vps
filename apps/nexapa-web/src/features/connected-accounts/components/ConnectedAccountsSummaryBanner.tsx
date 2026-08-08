import { useConnectedAccounts } from "../hooks/useConnectedAccounts";

export function ConnectedAccountsSummaryBanner() {
  const hook = useConnectedAccounts();
  const total = hook.accounts.length;
  const attention = hook.accounts.filter((a) =>
    a.status === "expired" || a.status === "error" || a.status === "disconnected"
  ).length;
  const activePlatforms = new Set(
    hook.accounts.filter((a) => a.status === "connected").map((a) => a.platform)
  ).size;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-[22px] shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-white/5 to-transparent" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[520px]">
          <h2 className="text-[16px] font-semibold text-slate-900">
            Manage all publishing accounts
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-slate-600">
            Connect and manage social accounts for publishing, scheduling, and automation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5 text-[11px] font-medium">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-slate-700 backdrop-blur-xl">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-700" />
              <span>Total connected: <span className="font-semibold">{total}</span></span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-slate-700 backdrop-blur-xl">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>Active platforms: <span className="font-semibold">{activePlatforms}</span></span>
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-xl ${
              attention > 0
                ? "border-amber-400/25 bg-amber-400/12 text-amber-800"
                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-800"
            }`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${attention > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span>Requires attention: <span className="font-semibold">{attention}</span></span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 md:mt-0">
          <button
            type="button"
            onClick={() => hook.handleConnectPlatform("tiktok")}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
          >
            Connect TikTok
          </button>
        </div>
      </div>
    </section>
  );
}