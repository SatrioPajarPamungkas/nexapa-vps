import { X, ExternalLink } from "lucide-react";
import type { AccountPlatform } from "../connected-accounts.types";
import { PLATFORM_CONNECT_LABEL } from "../connected-accounts.constants";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (platform: AccountPlatform) => void;
};

export function ConnectAccountDialog({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop - per spec bg-slate-950/45 backdrop-blur-sm */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog - per spec bg-slate-950/78 blur-2xl */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-950/78 p-5 shadow-[0_25px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="connect-dialog-title" className="text-[16px] font-semibold text-white">
              Connect Account
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-white/60">
              Select a platform to connect. You will be redirected to complete authorization.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/70 backdrop-blur-xl transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={() => onSelect("tiktok")}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-left backdrop-blur-xl transition hover:bg-white/12 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/20 text-white backdrop-blur-xl">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">TikTok</p>
                <p className="text-[11px] text-white/60">Creator or Business account</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
              {PLATFORM_CONNECT_LABEL.tiktok}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("facebook")}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-left backdrop-blur-xl transition hover:bg-white/12 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-blue-500/20 text-white backdrop-blur-xl">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">Facebook</p>
                <p className="text-[11px] text-white/60">Facebook Page for publishing</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
              {PLATFORM_CONNECT_LABEL.facebook}
            </span>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-[11px] leading-4 text-white/60 backdrop-blur-xl">
          <p className="font-medium text-white/80">Secure connection:</p>
          <ul className="mt-1.5 space-y-1 text-[10px] leading-4">
            <li>• OAuth authorization flow (no password stored)</li>
            <li>• Secure browser session when required</li>
            <li>• You control which accounts/pages to connect</li>
          </ul>
        </div>
      </div>
    </>
  );
}