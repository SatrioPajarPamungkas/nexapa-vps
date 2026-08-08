import { useConnectedAccounts } from "../hooks/useConnectedAccounts";
import { PlatformLogo } from "./PlatformLogo";

export function QuickConnectPanel() {
  const hook = useConnectedAccounts();
  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    hook.openConnectDialog();
  };
  return (
    <section className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-medium text-slate-900">Quick Connect</h3>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handle}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <PlatformLogo platform="tiktok" className="h-4 w-4" /> Connect TikTok
        </button>
        <button
          type="button"
          onClick={handle}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <PlatformLogo platform="facebook" className="h-4 w-4" /> Connect Facebook
        </button>
      </div>
    </section>
  );
}
