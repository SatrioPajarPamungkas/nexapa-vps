import { X, Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Platform = "facebook" | "tiktok" | "youtube" | "shopee";

type PlatformChooserModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectPlatform: (platform: Platform) => void;
  action: "publish_now" | "schedule";
  selectedCount: number;
};

const platforms: Array<{
  id: Platform;
  name: string;
  logo: string;
  enabled: boolean;
  label?: string;
}> = [
  {
    id: "facebook",
    name: "Facebook",
    logo: "https://www.facebook.com/images/fb_icon_325x325.png",
    enabled: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    logo: "https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png",
    enabled: false,
    label: "Coming Soon",
  },
  {
    id: "youtube",
    name: "YouTube",
    logo: "https://www.youtube.com/s/desktop/2e32e125/img/favicon_48x48.png",
    enabled: false,
    label: "Coming Soon",
  },
  {
    id: "shopee",
    name: "Shopee",
    logo: "https://cf.shopee.co.id/file/11940894c9e93f8e7a2b2e3e2e3e2e3e3e",
    enabled: false,
    label: "Coming Soon",
  },
];

export function PlatformChooserModal({
  open,
  onClose,
  onSelectPlatform,
  action,
  selectedCount,
}: PlatformChooserModalProps) {
  const handlePlatformSelect = (platform: Platform) => {
    const platformData = platforms.find((p) => p.id === platform);
    if (!platformData?.enabled) return;

    onSelectPlatform(platform);
  };

  if (!open) return null;

  const isPublishNow = action === "publish_now";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-2xl shadow-[0_25px_80px_rgba(2,6,23,0.40)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
            <div>
              <h2 className="text-[16px] font-semibold text-white">
                {isPublishNow ? "Publish Now" : "Schedule Posts"}
              </h2>
              <p className="mt-0.5 text-[11px] text-white/50">
                {selectedCount} video{selectedCount !== 1 ? "s" : ""} • Choose platform
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/60 transition hover:bg-white/15 hover:text-white/80"
              aria-label="Close dialog"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="space-y-2">
              {platforms.map((platform) => {
                const canSelect = platform.enabled && (!isPublishNow || selectedCount === 1);

                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformSelect(platform.id)}
                    disabled={!canSelect}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 transition",
                      canSelect
                        ? "border-white/10 bg-white/10 text-white hover:bg-white/15 hover:border-white/15"
                        : "border-white/5 bg-white/[0.04] cursor-not-allowed opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur-sm">
                        <img
                          src={platform.logo}
                          alt={platform.name}
                          className="h-6 w-6 object-contain rounded-full"
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-[13px] font-medium text-white">
                          {platform.name}
                        </p>
                        {!canSelect && !platform.label && isPublishNow && selectedCount > 1 && (
                          <p className="text-[10px] text-white/40">
                            Publish Now requires exactly 1 video
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {platform.label && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
                          {platform.label}
                        </span>
                      )}
                      {canSelect && (
                        <Check className="h-5 w-5 text-white/30" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.03] px-5 py-3">
            <p className="text-center text-[11px] text-white/45">
              {isPublishNow
                ? "Publish Now is only available for single video uploads"
                : "Schedule supports 1-50 videos"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
