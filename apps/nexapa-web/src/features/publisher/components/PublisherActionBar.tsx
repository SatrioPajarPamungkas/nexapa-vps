import { Rocket, Save } from "lucide-react";
import type { FacebookPostType, PublisherPlatform } from "../publisher.types";

type Props = {
  activePlatform: PublisherPlatform;
  facebookPostType?: FacebookPostType;
  isValid: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  onTikTokDraft?: () => void;
  onSaveDraft?: () => void;
};

const facebookLabels: Record<FacebookPostType, string> = {
  text: "Publish Text to Facebook",
  image: "Publish Image to Facebook",
  video: "Publish Video to Facebook",
};

export function PublisherActionBar({ activePlatform, facebookPostType = "text", isValid, isPublishing, onPublish, onTikTokDraft, onSaveDraft }: Props) {
  const unavailable = activePlatform === "youtube" || activePlatform === "shopee";
  const label = activePlatform === "facebook"
    ? facebookLabels[facebookPostType]
    : activePlatform === "tiktok"
      ? "Publish to TikTok"
      : "Coming Soon";

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.16)] backdrop-blur-2xl ring-1 ring-white/10">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onSaveDraft && (
          <button type="button" onClick={onSaveDraft} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/12 px-3 text-[12px] font-medium text-slate-700 backdrop-blur-xl hover:bg-white/20">
            <Save className="h-3.5 w-3.5" /> Save Nexapa Draft
          </button>
        )}
        {activePlatform === "tiktok" && onTikTokDraft && (
          <button type="button" disabled={!isValid || isPublishing} onClick={onTikTokDraft} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[12px] font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> TikTok Draft
          </button>
        )}
        <button type="button" disabled={!isValid || isPublishing || unavailable} onClick={onPublish} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
          <Rocket className="h-3.5 w-3.5" /> {isPublishing ? "Publishing..." : label}
        </button>
      </div>
    </div>
  );
}
