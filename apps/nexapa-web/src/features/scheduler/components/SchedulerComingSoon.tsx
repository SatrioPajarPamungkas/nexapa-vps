import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  platform: "youtube" | "shopee";
};

export function SchedulerComingSoon({ open, onClose, platform }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 text-white shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <h2 className="text-[15px] font-semibold text-white">
            {platform === "youtube" ? "YouTube Schedule" : "Shopee Schedule"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 backdrop-blur-xl transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-xl">
            <span className="text-3xl">{platform === "youtube" ? "▶️" : "🛍️"}</span>
          </div>
          <h3 className="text-[16px] font-semibold text-white">Coming Soon</h3>
          <p className="mt-2 text-[13px] text-white/60">
            {platform === "youtube"
              ? "YouTube scheduling is not yet available. The adapter is not configured."
              : "Shopee scheduling is not yet available. The adapter is not configured."
            }
          </p>
        </div>

        <div className="border-t border-white/10 bg-white/5 px-5 py-3 text-center backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/12 px-4 py-1.5 text-[12px] font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
